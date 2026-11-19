import { useEffect } from "react";
import { appendChat, getChat, type ChatLine, type ChatPart } from "@/lib/streams/chat-log";
import { twitchEmotes, type EmoteInfo } from "@/lib/streams/twitch";
import { useTwitchAuth, hydrateTwitchAuth } from "@/lib/streams/twitch-auth";
import { usePult } from "@/lib/streams/store";

const emoteCache = new Map<string, { exp: number; map: Map<string, EmoteInfo> }>();

function colorOf(value: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#f3efe2";
}

function twitchEmoteUrl(id: string, animated: boolean): string {
  return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/${animated ? "animated" : "default"}/dark/2.0`;
}

function splitThird(text: string, emotes: Map<string, EmoteInfo>): ChatPart[] {
  if (!text) return [];
  const parts: ChatPart[] = [];
  for (const token of text.split(/(\s+)/)) {
    if (!token) continue;
    const emote = emotes.get(token);
    if (emote) {
      parts.push({ kind: "image", url: emote.url, alt: token, animated: emote.animated });
    } else {
      parts.push({ kind: "text", text: token });
    }
  }
  return parts;
}

function applyEmotes(text: string, tag: string, emotes: Map<string, EmoteInfo>): ChatPart[] {
  const ranges: { start: number; end: number; id: string }[] = [];
  if (tag) {
    for (const group of tag.split("/")) {
      const [id, places] = group.split(":");
      if (!id || !places) continue;
      for (const place of places.split(",")) {
        const [start, end] = place.split("-").map(Number);
        if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end >= text.length) continue;
        ranges.push({ start, end, id });
      }
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const parts: ChatPart[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue;
    if (range.start > cursor) parts.push(...splitThird(text.slice(cursor, range.start), emotes));
    const alt = text.slice(range.start, range.end + 1);
    parts.push({
      kind: "image",
      url: twitchEmoteUrl(range.id, true),
      fallback: twitchEmoteUrl(range.id, false),
      alt,
      animated: true,
    });
    cursor = range.end + 1;
  }
  if (cursor < text.length) parts.push(...splitThird(text.slice(cursor), emotes));
  return parts.length ? parts : [{ kind: "text", text }];
}

function parseTags(raw: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const piece of raw.split(";")) {
    const eq = piece.indexOf("=");
    if (eq <= 0) continue;
    tags[piece.slice(0, eq)] = piece.slice(eq + 1).replaceAll("\\s", " ").replaceAll("\\:", ";");
  }
  return tags;
}

function parsePriv(line: string, emotes: Map<string, EmoteInfo>): ChatLine | null {
  const tagEnd = line.startsWith("@") ? line.indexOf(" ") : -1;
  const tags = tagEnd > 0 ? parseTags(line.slice(1, tagEnd)) : {};
  const rest = tagEnd > 0 ? line.slice(tagEnd + 1) : line;
  const priv = rest.indexOf("PRIVMSG");
  if (priv < 0) return null;
  const colon = rest.indexOf(" :", priv);
  if (colon < 0) return null;
  const text = rest.slice(colon + 2);
  if (!text) return null;
  const author = tags["display-name"] || "зритель";
  return {
    id: tags.id || `${author}-${text}-${Date.now()}`,
    t: Date.now(),
    author,
    color: colorOf(tags.color || ""),
    parts: applyEmotes(text, tags.emotes || "", emotes),
  };
}

async function loadEmotes(login: string): Promise<Map<string, EmoteInfo>> {
  const hit = emoteCache.get(login);
  if (hit && hit.exp > Date.now()) return hit.map;
  try {
    const result = await twitchEmotes({ data: { login } });
    const map = new Map(Object.entries(result.emotes));
    emoteCache.set(login, { exp: Date.now() + 10 * 60 * 1000, map });
    return map;
  } catch {
    return new Map();
  }
}

function connectIrc(login: string, token: string | undefined, onLine: (line: string) => void): () => void {
  let socket: WebSocket | null = null;
  let stopped = false;
  let timer = 0;
  let auth = token;
  const open = () => {
    if (stopped) return;
    socket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
    socket.onopen = () => {
      const nick = auth ? `pult${Math.floor(Math.random() * 99999)}` : `justinfan${Math.floor(10000 + Math.random() * 89999)}`;
      socket?.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      if (auth) socket?.send(`PASS oauth:${auth.replace(/^oauth:/i, "")}`);
      socket?.send(`NICK ${nick}`);
      socket?.send(`JOIN #${login}`);
    };
    socket.onmessage = (event) => {
      for (const line of String(event.data).split("\r\n")) {
        if (!line) continue;
        if (line.startsWith("PING")) {
          socket?.send("PONG :tmi.twitch.tv");
          continue;
        }
        if (auth && (line.includes("Login unsuccessful") || line.includes("Login authentication failed"))) {
          auth = undefined;
          socket?.close();
          return;
        }
        onLine(line);
      }
    };
    socket.onclose = () => {
      if (!stopped) timer = window.setTimeout(open, 2500);
    };
  };
  open();
  return () => {
    stopped = true;
    window.clearTimeout(timer);
    socket?.close();
  };
}

function openBucket(bucket: string, login: string) {
  let stopSocket = () => {};
  let dead = false;
  void (async () => {
    const emotes = await loadEmotes(login);
    if (dead) return;
    const auth = useTwitchAuth.getState().auth;
    const token = auth?.scopes.includes("chat:read") ? auth.accessToken : undefined;
    stopSocket = connectIrc(login, token, (line) => {
      const message = parsePriv(line, emotes);
      if (message) appendChat(bucket, message);
    });
  })();
  return () => {
    dead = true;
    stopSocket();
  };
}

export function useTwitchRecorders() {
  const sessions = usePult((state) => state.sessions);
  const channels = usePult((state) => state.channels);
  const snapshots = usePult((state) => state.snapshots);
  const selectedId = usePult((state) => state.selectedId);
  const authLogin = useTwitchAuth((state) => state.auth?.login || "");
  const open = sessions.filter((session) => session.endedAt === null && session.platform === "twitch");
  const selected = channels.find((channel) => channel.id === selectedId);
  const preview =
    selected?.platform === "twitch" && snapshots[selected.id]?.live && !open.some((session) => session.channelId === selected.id)
      ? selected.id
      : "";
  const signature = `${authLogin}|${open.map((session) => `${session.id}:${session.key}`).join(",")}|${preview}`;

  useEffect(() => {
    hydrateTwitchAuth();
    const state = usePult.getState();
    const targets: { bucket: string; login: string }[] = [];
    const covered = new Set<string>();
    for (const session of state.sessions) {
      if (session.endedAt !== null || session.platform !== "twitch") continue;
      const login = session.key.toLowerCase();
      if (!/^[a-z0-9_]{2,25}$/.test(login)) continue;
      targets.push({ bucket: session.id, login });
      covered.add(session.channelId);
      for (const line of getChat(`preview:${session.channelId}`)) appendChat(session.id, line);
    }
    const current = state.channels.find((channel) => channel.id === state.selectedId);
    if (
      current?.platform === "twitch" &&
      state.snapshots[current.id]?.live &&
      !covered.has(current.id) &&
      /^[a-z0-9_]{2,25}$/.test(current.key)
    ) {
      targets.push({ bucket: `preview:${current.id}`, login: current.key.toLowerCase() });
    }
    const stops = targets.map((target) => openBucket(target.bucket, target.login));
    return () => stops.forEach((stop) => stop());
  }, [signature]);
}
