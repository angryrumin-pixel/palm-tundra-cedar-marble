import type { Platform } from "@/lib/streams/types";

const TWITCH = /^[a-z0-9]\w{0,24}$/i;
const KICK = /^[a-z0-9_][a-z0-9_-]{1,24}$/i;
const HANDLE = /^@[\p{L}\p{N}._-]{2,50}$/u;
const CHANNEL = /^channel\/UC[\w-]{10,32}$/;
const LEGACY = /^(?:c|user)\/[\p{L}\p{N}._-]{2,50}$/u;
const WATCH = /^watch\/[\w-]{11}$/;

function asUrl(raw: string): URL | null {
  const text = raw.trim();
  if (!text) return null;
  const withProto = /^https?:\/\//i.test(text)
    ? text
    : text.includes(".")
      ? `https://${text}`
      : "";
  if (!withProto) return null;
  try {
    return new URL(withProto);
  } catch {
    return null;
  }
}

function hostEnds(url: URL, host: string): boolean {
  return url.hostname === host || url.hostname.endsWith(`.${host}`);
}

function firstSegment(url: URL): string {
  return decodeURIComponent(url.pathname.split("/").filter(Boolean)[0] ?? "");
}

export function normalizeTarget(
  platform: Platform,
  raw: string,
): { key: string } | { error: string } {
  const text = raw.trim();
  if (!text) return { error: "Введите ник или ссылку" };

  if (platform === "twitch") {
    const url = asUrl(text);
    let login = text.replace(/^@/, "");
    if (url && hostEnds(url, "twitch.tv")) {
      const seg = firstSegment(url);
      if (!seg || ["directory", "videos", "settings", "downloads", "search"].includes(seg)) {
        return { error: "Нужна ссылка на канал Twitch, не на раздел" };
      }
      login = seg;
    }
    if (!TWITCH.test(login)) return { error: "Это не похоже на ник Twitch" };
    return { key: login.toLowerCase() };
  }

  if (platform === "kick") {
    const url = asUrl(text);
    let slug = text.replace(/^@/, "");
    if (url && hostEnds(url, "kick.com")) {
      const seg = firstSegment(url);
      if (!seg || ["video", "categories", "browse", "following"].includes(seg)) {
        return { error: "Нужна ссылка на канал Kick" };
      }
      slug = seg;
    }
    if (!KICK.test(slug)) return { error: "Это не похоже на ник Kick" };
    return { key: slug.toLowerCase() };
  }

  const key = youtubeKey(text);
  if (!key) return { error: "Нужна ссылка на канал YouTube, @ник или ролик" };
  return { key };
}

function youtubeKey(raw: string): string | null {
  const text = raw.trim();
  const url = asUrl(text);
  if (url && (hostEnds(url, "youtube.com") || hostEnds(url, "youtu.be"))) {
    if (hostEnds(url, "youtu.be")) {
      const id = firstSegment(url);
      return /^[\w-]{11}$/.test(id) ? `watch/${id}` : null;
    }
    const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const head = parts[0] ?? "";
    if (head.startsWith("@")) return HANDLE.test(head) ? head : null;
    if (head === "channel" && parts[1]) {
      const key = `channel/${parts[1]}`;
      return CHANNEL.test(key) ? key : null;
    }
    if ((head === "c" || head === "user") && parts[1]) {
      const key = `${head}/${parts[1]}`;
      return LEGACY.test(key) ? key : null;
    }
    if (head === "watch") {
      const id = url.searchParams.get("v") ?? "";
      return /^[\w-]{11}$/.test(id) ? `watch/${id}` : null;
    }
    if (head === "live" && parts[1] && /^[\w-]{11}$/.test(parts[1])) return `watch/${parts[1]}`;
    if (head === "embed" && parts[1] && /^[\w-]{11}$/.test(parts[1])) return `watch/${parts[1]}`;
    return null;
  }
  if (text.startsWith("@")) return HANDLE.test(text) ? text : null;
  if (HANDLE.test(`@${text}`)) return `@${text}`;
  return null;
}

export function assertKey(platform: Platform, key: string): boolean {
  if (platform === "twitch") return TWITCH.test(key);
  if (platform === "kick") return KICK.test(key);
  return HANDLE.test(key) || CHANNEL.test(key) || LEGACY.test(key) || WATCH.test(key);
}
