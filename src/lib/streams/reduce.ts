import type {
  Channel,
  CheckResult,
  Session,
  Settings,
  Snapshot,
  Take,
} from "@/lib/streams/types";

export type Notify = { title: string; body: string; icon: string };

export type Decision = {
  channels: Channel[];
  snapshots: Record<string, Snapshot>;
  sessions: Session[];
  takes: Take[];
  toasts: string[];
  notifies: Notify[];
  sound: boolean;
  beginVideo: boolean;
  stopVideo: boolean;
  videoSessionIds: string[];
};

export function emptySnapshot(): Snapshot {
  return {
    live: false,
    title: "",
    category: "",
    viewers: null,
    startedAt: null,
    thumbnailUrl: "",
    watchUrl: "",
    profileUrl: "",
    streamId: "",
    videoId: "",
    checkedAt: 0,
    error: "",
  };
}

export function snapshotFromResult(result: CheckResult, now: number): Snapshot {
  return {
    live: result.live,
    title: result.title,
    category: result.category,
    viewers: result.viewers,
    startedAt: result.startedAt,
    thumbnailUrl: result.thumbnailUrl,
    watchUrl: result.watchUrl,
    profileUrl: result.profileUrl,
    streamId: result.streamId,
    videoId: result.videoId,
    checkedAt: now,
    error: "",
  };
}

export function createSession(
  channel: Channel,
  snap: Snapshot,
  auto: boolean,
  now: number,
): Session {
  return {
    id: crypto.randomUUID(),
    channelId: channel.id,
    platform: channel.platform,
    displayName: channel.displayName,
    key: channel.key,
    streamId: snap.streamId,
    title: snap.title,
    category: snap.category,
    startedAt: now,
    streamStartedAt: snap.startedAt,
    endedAt: null,
    auto,
    peakViewers: snap.viewers,
    samples: snap.viewers == null ? [] : [{ t: now, viewers: snap.viewers }],
    markers: [],
    takeId: null,
  };
}

function peak(prev: number | null, next: number | null): number | null {
  if (next == null) return prev;
  if (prev == null) return next;
  return Math.max(prev, next);
}

function pushSample(samples: Session["samples"], sample: Session["samples"][number]) {
  const next = [...samples, sample];
  if (next.length <= 200) return next;
  return next.slice(next.length - 200);
}

function capSessions(list: Session[]): Session[] {
  if (list.length <= 50) return list;
  const open = list.filter((item) => item.endedAt === null);
  const closed = list.filter((item) => item.endedAt !== null);
  return [...open, ...closed].slice(0, 50);
}

export function reducePoll(input: {
  channels: Channel[];
  snapshots: Record<string, Snapshot>;
  sessions: Session[];
  takes: Take[];
  results: CheckResult[];
  now: number;
  auto: boolean;
  primed: boolean;
  videoIdle: boolean;
  videoTakeId: string | null;
}): Decision {
  const snapshots: Record<string, Snapshot> = { ...input.snapshots };
  let sessions = input.sessions.slice();
  let takes = input.takes;
  let channels = input.channels;
  const toasts: string[] = [];
  const notifies: Notify[] = [];
  let sound = false;
  const summary: string[] = [];
  const openedIds: string[] = [];

  const channelByKey = new Map(channels.map((channel) => [`${channel.platform}:${channel.key}`, channel]));

  for (const result of input.results) {
    const channel = channelByKey.get(`${result.platform}:${result.queryKey}`);
    if (!channel) continue;

    if (!result.ok) {
      const prev = snapshots[channel.id] ?? emptySnapshot();
      snapshots[channel.id] = {
        ...prev,
        checkedAt: input.now,
        error: result.error || "Сбой проверки",
      };
      continue;
    }

    if (result.found) {
      channels = channels.map((item) =>
        item.id === channel.id
          ? {
              ...item,
              displayName: result.displayName || item.displayName,
              avatarUrl: result.avatarUrl || item.avatarUrl,
              profileUrl: result.profileUrl || item.profileUrl,
            }
          : item,
      );
    }

    const prev = snapshots[channel.id] ?? emptySnapshot();
    const snap = result.found
      ? snapshotFromResult(result, input.now)
      : {
          ...prev,
          live: false,
          checkedAt: input.now,
          error: "Канал не найден",
        };
    snapshots[channel.id] = snap;

    const openIndex = sessions.findIndex(
      (session) => session.channelId === channel.id && session.endedAt === null,
    );

    if (snap.live && openIndex >= 0) {
      const open = sessions[openIndex];
      if (!open) continue;
      const fresh: Session = {
        ...open,
        title: snap.title || open.title,
        category: snap.category || open.category,
        displayName: result.displayName || channel.displayName,
        peakViewers: peak(open.peakViewers, snap.viewers),
        samples: pushSample(open.samples, { t: input.now, viewers: snap.viewers }),
      };
      sessions = sessions.map((session, index) => (index === openIndex ? fresh : session));
      continue;
    }

    if (input.auto && channel.auto && snap.live && openIndex < 0) {
      const duplicate = sessions.some(
        (session) =>
          session.channelId === channel.id &&
          session.streamId !== "" &&
          session.streamId === snap.streamId,
      );
      if (!duplicate) {
        const session = createSession(channel, snap, true, input.now);
        sessions = capSessions([session, ...sessions]);
        openedIds.push(session.id);
        if (input.primed) {
          sound = true;
          const title = snap.title ? `${channel.displayName}: ${snap.title}` : channel.displayName;
          toasts.push(`${channel.displayName} в эфире — запись начата`);
          notifies.push({
            title: "Эфир начался",
            body: title,
            icon: channel.avatarUrl,
          });
        } else {
          summary.push(channel.displayName);
        }
      }
      continue;
    }

    if (openIndex >= 0 && !snap.live) {
      sessions = sessions.map((session, index) =>
        index === openIndex ? { ...session, endedAt: input.now } : session,
      );
      if (input.primed) toasts.push(`${channel.displayName} закончил эфир. Запись закрыта.`);
    }
  }

  if (!input.primed && summary.length) {
    toasts.push(`Сейчас в эфире: ${summary.join(", ")}. Журнал уже пишется.`);
  }

  const openSessions = sessions.filter((session) => session.endedAt === null);
  let beginVideo = false;
  let stopVideo = false;
  let videoSessionIds: string[] = [];

  if (input.videoTakeId) {
    const takeId = input.videoTakeId;
    if (openSessions.length === 0) {
      stopVideo = true;
    } else {
      const ids = openSessions.map((session) => session.id);
      takes = takes.map((take) =>
        take.id === takeId
          ? { ...take, sessionIds: Array.from(new Set([...take.sessionIds, ...ids])) }
          : take,
      );
      sessions = sessions.map((session) =>
        session.endedAt === null && !session.takeId ? { ...session, takeId } : session,
      );
    }
  } else if (input.videoIdle && openedIds.length > 0) {
    beginVideo = true;
    videoSessionIds = openSessions.map((session) => session.id);
  }

  return {
    channels,
    snapshots,
    sessions,
    takes,
    toasts,
    notifies,
    sound,
    beginVideo,
    stopVideo,
    videoSessionIds,
  };
}

export const DEFAULT_SETTINGS: Settings = {
  monitor: false,
  intervalSec: 60,
  sound: true,
  notify: true,
  wake: false,
  recordStream: true,
};
