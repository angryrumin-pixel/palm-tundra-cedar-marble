import { useEffect, useRef, useState } from "react";
import { Download, LogIn, LogOut } from "lucide-react";
import { downloadChatHtml, useChatLines, type ChatPart } from "@/lib/streams/chat-log";
import { fileStamp, formatBytes, slugName } from "@/lib/streams/format";
import {
  pollTwitchDevice,
  resolveTwitchPlayback,
  startTwitchDevice,
  validateTwitchToken,
  type TwitchQuality,
} from "@/lib/streams/twitch";
import { currentTwitchCredential, hydrateTwitchAuth, useTwitchAuth } from "@/lib/streams/twitch-auth";
import { startStreamRecord, stopStreamRecord, useStreamRecord } from "@/lib/streams/auto-record";
import type { Channel } from "@/lib/streams/types";
import { cn } from "@/lib/cn";
import { proxied } from "@/lib/streams/media-proxy";

const QUALITIES: { id: TwitchQuality; label: string }[] = [
  { id: "1080", label: "1080p" },
  { id: "720", label: "720p" },
  { id: "480", label: "480p" },
  { id: "360", label: "360p" },
];

function parentsOfThisPage(): string[] {
  const hosts = new Set<string>();
  const add = (host: string) => {
    const clean = host.trim().toLowerCase();
    if (!clean || clean.includes(":") || clean.includes("/")) return;
    hosts.add(clean);
  };
  add(window.location.hostname);
  if (window.location.hostname === "127.0.0.1") hosts.add("localhost");
  try {
    if (document.referrer) add(new URL(document.referrer).hostname);
  } catch {
    // ignore
  }
  const ancestors = window.location.ancestorOrigins;
  if (ancestors) {
    for (const origin of ancestors) {
      try {
        add(new URL(origin).hostname);
      } catch {
        // ignore
      }
    }
  }
  return [...hosts];
}

function ChatImage({ part }: { part: Extract<ChatPart, { kind: "image" }> }) {
  const [src, setSrc] = useState(part.url);
  return (
    <img
      src={src}
      alt={part.alt}
      loading="lazy"
      className={cn("mx-0.5 inline-block max-w-32 object-contain align-middle", part.animated ? "h-8" : "h-6")}
      onError={() => {
        if (part.fallback && src !== part.fallback) setSrc(part.fallback);
      }}
    />
  );
}

