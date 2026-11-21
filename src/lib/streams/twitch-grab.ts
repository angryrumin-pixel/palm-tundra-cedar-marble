import { proxied } from "@/lib/streams/media-proxy";

type Sink = {
  write: (chunk: Uint8Array) => Promise<void>;
  close: () => Promise<void>;
};

function downloadBlob(filename: string, chunks: Uint8Array[]) {
  const blob = new Blob(chunks.map((chunk) => chunk.slice()), { type: "video/mp2t" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 8000);
}

async function fileSink(filename: string): Promise<Sink | "cancel" | null> {
  const picker = (window as Window & {
    showSaveFilePicker?: (options: {
      suggestedName: string;
      types: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<{ createWritable: () => Promise<{ write: (data: Uint8Array) => Promise<void>; close: () => Promise<void> }> }>;
  }).showSaveFilePicker;
  if (!picker) return null;
  try {
    const handle = await picker({
      suggestedName: filename,
      types: [{ description: "Поток MPEG-TS", accept: { "video/mp2t": [".ts"] } }],
    });
    const writable = await handle.createWritable();
    return {
      write: (chunk) => writable.write(chunk),
      close: () => writable.close(),
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancel";
    return null;
  }
}

type StashPart = { name: string; chunks: Uint8Array[] };

let saveOnFinish = false;
let stashed: { key: string; name: string; parts: StashPart[]; bytes: number } | null = null;

export function armSaveOnFinish() {
  saveOnFinish = true;
}

export function stashedRecording() {
  return stashed;
}

export function downloadStash(): boolean {
  if (!stashed || stashed.bytes <= 0) return false;
  for (const part of stashed.parts) downloadBlob(part.name, part.chunks);
  stashed = null;
  return true;
}

function memorySink(baseName: string, defer: boolean) {
  let chunks: Uint8Array[] = [];
  let size = 0;
  let part = 1;
  const saved: StashPart[] = [];
  const put = (next: Uint8Array[], nextSize: number) => {
    if (nextSize <= 0) return;
    const name = part > 1 ? baseName.replace(/\.ts$/, `-${part}.ts`) : baseName;
    part += 1;
    if (defer) saved.push({ name, chunks: next });
    else downloadBlob(name, next);
  };
  return {
    saved,
    write: async (chunk: Uint8Array) => {
      chunks.push(chunk);
      size += chunk.byteLength;
      if (!defer && size >= PART_BYTES) {
        put(chunks, size);
        chunks = [];
        size = 0;
      }
    },
    close: async () => {
      put(chunks, size);
      chunks = [];
      size = 0;
    },
  };
}

function resolveRef(base: string, ref: string): string {
  if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;
  return new URL(ref, base).toString();
}

const PART_BYTES = 200 * 1024 * 1024;

async function readPlaylist(url: string, depth = 0): Promise<{ text: string; base: string }> {
  const res = await fetch(proxied(url));
  if (!res.ok) throw new Error("Плейлист Twitch недоступен");
  const text = await res.text();
  if (depth < 2 && text.includes("#EXT-X-STREAM-INF")) {
    const next = text.split("\n").find((line) => line.startsWith("http"));
    if (!next) throw new Error("В плейлисте нет видео");
    return readPlaylist(resolveRef(url, next), depth + 1);
  }
  return { text, base: url };
}

function segmentUrls(text: string, base: string): { map: string; segments: string[] } {
  let map = "";
  const segments: string[] = [];
  const lines = text.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("#EXT-X-MAP:")) {
      const uri = line.match(/URI="([^"]+)"/);
      if (uri?.[1]) map = resolveRef(base, uri[1]);
    } else if (line.startsWith("#EXT-X-TWITCH-PREFETCH:")) {
      const uri = line.slice("#EXT-X-TWITCH-PREFETCH:".length).trim();
      if (uri) segments.push(resolveRef(base, uri));
    } else if (line && !line.startsWith("#")) {
      segments.push(resolveRef(base, line));
    }
  }
  return { map, segments };
}

export async function grabTwitchStream(
  playlistUrl: string,
  filename: string,
  signal: AbortSignal,
  onBytes: (bytes: number) => void,
  options?: {
    picker?: boolean;
    refresh?: () => Promise<string | null>;
    defer?: boolean;
    stashKey?: string;
  },
): Promise<"cancel" | "saved" | "stashed" | "empty"> {
  const picked = options?.picker === false ? null : await fileSink(filename);
  if (picked === "cancel") return "cancel";
  if (signal.aborted) return "empty";
  const defer = options?.defer === true && !picked;
  const memory = picked ? null : memorySink(filename, defer);
  const sink = picked ?? memory;
  if (!sink) return "empty";
  const seen = new Set<string>();
  let mapWritten = false;
  let bytes = 0;
  let current = playlistUrl;
  try {
    while (!signal.aborted) {
      let playlist: { text: string; base: string };
      try {
        playlist = await readPlaylist(current);
      } catch (error) {
        if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) break;
        const next = options?.refresh ? await options.refresh() : null;
        if (!next) throw error;
        current = next;
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        continue;
      }
      const { map, segments } = segmentUrls(playlist.text, playlist.base);
      if (map && !mapWritten) {
        const init = await fetch(proxied(map), { signal });
        if (init.ok) {
          const chunk = new Uint8Array(await init.arrayBuffer());
          await sink.write(chunk);
          bytes += chunk.byteLength;
          onBytes(bytes);
        }
        mapWritten = true;
      }
      for (const url of segments) {
        if (signal.aborted) break;
        if (seen.has(url)) continue;
        seen.add(url);
        const res = await fetch(proxied(url), { signal });
        if (!res.ok) continue;
        const chunk = new Uint8Array(await res.arrayBuffer());
        if (!chunk.byteLength) continue;
        await sink.write(chunk);
        bytes += chunk.byteLength;
        onBytes(bytes);
      }
      if (seen.size > 6000) {
        for (const url of [...seen].slice(0, 2000)) seen.delete(url);
      }
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(resolve, 2000);
        const onAbort = () => {
          window.clearTimeout(timer);
          reject(new DOMException("aborted", "AbortError"));
        };
        if (signal.aborted) onAbort();
        else signal.addEventListener("abort", onAbort, { once: true });
      });
    }
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
  } finally {
    await sink.close();
  }
  if (!defer || !memory) return "saved";
  const total = memory.saved.reduce(
    (sum, part) => sum + part.chunks.reduce((inner, chunk) => inner + chunk.byteLength, 0),
    0,
  );
  if (total <= 0) return "empty";
  if (saveOnFinish) {
    saveOnFinish = false;
    for (const part of memory.saved) downloadBlob(part.name, part.chunks);
    stashed = null;
    return "saved";
  }
  stashed = { key: options?.stashKey || "", name: filename, parts: memory.saved, bytes: total };
  return "stashed";
}
