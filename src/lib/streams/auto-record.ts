import { useEffect } from "react";
import { create } from "zustand";
import { fileStamp, slugName } from "@/lib/streams/format";
import { usePult, useToasts } from "@/lib/streams/store";
import { resolveTwitchPlayback, type TwitchQuality } from "@/lib/streams/twitch";
import { currentTwitchCredential } from "@/lib/streams/twitch-auth";
import { grabTwitchStream, armSaveOnFinish, downloadStash, stashedRecording } from "@/lib/streams/twitch-grab";
import type { Session } from "@/lib/streams/types";

export type StreamJob = {
  sessionId: string;
  login: string;
  displayName: string;
  bytes: number;
  auto: boolean;
};

export const useStreamRecord = create<{
  job: StreamJob | null;
  tick: number;
  pendingKey: string;
  pendingName: string;
  pendingBytes: number;
}>(() => ({ job: null, tick: 0, pendingKey: "", pendingName: "", pendingBytes: 0 }));

const held = new Set<string>();
const announced = new Set<string>();
let ctrl: AbortController | null = null;
let starting = false;
let retryTimer = 0;
let notBefore = 0;

function retryLater(sessionId: string) {
  notBefore = Date.now() + 20000;
  window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => {
    notBefore = 0;
    useStreamRecord.setState((state) => ({ tick: state.tick + 1 }));
    const still = usePult.getState().sessions.find((item) => item.id === sessionId && item.endedAt === null);
    if (!still || held.has(sessionId) || useStreamRecord.getState().job || usePult.getState().settings.recordStream === false) {
      return;
    }
    void startStreamRecord(still, true);
  }, 20000);
}

async function playlistFor(login: string, quality: TwitchQuality): Promise<string | null> {
  const cred = await currentTwitchCredential();
  const result = await resolveTwitchPlayback({
    data: { login, quality, clientId: cred.clientId, token: cred.token },
  });
  return result.ok ? result.url : null;
}

export function stopStreamRecord(opts?: { download?: boolean; hold?: boolean }) {
  const job = useStreamRecord.getState().job;
  if (opts?.hold && job) held.add(job.sessionId);
  if (opts?.download) armSaveOnFinish();
  ctrl?.abort();
  ctrl = null;
  useStreamRecord.setState({ job: null });
}

export function savePendingRecording() {
  if (!downloadStash()) return false;
  useStreamRecord.setState({ pendingKey: "", pendingName: "", pendingBytes: 0 });
  useToasts.getState().push(["Файл записи скачивается"]);
  return true;
}

export async function startStreamRecord(
  session: Pick<Session, "id" | "key" | "displayName" | "startedAt">,
  auto: boolean,
  quality: TwitchQuality = "720",
): Promise<boolean> {
  if (ctrl || starting || useStreamRecord.getState().job) return false;
  const login = session.key.toLowerCase();
  if (!/^[a-z0-9_]{2,25}$/.test(login)) return false;
  starting = true;
  held.delete(session.id);
  const mine = new AbortController();
  ctrl = mine;
  try {
    const url = await playlistFor(login, quality);
    if (!url || mine.signal.aborted || ctrl !== mine) {
      if (auto && !mine.signal.aborted) retryLater(session.id);
      return false;
    }
    const job: StreamJob = {
      sessionId: session.id,
      login,
      displayName: session.displayName,
      bytes: 0,
      auto,
    };
    useStreamRecord.setState({ job });
    const filename = `pult-${slugName(session.displayName)}-${fileStamp(new Date(session.startedAt))}.ts`;
    if (auto) useToasts.getState().push([`Пишу поток «${session.displayName}». Файл скачается по кнопке «Остановить».`]);
    const outcome = await grabTwitchStream(url, filename, mine.signal, (bytes) => {
      if (ctrl !== mine) return;
      useStreamRecord.setState((state) => (state.job ? { job: { ...state.job, bytes } } : state));
    }, {
      picker: !auto,
      defer: true,
      stashKey: login,
      refresh: () => playlistFor(login, quality),
    });
    if (outcome === "cancel") {
      held.add(session.id);
      return false;
    }
    if (outcome === "saved") {
      useStreamRecord.setState({ pendingKey: "", pendingName: "", pendingBytes: 0 });
      useToasts.getState().push([`Файл «${session.displayName}» скачивается`]);
    } else if (outcome === "stashed") {
      const stash = stashedRecording();
      useStreamRecord.setState({
        pendingKey: login,
        pendingName: session.displayName,
        pendingBytes: stash?.bytes || 0,
      });
      useToasts.getState().push([`Запись «${session.displayName}» остановлена. Нажмите «Скачать запись».`]);
    }
    return outcome === "saved" || outcome === "stashed";
  } catch {
    if (!mine.signal.aborted) {
      useToasts.getState().push([`Не удалось писать поток «${session.displayName}». Повторю чуть позже.`]);
      if (auto) retryLater(session.id);
    }
    return false;
  } finally {
    if (ctrl === mine) ctrl = null;
    if (useStreamRecord.getState().job?.sessionId === session.id) useStreamRecord.setState({ job: null });
    starting = false;
  }
}

export function useAutoStreamRecord() {
  const sessions = usePult((state) => state.sessions);
  const recordStream = usePult((state) => state.settings.recordStream !== false);
  const job = useStreamRecord((state) => state.job);
  const tick = useStreamRecord((state) => state.tick);
  const open = sessions.filter((session) => session.endedAt === null && session.platform === "twitch");
  const signature = `${recordStream}|${open.map((session) => session.id).join(",")}|${job?.sessionId || ""}|${tick}`;

  useEffect(() => {
    const state = usePult.getState();
    const enabled = state.settings.recordStream !== false;
    const live = state.sessions.filter((session) => session.endedAt === null && session.platform === "twitch");
    const ids = new Set(live.map((session) => session.id));
    for (const id of held) if (!ids.has(id)) held.delete(id);
    for (const id of announced) if (!ids.has(id)) announced.delete(id);
    const current = useStreamRecord.getState().job;
    if (current && !current.sessionId.startsWith("live:") && !ids.has(current.sessionId)) {
      stopStreamRecord();
      return;
    }
    if (!enabled) {
      if (current?.auto) stopStreamRecord();
      return;
    }
    if (current || starting || Date.now() < notBefore) return;
    const next = live.find((session) => !held.has(session.id));
    if (!next) return;
    for (const extra of live) {
      if (extra.id === next.id || held.has(extra.id) || announced.has(extra.id)) continue;
      announced.add(extra.id);
      useToasts.getState().push([
        `Файл пишется у ${next.displayName}. «${extra.displayName}» останется в журнале.`,
      ]);
    }
    void startStreamRecord(next, true);
  }, [signature]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!useStreamRecord.getState().job) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);
}
