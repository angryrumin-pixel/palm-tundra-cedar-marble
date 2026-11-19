import { useEffect, useState } from "react";
import {
  armCapture,
  captureArmed,
  disarmCapture,
  isRecording,
  playbackUrl,
  preferredMime,
  putBlob,
  startRecorder,
  stopRecorder,
  useCapture,
} from "@/components/pult/capture";
import { checkStreams } from "@/lib/streams/check";
import { fileStamp, formatBytes, slugName } from "@/lib/streams/format";
import { normalizeTarget } from "@/lib/streams/normalize";
import { reducePoll, type Decision } from "@/lib/streams/reduce";
import { usePult, useToasts } from "@/lib/streams/store";
import type { CheckResult, Platform } from "@/lib/streams/types";

let primed = false;
let chain: Promise<void> = Promise.resolve();
let audio: AudioContext | null = null;

function enqueue(task: () => Promise<void>): Promise<void> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function beep() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  if (!audio) audio = new Ctx();
  const ctx = audio;
  if (ctx.state === "suspended") void ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(620, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.38);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}

function beginVideo(sessionIds: string[]) {
  if (!sessionIds.length || !captureArmed() || isRecording()) return;
  const takeId = crypto.randomUUID();
  const now = Date.now();
  const mime = preferredMime();
  const state = usePult.getState();
  useCapture.setState({ recording: true, takeId, bytes: 0, armed: true, error: "" });
  usePult.setState({
    takes: [
      { id: takeId, startedAt: now, endedAt: null, sessionIds, mime, bytes: null, saved: false },
      ...state.takes,
    ].slice(0, 40),
    sessions: state.sessions.map((session) =>
      sessionIds.includes(session.id) ? { ...session, takeId } : session,
    ),
  });
  try {
    startRecorder(mime, (blob) => {
      putBlob(takeId, blob);
      const current = usePult.getState();
      usePult.setState({
        takes: current.takes.map((take) =>
          take.id === takeId
            ? { ...take, endedAt: Date.now(), bytes: blob.size, mime: blob.type || mime }
            : take,
        ),
      });
      useCapture.setState({ recording: false, takeId: null, bytes: blob.size });
      useToasts.getState().push([
        `Видео готово · ${formatBytes(blob.size)}. Скачайте, пока вкладка открыта.`,
      ]);
      const first = current.sessions.find((session) => sessionIds.includes(session.id));
      triggerDownload(blob, `pult-${slugName(first?.displayName || "efir")}-${fileStamp()}.webm`);
    });
  } catch {
    useCapture.setState({ recording: false, takeId: null, error: "Не удалось начать видео" });
    useToasts.getState().push(["Не удалось начать видео. Журнал сессии всё равно ведётся."]);
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 8000);
}

function runEffects(decision: Decision) {
  const settings = usePult.getState().settings;
  if (decision.sound && settings.sound) beep();
  if (
    settings.notify &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  ) {
    for (const note of decision.notifies) {
      try {
        new Notification(note.title, { body: note.body, icon: note.icon || undefined });
      } catch {
        // Notifications can fail if the browser blocks them after permission.
      }
    }
  }
  if (decision.toasts.length) useToasts.getState().push(decision.toasts);
  if (decision.stopVideo) stopRecorder();
  if (decision.beginVideo) beginVideo(decision.videoSessionIds);
}

