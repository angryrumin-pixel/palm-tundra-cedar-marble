import { useEffect, useState } from "react";

export type ChatPart =
  | { kind: "text"; text: string }
  | { kind: "image"; url: string; alt: string; animated: boolean; fallback?: string };

export type ChatLine = {
  id: string;
  t: number;
  author: string;
  color: string;
  parts: ChatPart[];
};

const logs = new Map<string, ChatLine[]>();
const listeners = new Set<() => void>();
const MAX_LINES = 4000;

export function chatBucket(channelId: string, sessionId?: string): string {
  return sessionId || `preview:${channelId}`;
}

export function getChat(bucket: string): ChatLine[] {
  return logs.get(bucket) ?? [];
}

export function appendChat(bucket: string, line: ChatLine) {
  const prev = logs.get(bucket) ?? [];
  if (prev.some((item) => item.id === line.id)) return;
  const next = prev.length >= MAX_LINES ? prev.slice(prev.length - MAX_LINES + 1) : prev.slice();
  next.push(line);
  logs.set(bucket, next);
  for (const listener of listeners) listener();
}

export function useChatLines(bucket: string): ChatLine[] {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const listener = () => setVersion((value) => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  void version;
  return getChat(bucket);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => {
    if (char === "&") return "&" + "amp;";
    if (char === "<") return "&" + "lt;";
    if (char === ">") return "&" + "gt;";
    return "&" + "quot;";
  });
}

async function embedImages(lines: ChatLine[]): Promise<Map<string, string>> {
  const urls = new Set<string>();
  for (const line of lines) {
    for (const part of line.parts) {
      if (part.kind === "image") urls.add(part.url);
    }
  }
  const out = new Map<string, string>();
  const queue = [...urls];
  async function worker() {
    while (queue.length) {
      const url = queue.pop();
      if (!url) return;
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const type = res.headers.get("content-type") || "";
        if (!type.startsWith("image/")) continue;
        const blob = await res.blob();
        if (blob.size > 2_000_000) continue;
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("read"));
          reader.readAsDataURL(blob);
        });
        if (data.startsWith("data:image/")) out.set(url, data);
      } catch {
        continue;
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, () => worker()));
  return out;
}

export async function downloadChatHtml(filename: string, title: string, lines: ChatLine[]) {
  const images = await embedImages(lines);
  const rows = lines
    .map((line) => {
      const time = new Date(line.t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const color = /^#[0-9a-fA-F]{6}$/.test(line.color) ? line.color : "#f3efe2";
      const body = line.parts
        .map((part) => {
          if (part.kind === "text") return escapeHtml(part.text);
          const src = images.get(part.url) || part.url;
          return `<img src="${escapeHtml(src)}" alt="${escapeHtml(part.alt)}" />`;
        })
        .join("");
      return `<p><time>${time}</time> <b style="color:${color}">${escapeHtml(line.author)}</b> ${body}</p>`;
    })
    .join("\n");
  const html = `<!doctype html><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{margin:0;background:#12130f;color:#f3efe2;font:15px/1.45 "IBM Plex Sans",sans-serif}main{max-width:760px;margin:0 auto;padding:24px}h1{font-size:20px}p{margin:0 0 8px}time{font:12px ui-monospace,monospace;color:#a39e8c;margin-right:6px}img{height:28px;vertical-align:middle;margin:0 2px}b{font-weight:600}</style><main><h1>${escapeHtml(title)}</h1>${rows}</main>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 4000);
}
