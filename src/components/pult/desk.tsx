import { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  Download,
  ExternalLink,
  Monitor,
  Plus,
  Radio,
  RefreshCw,
  Square,
  Sun,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { playbackUrl, stopRecorder, useCapture } from "@/components/pult/capture";
import { ChatPane, TwitchLive } from "@/components/pult/twitch-live";
import {
  armScreen,
  disarmScreen,
  downloadTakeFile,
  enableMonitor,
  manualStart,
  manualStop,
  submitChannel,
  useMonitor,
} from "@/components/pult/use-monitor";
import { cn } from "@/lib/cn";
import { chatBucket, downloadChatHtml, useChatLines } from "@/lib/streams/chat-log";
import { fileStamp, formatBytes, formatClock, formatDuration, formatViewers, slugName, viewersWord } from "@/lib/streams/format";
import { usePult, useToasts } from "@/lib/streams/store";
import { savePendingRecording, useAutoStreamRecord, useStreamRecord } from "@/lib/streams/auto-record";
import { useTwitchRecorders } from "@/lib/streams/twitch-chat";
import { PLATFORM_LABEL, type Channel, type Platform, type Session, type Snapshot } from "@/lib/streams/types";

const SUGGESTIONS: { platform: Platform; query: string; label: string }[] = [
  { platform: "youtube", query: "@LofiGirl", label: "Lofi Girl" },
  { platform: "twitch", query: "kaicenat", label: "KaiCenat" },
  { platform: "kick", query: "xqc", label: "xQc" },
];

export function Desk() {
  const channels = usePult((state) => state.channels);
  const snapshots = usePult((state) => state.snapshots);
  const sessions = usePult((state) => state.sessions);
  const takes = usePult((state) => state.takes);
  const settings = usePult((state) => state.settings);
  const selectedId = usePult((state) => state.selectedId);
  const toasts = useToasts((state) => state.items);
  const capture = useCapture();
  const { checking, nextAt } = useMonitor();
  useTwitchRecorders();
  useAutoStreamRecord();
  const fileJob = useStreamRecord((state) => state.job);
  const [now, setNow] = useState(() => Date.now());
  const [platform, setPlatform] = useState<Platform>("twitch");
  const [query, setQuery] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState("");
  const [marker, setMarker] = useState("");
  const [openJournal, setOpenJournal] = useState("");

  const selected = channels.find((channel) => channel.id === selectedId) ?? channels[0] ?? null;
  const selectedSnap = selected ? snapshots[selected.id] : undefined;
  const openSession = selected
    ? sessions.find((session) => session.channelId === selected.id && session.endedAt === null)
    : undefined;
  const liveCount = channels.filter((channel) => snapshots[channel.id]?.live).length;
  const anyRecording = sessions.some((session) => session.endedAt === null);
  const secondsLeft = nextAt ? Math.max(0, Math.ceil((nextAt - now) / 1000)) : 0;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.title = anyRecording
      ? "REC · Пульт"
      : liveCount
        ? `${liveCount} в эфире · Пульт`
        : "Пульт";
    const nav = navigator as Navigator & {
      setAppBadge?: (value: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (liveCount && nav.setAppBadge) void nav.setAppBadge(liveCount).catch(() => undefined);
    else if (nav.clearAppBadge) void nav.clearAppBadge().catch(() => undefined);
  }, [anyRecording, liveCount]);

  async function add(nextPlatform: Platform, raw: string) {
    setFormError("");
    setBusy(true);
    try {
      const error = await submitChannel(nextPlatform, raw);
      if (error) setFormError(error);
      else setQuery("");
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    usePult.getState().removeChannel(id);
    if (!usePult.getState().sessions.some((session) => session.endedAt === null)) stopRecorder();
    setConfirmId("");
  }

  function putMarker() {
    const note = marker.trim();
    if (!note || !openSession) return;
    usePult.getState().addMarker(openSession.id, note);
    setMarker("");
  }

  function exportJournal() {
    const state = usePult.getState();
    const blob = new Blob(
      [JSON.stringify({ channels: state.channels, sessions: state.sessions, takes: state.takes }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pult-zhurnal-${fileStamp()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 pb-28 sm:px-6">
      <header className="flex flex-col gap-5 border-b border-line pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs tracking-widest text-muted">TWITCH · KICK · YOUTUBE</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Пульт</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Следит за выбранными стримерами и сам открывает запись, когда начинается эфир.
              Вкладку можно свернуть — проверка и уведомление останутся.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LiveMeter count={liveCount} recording={anyRecording} />
            <button
              type="button"
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium",
                settings.monitor ? "bg-live text-bg" : "border border-line bg-surface text-fg",
              )}
              aria-pressed={settings.monitor}
              onClick={() => void enableMonitor(!settings.monitor)}
            >
              <Radio className="size-4" aria-hidden="true" />
              {settings.monitor ? "Монитор включён" : "Включить монитор"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IntervalPicker />
          <Toggle
            on={settings.sound}
            label={settings.sound ? "Звук старта" : "Без звука"}
            icon={settings.sound ? Volume2 : VolumeX}
            onClick={() => usePult.getState().setSettings({ sound: !settings.sound })}
          />
          <Toggle
            on={settings.notify}
            label={settings.notify ? "Уведомления" : "Без уведомлений"}
            icon={settings.notify ? Bell : BellOff}
            onClick={() => usePult.getState().setSettings({ notify: !settings.notify })}
          />
          <Toggle
            on={settings.wake}
            label="Не гасить экран"
            icon={Sun}
            onClick={() => usePult.getState().setSettings({ wake: !settings.wake })}
          />
          <Toggle
            on={settings.recordStream !== false}
            label={settings.recordStream !== false ? "Файл эфира" : "Без файла"}
            icon={Download}
            onClick={() =>
              usePult.getState().setSettings({ recordStream: settings.recordStream === false })
            }
          />
          <p className="font-mono text-xs text-muted" aria-live="polite">
            {checking
              ? "Проверяю эфиры…"
              : settings.monitor
                ? `Следующая проверка через ${secondsLeft} с`
                : "Монитор выключен — список не обновляется сам"}
            {fileJob ? ` · пишу ${fileJob.displayName} · ${formatBytes(fileJob.bytes)}` : ""}
          </p>
        </div>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section className="flex min-w-0 flex-col gap-4">
          <form
            className="rounded-lg border border-line bg-surface p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void add(platform, query);
            }}
          >
            <h2 className="font-mono text-xs tracking-widest text-muted">ДОБАВИТЬ</h2>
            <div className="mt-3 grid grid-cols-3 gap-2" role="tablist" aria-label="Площадка">
              {(["twitch", "kick", "youtube"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={platform === item}
                  className={cn(
                    "h-11 rounded-md text-sm",
                    platform === item ? "bg-fg text-bg" : "bg-surface-2 text-muted",
                  )}
                  onClick={() => setPlatform(item)}
                >
                  {PLATFORM_LABEL[item]}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Ник или ссылка</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void add(platform, query);
                    }
                  }}
                  placeholder={platform === "youtube" ? "@канал или ссылка" : "ник или ссылка"}
                  className="h-11 w-full rounded-md border border-line bg-bg px-3 text-base text-fg outline-none placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>
              <button
                type="button"
                disabled={busy}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-live px-3 text-sm font-medium text-bg disabled:opacity-40"
                onClick={() => void add(platform, query)}
              >
                <Plus className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{busy ? "Ищу…" : "Добавить"}</span>
              </button>
            </div>
            {formError ? <p className="mt-2 text-sm text-fg">{formError}</p> : null}
          </form>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-mono text-xs tracking-widest text-muted">СПИСОК</h2>
              <span className="font-mono text-xs text-muted">
                {String(channels.length).padStart(2, "0")}
              </span>
            </div>
            {channels.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line p-3">
                <p className="text-sm leading-relaxed text-muted">
                  Пока пусто. Добавьте канал — или начните с того, кто часто в эфире.
                </p>
                <div className="mt-3 grid gap-2">
                  {SUGGESTIONS.map((item) => (
                    <button
                      key={item.query}
                      type="button"
                      disabled={busy}
                      className="flex h-14 items-center justify-between rounded-md border border-line bg-surface px-3 text-left hover:bg-surface-2 disabled:opacity-40"
                      onClick={() => void add(item.platform, item.query)}
                    >
                      <span className="text-sm text-fg">{item.label}</span>
                      <span className="font-mono text-xs text-muted">{PLATFORM_LABEL[item.platform]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {channels.map((channel) => (
                  <ChannelRow
                    key={channel.id}
                    channel={channel}
                    snap={snapshots[channel.id]}
                    active={selected?.id === channel.id}
                    confirm={confirmId === channel.id}
                    recording={sessions.some(
                      (session) => session.channelId === channel.id && session.endedAt === null,
                    )}
                    onSelect={() => usePult.getState().select(channel.id)}
                    onToggleAuto={() => usePult.getState().toggleAuto(channel.id)}
                    onAskRemove={() => setConfirmId(channel.id)}
                    onCancelRemove={() => setConfirmId("")}
                    onRemove={() => remove(channel.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          <div
            className={cn(
              "overflow-hidden rounded-lg border bg-surface",
              anyRecording ? "border-live" : "border-line",
            )}
          >
            {selected ? (
              <Stage
                channel={selected}
                snap={selectedSnap}
                session={openSession}
                now={now}
                captureOn={capture.armed}
                captureRecording={capture.recording}
                captureBytes={capture.bytes}
                marker={marker}
                onMarker={setMarker}
                onPutMarker={putMarker}
              />
            ) : (
              <div className="flex aspect-video flex-col items-start justify-end p-5">
                <p className="font-mono text-xs tracking-widest text-muted">СЦЕНА</p>
                <p className="mt-2 max-w-md text-lg leading-snug text-fg">
                  Здесь появится плеер того, кого вы поставите на запись.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-line bg-surface p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-mono text-xs tracking-widest text-muted">ЖУРНАЛ</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="h-11 rounded-md border border-line px-3 text-sm text-fg hover:bg-surface-2"
                  onClick={exportJournal}
                >
                  Скачать журнал
                </button>
                <button
                  type="button"
                  className="h-11 rounded-md border border-line px-3 text-sm text-muted hover:bg-surface-2"
                  onClick={() => usePult.getState().clearFinished()}
                >
                  Убрать готовые
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Сессия пишет время, название, зрителей и чат Twitch. Файл эфира скачивается только после
              кнопки «Остановить». Вкладку до этого не закрывайте.
            </p>
            {sessions.length === 0 ? (
              <p className="mt-4 text-sm text-fg">Записей ещё нет.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {sessions.map((session) => (
                  <JournalRow
                    key={session.id}
                    session={session}
                    now={now}
                    open={openJournal === session.id}
                    take={takes.find((take) => take.id === session.takeId)}
                    liveBytes={capture.recording && capture.takeId === session.takeId ? capture.bytes : 0}
                    onToggle={() =>
                      setOpenJournal((current) => (current === session.id ? "" : session.id))
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <ToastView key={toast.id} id={toast.id} text={toast.text} />
        ))}
      </div>
    </main>
  );
}

function LiveMeter({ count, recording }: { count: number; recording: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2">
      <span
        className={cn("size-2.5 rounded-full", count || recording ? "bg-live rec-blink" : "bg-line")}
        aria-hidden="true"
      />
      <span className="font-mono text-xs text-fg">
        {recording ? "REC" : count ? `${String(count).padStart(2, "0")} В ЭФИРЕ` : "ТИХО"}
      </span>
    </div>
  );
}

function IntervalPicker() {
  const intervalSec = usePult((state) => state.settings.intervalSec);
  return (
    <div className="flex rounded-md border border-line p-1" role="group" aria-label="Частота проверки">
      {(
        [
          [30, "30 с"],
          [60, "60 с"],
          [120, "2 мин"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={intervalSec === value}
          className={cn(
            "h-9 rounded px-3 text-sm",
            intervalSec === value ? "bg-fg text-bg" : "text-muted",
          )}
          onClick={() => usePult.getState().setSettings({ intervalSec: value })}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  on,
  label,
  icon: Icon,
  onClick,
}: {
  on: boolean;
  label: string;
  icon: typeof Bell;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm",
        on ? "border-fg bg-surface text-fg" : "border-line bg-surface text-muted",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function ChannelRow({
  channel,
  snap,
  active,
  confirm,
  recording,
  onSelect,
  onToggleAuto,
  onAskRemove,
  onCancelRemove,
  onRemove,
}: {
  channel: Channel;
  snap: Snapshot | undefined;
  active: boolean;
  confirm: boolean;
  recording: boolean;
  onSelect: () => void;
  onToggleAuto: () => void;
  onAskRemove: () => void;
  onCancelRemove: () => void;
  onRemove: () => void;
}) {
  const status = !snap || snap.checkedAt === 0
    ? "ещё не проверяли"
    : snap.error
      ? `сбой · ${snap.error}`
      : snap.live
        ? snap.title || "в эфире"
        : "не в сети";

  return (
    <li
      className={cn(
        "rounded-lg border bg-surface",
        active ? "border-fg" : "border-line",
        snap?.live ? "border-l-4 border-l-live" : "border-l-4 border-l-transparent",
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <Avatar name={channel.displayName} url={channel.avatarUrl} />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium text-fg">{channel.displayName}</span>
              <span className="font-mono text-xs text-muted">{PLATFORM_LABEL[channel.platform]}</span>
              {recording ? <span className="font-mono text-xs text-fg">REC</span> : null}
            </span>
            <span className="mt-1 block truncate text-sm text-muted">{status}</span>
            {snap?.live && snap.viewers != null ? (
              <span className="mt-1 block font-mono text-xs text-muted">
                {formatViewers(snap.viewers)} зрит.
                {snap.category ? ` · ${snap.category}` : ""}
              </span>
            ) : snap?.live && snap.category ? (
              <span className="mt-1 block font-mono text-xs text-muted">{snap.category}</span>
            ) : null}
          </span>
        </button>
        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            aria-pressed={channel.auto}
            onClick={onToggleAuto}
            className={cn(
              "h-11 rounded-md px-3 text-sm",
              channel.auto ? "bg-fg text-bg" : "border border-line text-muted",
            )}
          >
            {channel.auto ? "Авто" : "Вручную"}
          </button>
          {confirm ? (
            <button type="button" onClick={onRemove} className="h-11 rounded-md bg-live px-3 text-sm text-bg">
              Убрать
            </button>
          ) : (
            <button
              type="button"
              aria-label={`Убрать ${channel.displayName}`}
              onClick={onAskRemove}
              className="inline-flex h-11 items-center justify-center rounded-md border border-line text-muted hover:text-fg"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          )}
          {confirm ? (
            <button type="button" onClick={onCancelRemove} className="text-xs text-muted">
              отмена
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function Avatar({ name, url }: { name: string; url: string }) {
  if (!url) {
    return (
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-sm text-fg">
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return <img src={url} alt="" className="size-11 shrink-0 rounded-full object-cover" />;
}

function Stage({
  channel,
  snap,
  session,
  now,
  captureOn,
  captureRecording,
  captureBytes,
  marker,
  onMarker,
  onPutMarker,
}: {
  channel: Channel;
  snap: Snapshot | undefined;
  session: Session | undefined;
  now: number;
  captureOn: boolean;
  captureRecording: boolean;
  captureBytes: number;
  marker: string;
  onMarker: (value: string) => void;
  onPutMarker: () => void;
}) {
  const live = !!snap?.live;
  const uptime = live && snap?.startedAt ? now - new Date(snap.startedAt).getTime() : 0;
  const fileJob = useStreamRecord((state) => state.job);
  const pendingKey = useStreamRecord((state) => state.pendingKey);
  const pendingBytes = useStreamRecord((state) => state.pendingBytes);
  const recordingFile = fileJob?.login === channel.key.toLowerCase();
  const fileWaiting = pendingKey === channel.key.toLowerCase() && pendingBytes > 0;

  return (
    <div>
      {channel.platform === "twitch" && live ? (
        <TwitchLive channel={channel} sessionId={session?.id} />
      ) : (
        <Player channel={channel} snap={snap} />
      )}
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted">{PLATFORM_LABEL[channel.platform]}</p>
            <h2 className="mt-1 text-xl font-medium leading-snug text-fg">{channel.displayName}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {live ? snap?.title || "В эфире" : snap?.error || "Сейчас не в сети"}
            </p>
          </div>
          {live ? (
            <div className="font-mono text-sm text-fg">
              {snap?.viewers != null ? <p>{formatViewers(snap.viewers)} {viewersWord(snap.viewers)}</p> : null}
              {uptime > 0 ? <p className="text-muted">эфир {formatDuration(uptime)}</p> : null}
              {snap?.category ? <p className="text-muted">{snap.category}</p> : null}
              {session ? (
                <p className="text-fg">ловим {formatDuration(now - session.startedAt)}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {live && !session ? (
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-live px-3 text-sm font-medium text-bg"
              onClick={() => manualStart(channel.id)}
            >
              <span className="size-2 rounded-full bg-bg" aria-hidden="true" />
              Начать запись
            </button>
          ) : null}
          {session || recordingFile ? (
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg"
              onClick={() => manualStop(channel.id)}
            >
              <Square className="size-4" aria-hidden="true" />
              {recordingFile ? "Остановить и скачать" : "Остановить"}
            </button>
          ) : fileWaiting ? (
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-fg px-3 text-sm font-medium text-bg"
              onClick={() => savePendingRecording()}
            >
              <Download className="size-4" aria-hidden="true" />
              Скачать запись · {formatBytes(pendingBytes)}
            </button>
          ) : null}
          {captureOn ? (
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg"
              onClick={() => disarmScreen()}
            >
              <Monitor className="size-4" aria-hidden="true" />
              {captureRecording ? `Пишу экран · ${formatBytes(captureBytes)}` : "Экран армирован"}
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg hover:bg-surface-2"
              onClick={() => void armScreen()}
            >
              <Monitor className="size-4" aria-hidden="true" />
              Армировать экран
            </button>
          )}
          {live && snap?.watchUrl ? (
            <a
              href={snap.watchUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg hover:bg-surface-2"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Открыть эфир
            </a>
          ) : channel.profileUrl ? (
            <a
              href={channel.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg hover:bg-surface-2"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Открыть канал
            </a>
          ) : null}
        </div>

        {session ? (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onPutMarker();
            }}
          >
            <label className="min-w-0 flex-1">
              <span className="sr-only">Метка</span>
              <input
                value={marker}
                onChange={(event) => onMarker(event.target.value)}
                placeholder="Метка — начало катки, смешной момент"
                className="h-11 w-full rounded-md border border-line bg-bg px-3 text-base text-fg outline-none placeholder:text-muted"
              />
            </label>
            <button type="submit" className="h-11 rounded-md bg-fg px-3 text-sm font-medium text-bg">
              Метка
            </button>
          </form>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            {channel.auto
              ? "Авто включено: как только канал станет онлайн, сессия откроется сама."
              : "Авто выключено — запись только кнопкой, когда канал в эфире."}
          </p>
        )}
        {snap?.checkedAt ? (
          <p className="inline-flex items-center gap-2 font-mono text-xs text-muted">
            <RefreshCw className="size-3" aria-hidden="true" />
            проверено {formatClock(new Date(snap.checkedAt).toISOString())}
          </p>
        ) : null}
      </div>
      {channel.platform === "twitch" && live ? (
        <ChatPane bucket={chatBucket(channel.id, session?.id)} title={channel.displayName} />
      ) : null}
    </div>
  );
}

function Player({
  channel,
  snap,
}: {
  channel: Channel;
  snap: Snapshot | undefined;
}) {
  if (!snap?.live) {
    return (
      <div className="flex aspect-video items-end bg-bg p-4">
        <p className="font-mono text-xs text-muted">ОФФЛАЙН</p>
      </div>
    );
  }
  if (channel.platform === "kick") {
    return (
      <iframe
        title={`Эфир ${channel.displayName}`}
        src={`https://player.kick.com/${encodeURIComponent(channel.key)}`}
        className="aspect-video w-full bg-bg"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }
  if (snap.videoId) {
    return (
      <iframe
        title={`Эфир ${channel.displayName}`}
        src={`https://www.youtube.com/embed/${encodeURIComponent(snap.videoId)}?autoplay=1&mute=1`}
        className="aspect-video w-full bg-bg"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
      />
    );
  }
  if (snap.thumbnailUrl) {
    return <img src={snap.thumbnailUrl} alt="" className="aspect-video w-full object-cover" />;
  }
  return <div className="aspect-video bg-bg" />;
}

function JournalRow({
  session,
  now,
  open,
  take,
  liveBytes,
  onToggle,
}: {
  session: Session;
  now: number;
  open: boolean;
  take: { id: string; endedAt: number | null; bytes: number | null; saved: boolean } | undefined;
  liveBytes: number;
  onToggle: () => void;
}) {
  const ended = session.endedAt ?? now;
  const url = session.takeId ? playbackUrl(session.takeId) : null;
  const points = session.samples
    .filter((sample) => sample.viewers != null)
    .map((sample) => ({
      viewers: sample.viewers,
      label: formatDuration(sample.t - session.startedAt),
    }));

  return (
    <li className="rounded-md border border-line">
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 p-3 text-left">
        <span className={cn("mt-1 size-2 shrink-0 rounded-full", session.endedAt ? "bg-line" : "bg-live rec-blink")} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium text-fg">{session.displayName}</span>
            <span className="font-mono text-xs text-muted">{PLATFORM_LABEL[session.platform]}</span>
            <span className="font-mono text-xs text-muted">{session.auto ? "авто" : "вручную"}</span>
          </span>
          <span className="mt-1 block truncate text-sm text-muted">{session.title || "без названия"}</span>
        </span>
        <span className="shrink-0 text-right font-mono text-xs text-fg">
          <span className="block">{formatDuration(ended - session.startedAt)}</span>
          <span className="text-muted">пик {formatViewers(session.peakViewers)}</span>
        </span>
      </button>
      {open ? (
        <div className="border-t border-line px-3 py-3">
          {session.streamStartedAt ? (
            <p className="text-sm text-muted">Эфир начался {formatClock(session.streamStartedAt)}</p>
          ) : null}
          {points.length > 1 ? (
            <div className="mt-3 h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points}>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface-2)",
                      border: "1px solid var(--color-line)",
                      borderRadius: 8,
                      color: "var(--color-fg)",
                    }}
                    formatter={(value) => [formatViewers(typeof value === "number" ? value : null), "зрители"]}
                  />
                  <Area
                    dataKey="viewers"
                    stroke="var(--color-fg)"
                    fill="var(--color-line)"
                    strokeWidth={1.5}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          {session.markers.length ? (
            <ul className="mt-3 flex flex-col gap-1">
              {session.markers.map((item) => (
                <li key={`${item.t}-${item.note}`} className="text-sm text-fg">
                  <span className="font-mono text-xs text-muted">
                    +{formatDuration(item.t - session.startedAt)}
                  </span>{" "}
                  {item.note}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Меток нет.</p>
          )}
          {url ? (
            <div className="mt-3">
              <video src={url} controls className="w-full rounded-md bg-bg" />
              <button
                type="button"
                className="mt-2 inline-flex h-11 items-center gap-2 rounded-md bg-fg px-3 text-sm font-medium text-bg"
                onClick={() =>
                  downloadTakeFile(
                    session.takeId || "",
                    `pult-${slugName(session.displayName)}-${fileStamp(new Date(session.startedAt))}.webm`,
                  )
                }
              >
                <Download className="size-4" aria-hidden="true" />
                Скачать WebM
                {take?.bytes ? ` · ${formatBytes(take.bytes)}` : ""}
              </button>
            </div>
          ) : liveBytes ? (
            <p className="mt-3 font-mono text-xs text-fg">Видео пишется · {formatBytes(liveBytes)}</p>
          ) : take && !take.endedAt ? (
            <p className="mt-3 text-sm text-muted">Видео ещё пишется.</p>
          ) : session.takeId ? (
            <p className="mt-3 text-sm text-muted">
              Видео было в этой сессии. После обновления страницы файл уже не восстановить — в следующий
              раз скачайте его сразу.
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">Видео с экрана не писалось.</p>
          )}
          <ChatDownload session={session} />
        </div>
      ) : null}
    </li>
  );
}

function ChatDownload({ session }: { session: Session }) {
  const lines = useChatLines(session.platform === "twitch" ? session.id : "");
  const [saving, setSaving] = useState(false);
  if (session.platform !== "twitch") return null;
  return (
    <button
      type="button"
      disabled={!lines.length || saving}
      className="mt-3 inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg disabled:text-muted"
      onClick={() => {
        setSaving(true);
        void downloadChatHtml(
          `pult-chat-${slugName(session.displayName)}-${fileStamp(new Date(session.startedAt))}.html`,
          `Чат · ${session.displayName}`,
          lines,
        ).finally(() => setSaving(false));
      }}
    >
      <Download className="size-4" aria-hidden="true" />
      {saving ? "Собираю чат" : `Скачать чат${lines.length ? ` · ${lines.length}` : ""}`}
    </button>
  );
}

function ToastView({ id, text }: { id: string; text: string }) {
  useEffect(() => {
    const timer = window.setTimeout(() => useToasts.getState().dismiss(id), 7000);
    return () => window.clearTimeout(timer);
  }, [id]);
  return (
    <div className="pointer-events-auto w-full max-w-md rounded-md border border-line bg-surface px-3 py-3 text-sm text-fg shadow-none">
      <div className="flex items-start justify-between gap-3">
        <p className="leading-relaxed">{text}</p>
        <button
          type="button"
          className="font-mono text-xs text-muted"
          onClick={() => useToasts.getState().dismiss(id)}
        >
          скрыть
        </button>
      </div>
    </div>
  );
}
