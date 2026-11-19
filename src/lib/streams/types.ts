export const PLATFORMS = ["twitch", "kick", "youtube"] as const;

export type Platform = (typeof PLATFORMS)[number];

export type Channel = {
  id: string;
  platform: Platform;
  key: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
  auto: boolean;
  addedAt: number;
};

export type Snapshot = {
  live: boolean;
  title: string;
  category: string;
  viewers: number | null;
  startedAt: string | null;
  thumbnailUrl: string;
  watchUrl: string;
  profileUrl: string;
  streamId: string;
  videoId: string;
  checkedAt: number;
  error: string;
};

export type Session = {
  id: string;
  channelId: string;
  platform: Platform;
  displayName: string;
  key: string;
  streamId: string;
  title: string;
  category: string;
  startedAt: number;
  streamStartedAt: string | null;
  endedAt: number | null;
  auto: boolean;
  peakViewers: number | null;
  samples: { t: number; viewers: number | null }[];
  markers: { t: number; note: string }[];
  takeId: string | null;
};

export type Take = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  sessionIds: string[];
  mime: string;
  bytes: number | null;
  saved: boolean;
};

export type Settings = {
  monitor: boolean;
  intervalSec: 30 | 60 | 120;
  sound: boolean;
  notify: boolean;
  wake: boolean;
};

export type CheckResult = {
  platform: Platform;
  queryKey: string;
  key: string;
  ok: boolean;
  found: boolean;
  error: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
  live: boolean;
  title: string;
  category: string;
  viewers: number | null;
  startedAt: string | null;
  thumbnailUrl: string;
  watchUrl: string;
  streamId: string;
  videoId: string;
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  twitch: "Twitch",
  kick: "Kick",
  youtube: "YouTube",
};