export async function submitChannel(platform: Platform, raw: string): Promise<string | null> {
  const parsed = normalizeTarget(platform, raw);
  if ("error" in parsed) return parsed.error;
  const existing = usePult
    .getState()
    .channels.find((channel) => channel.platform === platform && channel.key === parsed.key);
  if (existing) {
    usePult.getState().select(existing.id);
    useToasts.getState().push(["Этот канал уже в списке"]);
    return null;
  }
  if (usePult.getState().channels.length >= 12) {
    return "В списке уже 12 каналов — уберите лишний.";
  }

  let message: string | null = null;
  await enqueue(async () => {
    let result: CheckResult;
    try {
      const results = await checkStreams({
        data: { items: [{ platform, key: parsed.key }] },
      });
      const first = results[0];
      if (!first) {
        message = "Не удалось проверить канал";
        return;
      }
      result = first;
    } catch {
      message = "Не удалось проверить канал";
      return;
    }
    if (!result.ok) {
      message = result.error || "Не удалось проверить канал";
      return;
    }
    if (!result.found) {
      message = result.error || "Такой канал не найден";
      return;
    }
    const channel = {
      id: crypto.randomUUID(),
      platform,
      key: result.key,
      displayName: result.displayName || result.key,
      avatarUrl: result.avatarUrl,
      profileUrl: result.profileUrl,
      auto: true,
      addedAt: Date.now(),
    };
    usePult.getState().addChannel(channel);
    ingestResults([{ ...result, queryKey: result.key }], usePult.getState().settings.monitor);
    if (!result.live) {
      useToasts
        .getState()
        .push([`${channel.displayName} в списке. Запись откроется сама, когда начнётся эфир.`]);
    } else if (!usePult.getState().settings.monitor) {
      useToasts
        .getState()
        .push([`${channel.displayName} уже в эфире. Включите монитор, чтобы ловить следующие.`]);
    }
  });
  return message;
}

function ingestResults(results: CheckResult[], auto: boolean) {
  const capture = useCapture.getState();
  const state = usePult.getState();
  const decision = reducePoll({
    channels: state.channels,
    snapshots: state.snapshots,
    sessions: state.sessions,
    takes: state.takes,
    results,
    now: Date.now(),
    auto,
    primed,
    videoIdle: capture.armed && !capture.recording && captureArmed(),
    videoTakeId: capture.recording ? capture.takeId : null,
  });
  usePult.setState({
    channels: decision.channels,
    snapshots: decision.snapshots,
    sessions: decision.sessions,
    takes: decision.takes,
  });
  runEffects(decision);
}

export function manualStart(channelId: string) {
  const state = usePult.getState();
  const channel = state.channels.find((item) => item.id === channelId);
  const snap = channel ? state.snapshots[channel.id] : undefined;
  if (!channel || !snap?.live) return;
  if (state.sessions.some((session) => session.channelId === channelId && session.endedAt === null)) {
    return;
  }
  const session = {
    id: crypto.randomUUID(),
    channelId: channel.id,
    platform: channel.platform,
    displayName: channel.displayName,
    key: channel.key,
    streamId: snap.streamId || `manual-${Date.now()}`,
    title: snap.title,
    category: snap.category,
    startedAt: Date.now(),
    streamStartedAt: snap.startedAt,
    endedAt: null,
    auto: false,
    peakViewers: snap.viewers,
    samples: snap.viewers == null ? [] : [{ t: Date.now(), viewers: snap.viewers }],
    markers: [] as { t: number; note: string }[],
    takeId: null as string | null,
  };
  usePult.setState({ sessions: [session, ...state.sessions].slice(0, 50) });
  const capture = useCapture.getState();
  if (capture.armed && !capture.recording) beginVideo([session.id]);
  else if (capture.recording && capture.takeId) {
    const takeId = capture.takeId;
    const next = usePult.getState();
    usePult.setState({
      sessions: next.sessions.map((item) => (item.id === session.id ? { ...item, takeId } : item)),
      takes: next.takes.map((take) =>
        take.id === takeId ? { ...take, sessionIds: [...take.sessionIds, session.id] } : take,
      ),
    });
  }
  useToasts.getState().push([`Запись «${channel.displayName}» начата`]);
}

export function manualStop(channelId: string) {
  const state = usePult.getState();
  const open = state.sessions.find(
    (session) => session.channelId === channelId && session.endedAt === null,
  );
  if (!open) return;
  const sessions = state.sessions.map((session) =>
    session.id === open.id ? { ...session, endedAt: Date.now() } : session,
  );
  usePult.setState({ sessions });
  if (!sessions.some((session) => session.endedAt === null)) stopRecorder();
  useToasts.getState().push(["Запись остановлена"]);
}