export function ChatPane({ bucket, title }: { bucket: string; title: string }) {
  const lines = useChatLines(bucket);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !stick.current) return;
    el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div className="border-t border-line">
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <p className="font-mono text-xs tracking-widest text-muted">ЧАТ · {lines.length}</p>
        <button
          type="button"
          disabled={!lines.length || saving}
          className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg disabled:text-muted"
          onClick={() => {
            setSaving(true);
            void downloadChatHtml(
              `pult-chat-${slugName(title)}-${fileStamp(new Date())}.html`,
              `Чат · ${title}`,
              lines,
            ).finally(() => setSaving(false));
          }}
        >
          <Download className="size-4" aria-hidden="true" />
          {saving ? "Собираю" : "Скачать чат"}
        </button>
      </div>
      <div
        ref={scroller}
        className="h-72 overflow-y-auto px-4 pb-3"
        onScroll={(event) => {
          const el = event.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
      >
        {lines.length === 0 ? (
          <p className="text-sm text-muted">Сообщений пока нет. Картинки и GIF появятся прямо в строке.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {lines.slice(-300).map((line) => (
              <li key={line.id} className="text-sm leading-relaxed break-words text-fg">
                <span className="mr-2 font-mono text-xs text-muted">
                  {new Date(line.t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span className="mr-1 font-medium" style={{ color: line.color }}>
                  {line.author}
                </span>
                {line.parts.map((part, index) =>
                  part.kind === "text" ? (
                    <span key={`${line.id}-${index}`}>{part.text}</span>
                  ) : (
                    <ChatImage key={`${line.id}-${index}`} part={part} />
                  ),
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TwitchLogin() {
  const clientId = useTwitchAuth((state) => state.clientId);
  const auth = useTwitchAuth((state) => state.auth);
  const setClientId = useTwitchAuth((state) => state.setClientId);
  const setAuth = useTwitchAuth((state) => state.setAuth);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [code, setCode] = useState("");
  const [link, setLink] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    hydrateTwitchAuth();
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => setDraft(clientId), [clientId]);

  async function begin() {
    const id = draft.trim();
    if (!/^[a-z0-9]{20,50}$/i.test(id)) {
      setError("Client ID — около 30 символов из консоли разработчика Twitch.");
      return;
    }
    setClientId(id);
    setError("");
    setWaiting(true);
    const started = await startTwitchDevice({ data: { clientId: id } });
    if (!alive.current) return;
    if (!started.ok) {
      setWaiting(false);
      setError(started.error);
      return;
    }
    setCode(started.userCode);
    setLink(started.verificationUri);
    const deadline = Date.now() + started.expiresIn * 1000;
    const interval = Math.max(5, started.interval) * 1000;
    while (alive.current && Date.now() < deadline) {
      await new Promise((resolve) => window.setTimeout(resolve, interval));
      if (!alive.current) return;
      const polled = await pollTwitchDevice({ data: { clientId: id, deviceCode: started.deviceCode } });
      if (!alive.current) return;
      if (!polled.ok) {
        setError(polled.error);
        setWaiting(false);
        return;
      }
      if (polled.pending) continue;
      const who = await validateTwitchToken({ data: { token: polled.accessToken } });
      setAuth({
        clientId: id,
        accessToken: polled.accessToken,
        refreshToken: polled.refreshToken,
        expiresAt: Date.now() + polled.expiresIn * 1000,
        login: who.ok ? who.login : "twitch",
        scopes: who.ok && who.scopes.length ? who.scopes : polled.scopes,
      });
      setWaiting(false);
      setOpen(false);
      setCode("");
      return;
    }
    if (alive.current) {
      setWaiting(false);
      setError("Код истёк. Запросите новый.");
    }
  }

  if (auth) {
    return (
      <button
        type="button"
        className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg"
        onClick={() => setAuth(null)}
      >
        <LogOut className="size-4" aria-hidden="true" />
        {auth.login}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg"
        onClick={() => setOpen((value) => !value)}
      >
        <LogIn className="size-4" aria-hidden="true" />
        Войти в Twitch
      </button>
      {open ? (
        <div className="w-full max-w-md rounded-md border border-line bg-bg p-3">
          <p className="text-sm leading-relaxed text-muted">
            Создайте публичное приложение на{" "}
            <a className="text-fg underline" href="https://dev.twitch.tv/console/apps" target="_blank" rel="noreferrer">
              dev.twitch.tv
            </a>
            . Redirect можно поставить http://localhost. Секрет не нужен — только Client ID.
          </p>
          <label className="mt-3 block">
            <span className="sr-only">Client ID</span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Client ID"
              spellCheck={false}
              className="h-11 w-full rounded-md border border-line bg-surface px-3 font-mono text-sm text-fg outline-none"
            />
          </label>
          <button
            type="button"
            disabled={waiting}
            className="mt-2 h-11 rounded-md bg-fg px-3 text-sm font-medium text-bg disabled:opacity-60"
            onClick={() => void begin()}
          >
            {waiting ? "Жду подтверждение" : "Получить код"}
          </button>
          {code ? (
            <p className="mt-3 text-sm text-fg">
              Код <span className="font-mono text-base">{code}</span>
              {link ? (
                <>
                  {" "}
                  <a className="underline" href={link} target="_blank" rel="noreferrer">
                    открыть Twitch
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-live">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function TwitchLive({ channel, sessionId }: { channel: Channel; sessionId?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const authLogin = useTwitchAuth((state) => state.auth?.login || "");
  const fileJob = useStreamRecord((state) => state.job);
  const [mode, setMode] = useState<"own" | "embed">("own");
  const [quality, setQuality] = useState<TwitchQuality>("720");
  const [status, setStatus] = useState("");
  const [parents, setParents] = useState<string[]>([]);

  useEffect(() => {
    hydrateTwitchAuth();
    setParents(parentsOfThisPage());
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || mode !== "own") return;
    let dead = false;
    let player: { destroy: () => void } | null = null;
    setStatus("Подключаю поток…");
    void (async () => {
      const cred = await currentTwitchCredential();
      const result = await resolveTwitchPlayback({
        data: { login: channel.key, quality, clientId: cred.clientId, token: cred.token },
      });
      if (dead) return;
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      setStatus("");
      const mod = await import("hls.js");
      if (dead) return;
      const Hls = mod.default;
      if (Hls.isSupported()) {
        const Base = Hls.DefaultConfig.loader;
        class ProxyLoader extends Base {
          load(
            context: { url?: string },
            config: ConstructorParameters<typeof Base>[0] extends never ? never : object,
            callbacks: object,
          ) {
            if (context.url) context.url = proxied(context.url);
            super.load(context as never, config as never, callbacks as never);
          }
        }
        const hls = new Hls({ enableWorker: false, backBufferLength: 30, loader: ProxyLoader });
        player = hls;
        hls.attachMedia(video);
        hls.loadSource(result.url);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) setStatus("Поток оборвался. Попробуйте официальный плеер или другое качество.");
        });
        void video.play().catch(() => undefined);
        return;
      }
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = result.url;
        void video.play().catch(() => undefined);
        return;
      }
      setStatus("Браузер не умеет HLS. Откройте официальный плеер.");
    })();
    return () => {
      dead = true;
      player?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [channel.key, quality, mode, authLogin]);

  const grabbing = fileJob?.login === channel.key.toLowerCase();

  async function toggleGrab() {
    if (grabbing) {
      stopStreamRecord({ download: true, hold: true });
      return;
    }
    if (fileJob) {
      setStatus(`Сначала остановите файл «${fileJob.displayName}».`);
      return;
    }
    setStatus("");
    const started = await startStreamRecord(
      {
        id: sessionId || `live:${channel.id}`,
        key: channel.key,
        displayName: channel.displayName,
        startedAt: Date.now(),
      },
      false,
      quality,
    );
    if (!started && !useStreamRecord.getState().job) setStatus("Не удалось сохранить поток.");
  }

  const embedSrc =
    parents.length > 0
      ? `https://player.twitch.tv/?channel=${encodeURIComponent(channel.key)}&muted=true&autoplay=true${parents
          .map((parent) => `&parent=${encodeURIComponent(parent)}`)
          .join("")}`
      : "";

  return (
    <div>
      {mode === "own" ? (
        <div className="relative bg-bg">
          <video ref={videoRef} className="aspect-video w-full bg-bg" controls muted autoPlay playsInline />
          {status ? <p className="absolute inset-x-0 bottom-12 px-4 text-sm text-fg">{status}</p> : null}
        </div>
      ) : embedSrc ? (
        <iframe
          title={`Эфир ${channel.displayName}`}
          src={embedSrc}
          className="aspect-video w-full bg-bg"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className="aspect-video bg-bg" />
      )}
      <div className="flex flex-col gap-3 border-t border-line p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg">
            <span className="text-muted">Качество</span>
            <select
              value={quality}
              onChange={(event) => setQuality(event.target.value as TwitchQuality)}
              className="bg-transparent text-fg outline-none"
            >
              {QUALITIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium",
              grabbing ? "bg-live text-bg" : "border border-line text-fg",
            )}
            onClick={() => void toggleGrab()}
          >
            <Download className="size-4" aria-hidden="true" />
            {grabbing ? `Стоп · ${formatBytes(fileJob?.bytes || 0)}` : "Скачать поток"}
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-md border border-line px-3 text-sm text-fg"
            onClick={() => setMode((value) => (value === "own" ? "embed" : "own"))}
          >
            {mode === "own" ? "Официальный плеер" : "Свой плеер"}
          </button>
          <TwitchLogin />
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Свой плеер берёт поток напрямую. Файл .ts скачивается, когда нажмёте «Остановить», а не в конце эфира.
          {sessionId ? " Чат этой сессии пишется." : " Чат виден сразу, в журнал попадёт после старта записи."}
        </p>
      </div>
    </div>
  );
}