export async function armScreen() {
  try {
    await armCapture(() => {
      useCapture.setState({ armed: false, recording: false, takeId: null });
    });
    useCapture.setState({ armed: true, error: "" });
    useToasts.getState().push([
      "Экран армирован. Видео включится само, когда кто-то из списка выйдет в эфир.",
    ]);
    const open = usePult.getState().sessions.filter((session) => session.endedAt === null);
    if (open.length) beginVideo(open.map((session) => session.id));
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const text =
      name === "NotAllowedError"
        ? "Разрешение на экран не дано. Журнал без видео всё равно работает."
        : "Этот браузер не отдал захват экрана.";
    useCapture.setState({ armed: false, error: text });
    useToasts.getState().push([text]);
  }
}

export function disarmScreen() {
  disarmCapture();
  useCapture.setState({ armed: false, recording: false, takeId: null, bytes: 0 });
}

export function downloadTakeFile(takeId: string, filename: string): boolean {
  const url = playbackUrl(takeId);
  const blobMissing = !url;
  if (blobMissing || !url) return false;
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  usePult.getState().markTakeSaved(takeId);
  return true;
}

async function pollNow() {
  const { channels } = usePult.getState();
  if (!channels.length) return;
  const snapshots = usePult.getState().snapshots;
  const results = await checkStreams({
    data: {
      items: channels.map((channel) => {
        const snap = snapshots[channel.id];
        const videoId = snap?.live ? snap.videoId : "";
        return {
          platform: channel.platform,
          key: channel.key,
          ...(videoId ? { videoId } : {}),
        };
      }),
    },
  });
  const { settings } = usePult.getState();
  ingestResults(results, settings.monitor);
}

export function useMonitor() {
  const monitor = usePult((state) => state.settings.monitor);
  const intervalSec = usePult((state) => state.settings.intervalSec);
  const wake = usePult((state) => state.settings.wake);
  const channelKey = usePult((state) => state.channels.map((channel) => channel.id).join("|"));
  const [checking, setChecking] = useState(false);
  const [nextAt, setNextAt] = useState(0);

  useEffect(() => {
    let stopped = false;
    let timer = 0;

    async function tick() {
      if (stopped) return;
      if (!usePult.getState().channels.length) return;
      setChecking(true);
      try {
        await enqueue(async () => {
          await pollNow();
          primed = true;
        });
      } catch {
        useToasts.getState().push(["Не удалось проверить эфиры. Повторю на следующем круге."]);
      } finally {
        if (!stopped) setChecking(false);
      }
    }

    function schedule(delay: number) {
      setNextAt(Date.now() + delay);
      timer = window.setTimeout(async () => {
        await tick();
        if (stopped) return;
        if (usePult.getState().settings.monitor) schedule(usePult.getState().settings.intervalSec * 1000);
        else setNextAt(0);
      }, delay);
    }

    void tick().then(() => {
      if (stopped) return;
      if (usePult.getState().settings.monitor) schedule(usePult.getState().settings.intervalSec * 1000);
    });

    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [monitor, intervalSec, channelKey]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!usePult.getState().settings.monitor) return;
      if (nextAt && Date.now() > nextAt + 1000) {
        void enqueue(async () => {
          setChecking(true);
          try {
            await pollNow();
            primed = true;
          } finally {
            setChecking(false);
          }
        });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [nextAt]);

  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    let gone = false;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    async function claim() {
      if (!wake || !monitor || !nav.wakeLock || document.visibilityState !== "visible") return;
      try {
        const sentinel = await nav.wakeLock.request("screen");
        if (gone) {
          await sentinel.release();
          return;
        }
        lock = sentinel;
      } catch {
        // Wake lock is optional.
      }
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") void claim();
    };
    void claim();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [wake, monitor]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      const capture = useCapture.getState();
      const unsaved = usePult.getState().takes.some((take) => take.bytes && !take.saved && take.endedAt);
      if (capture.recording || unsaved) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  return { checking, nextAt };
}

export async function enableMonitor(on: boolean) {
  usePult.getState().setSettings({ monitor: on });
  if (!on) return;
  const { settings } = usePult.getState();
  if (settings.notify && typeof Notification !== "undefined" && Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      // ignore
    }
  }
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (settings.sound && Ctx) {
    if (!audio) audio = new Ctx();
    void audio.resume();
  }
}
