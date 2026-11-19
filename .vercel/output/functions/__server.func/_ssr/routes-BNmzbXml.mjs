import { i as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { n as normalizeTarget } from "./normalize-CTb0GLAl.mjs";
import { a as object, n as array, o as string, t as _enum } from "../_libs/zod.mjs";
import { a as Sun, c as Radio, d as LogOut, f as LogIn, g as BellOff, h as Bell, i as Trash2, l as Plus, m as Download, n as Volume2, o as Square, p as ExternalLink, s as RefreshCw, t as VolumeX, u as Monitor } from "../_libs/lucide-react.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { i as Tooltip, n as Area, r as ResponsiveContainer, t as AreaChart } from "../_libs/recharts+[...].mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BNmzbXml.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var useCapture = create(() => ({
	armed: false,
	recording: false,
	takeId: null,
	bytes: 0,
	error: ""
}));
var blobs = /* @__PURE__ */ new Map();
var urls = /* @__PURE__ */ new Map();
var stream = null;
var recorder = null;
var chunks = [];
var shareEnded = null;
var onDone = null;
function preferredMime() {
	if (typeof MediaRecorder === "undefined") return "video/webm";
	if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) return "video/webm;codecs=vp9,opus";
	if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) return "video/webm;codecs=vp8,opus";
	return "video/webm";
}
function captureArmed() {
	return !!stream && stream.getVideoTracks().some((track) => track.readyState === "live");
}
function isRecording() {
	return !!recorder && recorder.state === "recording";
}
function playbackUrl(id) {
	const existing = urls.get(id);
	if (existing) return existing;
	const blob = blobs.get(id);
	if (!blob) return null;
	const url = URL.createObjectURL(blob);
	urls.set(id, url);
	return url;
}
function putBlob(id, blob) {
	blobs.set(id, blob);
	const prev = urls.get(id);
	if (prev) URL.revokeObjectURL(prev);
	urls.set(id, URL.createObjectURL(blob));
}
function releaseStream() {
	stream?.getTracks().forEach((track) => track.stop());
	stream = null;
}
async function armCapture(onShareEnded) {
	if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("unsupported");
	shareEnded = onShareEnded;
	let next;
	try {
		next = await navigator.mediaDevices.getDisplayMedia({
			video: { frameRate: 30 },
			audio: true
		});
	} catch (error) {
		if ((error instanceof Error ? error.name : "") === "NotAllowedError") throw error;
		next = await navigator.mediaDevices.getDisplayMedia({ video: true });
	}
	releaseStream();
	stream = next;
	next.getVideoTracks()[0]?.addEventListener("ended", () => {
		if (recorder && recorder.state === "recording") recorder.stop();
		else {
			releaseStream();
			shareEnded?.();
		}
	});
}
function startRecorder(mime, done) {
	if (!stream) throw new Error("no-stream");
	if (recorder && recorder.state === "recording") return;
	chunks = [];
	onDone = done;
	const rec = new MediaRecorder(stream, { mimeType: mime });
	recorder = rec;
	let bytes = 0;
	rec.ondataavailable = (event) => {
		if (!event.data.size) return;
		chunks.push(event.data);
		bytes += event.data.size;
		useCapture.setState({ bytes });
	};
	rec.onstop = () => {
		const blob = new Blob(chunks, { type: rec.mimeType || mime });
		chunks = [];
		recorder = null;
		const finish = onDone;
		onDone = null;
		if (blob.size) finish?.(blob);
		if (!captureArmed()) shareEnded?.();
	};
	rec.start(2e3);
}
function stopRecorder() {
	if (recorder && recorder.state === "recording") recorder.stop();
}
function disarmCapture() {
	if (recorder && recorder.state === "recording") recorder.stop();
	releaseStream();
	shareEnded?.();
	shareEnded = null;
}
var logs = /* @__PURE__ */ new Map();
var listeners = /* @__PURE__ */ new Set();
var MAX_LINES = 4e3;
function chatBucket(channelId, sessionId) {
	return sessionId || `preview:${channelId}`;
}
function getChat(bucket) {
	return logs.get(bucket) ?? [];
}
function appendChat(bucket, line) {
	const prev = logs.get(bucket) ?? [];
	if (prev.some((item) => item.id === line.id)) return;
	const next = prev.length >= MAX_LINES ? prev.slice(prev.length - MAX_LINES + 1) : prev.slice();
	next.push(line);
	logs.set(bucket, next);
	for (const listener of listeners) listener();
}
function useChatLines(bucket) {
	const [version, setVersion] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		const listener = () => setVersion((value) => value + 1);
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}, []);
	return getChat(bucket);
}
function escapeHtml(value) {
	return value.replace(/[&<>"]/g, (char) => {
		if (char === "&") return "&amp;";
		if (char === "<") return "&lt;";
		if (char === ">") return "&gt;";
		return "&quot;";
	});
}
async function embedImages(lines) {
	const urls = /* @__PURE__ */ new Set();
	for (const line of lines) for (const part of line.parts) if (part.kind === "image") urls.add(part.url);
	const out = /* @__PURE__ */ new Map();
	const queue = [...urls];
	async function worker() {
		while (queue.length) {
			const url = queue.pop();
			if (!url) return;
			try {
				const res = await fetch(url);
				if (!res.ok) continue;
				if (!(res.headers.get("content-type") || "").startsWith("image/")) continue;
				const blob = await res.blob();
				if (blob.size > 2e6) continue;
				const data = await new Promise((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = () => resolve(String(reader.result || ""));
					reader.onerror = () => reject(/* @__PURE__ */ new Error("read"));
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
async function downloadChatHtml(filename, title, lines) {
	const images = await embedImages(lines);
	const rows = lines.map((line) => {
		const time = new Date(line.t).toLocaleTimeString("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit"
		});
		const color = /^#[0-9a-fA-F]{6}$/.test(line.color) ? line.color : "#f3efe2";
		const body = line.parts.map((part) => {
			if (part.kind === "text") return escapeHtml(part.text);
			return `<img src="${escapeHtml(images.get(part.url) || part.url)}" alt="${escapeHtml(part.alt)}" />`;
		}).join("");
		return `<p><time>${time}</time> <b style="color:${color}">${escapeHtml(line.author)}</b> ${body}</p>`;
	}).join("\n");
	const html = `<!doctype html><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{margin:0;background:#12130f;color:#f3efe2;font:15px/1.45 "IBM Plex Sans",sans-serif}main{max-width:760px;margin:0 auto;padding:24px}h1{font-size:20px}p{margin:0 0 8px}time{font:12px ui-monospace,monospace;color:#a39e8c;margin-right:6px}img{height:28px;vertical-align:middle;margin:0 2px}b{font-weight:600}</style><main><h1>${escapeHtml(title)}</h1>${rows}</main>`;
	const blob = new Blob([html], { type: "text/html;charset=utf-8" });
	const href = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = href;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(href), 4e3);
}
function formatDuration(ms) {
	const total = Math.max(0, Math.floor(ms / 1e3));
	const h = Math.floor(total / 3600);
	const m = Math.floor(total % 3600 / 60);
	const s = total % 60;
	const pad = (n) => String(n).padStart(2, "0");
	if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
	return `${m}:${pad(s)}`;
}
function formatViewers(n) {
	if (n == null) return "—";
	return new Intl.NumberFormat("ru-RU").format(n);
}
function viewersWord(n) {
	const abs = Math.abs(n) % 100;
	const last = abs % 10;
	if (abs > 10 && abs < 20) return "зрителей";
	if (last === 1) return "зритель";
	if (last >= 2 && last <= 4) return "зрителя";
	return "зрителей";
}
function formatBytes(n) {
	if (n < 1024) return `${n} Б`;
	if (n < 1048576) return `${(n / 1024).toFixed(0)} КБ`;
	if (n < 1073741824) return `${(n / 1048576).toFixed(1)} МБ`;
	return `${(n / 1073741824).toFixed(2)} ГБ`;
}
function fileStamp(d = /* @__PURE__ */ new Date()) {
	const p = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
function slugName(value) {
	return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40) || "efir";
}
function formatClock(iso) {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
		day: "numeric",
		month: "short"
	}).format(date);
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var loginSchema = string().regex(/^[a-z0-9_]{2,25}$/i);
var clientSchema = string().regex(/^[a-z0-9]{20,50}$/i);
var qualitySchema = _enum([
	"160",
	"360",
	"480",
	"720",
	"1080"
]);
var resolveTwitchPlayback = createServerFn({ method: "POST" }).validator((input) => object({
	login: loginSchema,
	quality: qualitySchema,
	clientId: clientSchema.optional(),
	token: string().min(10).max(512).optional()
}).parse(input)).handler(createSsrRpc("27aac043a882ed03462398bb026efbea33be0eaa46ee060702975ce5ff4e12af"));
var startTwitchDevice = createServerFn({ method: "POST" }).validator((input) => object({ clientId: clientSchema }).parse(input)).handler(createSsrRpc("e8e546419ec19c531db61a94335e36f631d28730d89a1b78b6371983a1427714"));
var pollTwitchDevice = createServerFn({ method: "POST" }).validator((input) => object({
	clientId: clientSchema,
	deviceCode: string().min(8).max(512)
}).parse(input)).handler(createSsrRpc("b68944cbc0d62e65aba570036dff6cc518b8a87872c369aaec6cf7435873d152"));
var refreshTwitchToken = createServerFn({ method: "POST" }).validator((input) => object({
	clientId: clientSchema,
	refreshToken: string().min(8).max(512)
}).parse(input)).handler(createSsrRpc("7f5f2ddf32825b1c3f9b35a7c6a7a8d6cdca6de4e96b667d065813807fa9129e"));
var validateTwitchToken = createServerFn({ method: "POST" }).validator((input) => object({ token: string().min(10).max(512) }).parse(input)).handler(createSsrRpc("cd007a89114f7efbfd0e75082b75371289f151aea4b41b519dd489b69d48fd29"));
var twitchEmotes = createServerFn({ method: "POST" }).validator((input) => object({ login: loginSchema }).parse(input)).handler(createSsrRpc("0f016e90d37a30449abdb56f15e68d1d6c28ba6ad53a2291adf980129d176d91"));
var CLIENT_KEY = "pult-twitch-client";
var AUTH_KEY = "pult-twitch-auth";
var useTwitchAuth = create((set) => ({
	clientId: "",
	auth: null,
	ready: false,
	setClientId: (clientId) => {
		try {
			localStorage.setItem(CLIENT_KEY, clientId.trim());
		} catch {}
		set({ clientId: clientId.trim() });
	},
	setAuth: (auth) => {
		try {
			if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
			else localStorage.removeItem(AUTH_KEY);
		} catch {}
		set({ auth });
	}
}));
function hydrateTwitchAuth() {
	if (useTwitchAuth.getState().ready || typeof localStorage === "undefined") return;
	let clientId = "";
	let auth = null;
	try {
		clientId = localStorage.getItem(CLIENT_KEY) || "";
		const raw = localStorage.getItem(AUTH_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (parsed?.accessToken && parsed.clientId) auth = parsed;
		}
	} catch {
		auth = null;
	}
	useTwitchAuth.setState({
		clientId,
		auth,
		ready: true
	});
}
async function currentTwitchCredential() {
	const auth = useTwitchAuth.getState().auth;
	if (!auth?.accessToken || !auth.clientId) return {};
	if (auth.expiresAt - Date.now() > 6e4) return {
		clientId: auth.clientId,
		token: auth.accessToken
	};
	if (!auth.refreshToken) return {
		clientId: auth.clientId,
		token: auth.accessToken
	};
	const next = await refreshTwitchToken({ data: {
		clientId: auth.clientId,
		refreshToken: auth.refreshToken
	} });
	if (!next.ok) {
		useTwitchAuth.getState().setAuth(null);
		return {};
	}
	const updated = {
		...auth,
		accessToken: next.accessToken,
		refreshToken: next.refreshToken,
		expiresAt: Date.now() + next.expiresIn * 1e3
	};
	useTwitchAuth.getState().setAuth(updated);
	return {
		clientId: updated.clientId,
		token: updated.accessToken
	};
}
var HOSTS = [".ttvnw.net", ".live-video.net"];
function isStreamHost(url) {
	try {
		const host = new URL(url).hostname;
		return HOSTS.some((suffix) => host.endsWith(suffix));
	} catch {
		return false;
	}
}
function proxied(url) {
	if (!isStreamHost(url) || typeof window === "undefined") return url;
	return `${/^\/hds-[a-z0-9]+-\d+-[a-z0-9]+(?=\/|$)/i.exec(window.location.pathname)?.[0] ?? ""}/api/media?u=${encodeURIComponent(url)}`;
}
function downloadBlob(filename, chunks) {
	const blob = new Blob(chunks.map((chunk) => chunk.slice()), { type: "video/mp2t" });
	const href = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = href;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(href), 8e3);
}
async function fileSink(filename) {
	const picker = window.showSaveFilePicker;
	if (!picker) return null;
	try {
		const writable = await (await picker({
			suggestedName: filename,
			types: [{
				description: "Поток MPEG-TS",
				accept: { "video/mp2t": [".ts"] }
			}]
		})).createWritable();
		return {
			write: (chunk) => writable.write(chunk),
			close: () => writable.close()
		};
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") return "cancel";
		return null;
	}
}
function memorySink(baseName) {
	let chunks = [];
	let size = 0;
	let part = 1;
	const sink = {
		parts: 1,
		write: async (chunk) => {
			chunks.push(chunk);
			size += chunk.byteLength;
			if (size >= PART_BYTES) {
				downloadBlob(baseName.replace(/\.ts$/, "") + `-${part}.ts`, chunks);
				part += 1;
				sink.parts = part;
				chunks = [];
				size = 0;
			}
		},
		close: async () => {
			if (size > 0) downloadBlob(baseName.replace(/\.ts$/, "") + (part > 1 ? `-${part}.ts` : ".ts"), chunks);
		}
	};
	return sink;
}
function resolveRef(base, ref) {
	if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;
	return new URL(ref, base).toString();
}
var PART_BYTES = 209715200;
async function readPlaylist(url, depth = 0) {
	const res = await fetch(proxied(url));
	if (!res.ok) throw new Error("Плейлист Twitch недоступен");
	const text = await res.text();
	if (depth < 2 && text.includes("#EXT-X-STREAM-INF")) {
		const next = text.split("\n").find((line) => line.startsWith("http"));
		if (!next) throw new Error("В плейлисте нет видео");
		return readPlaylist(resolveRef(url, next), depth + 1);
	}
	return {
		text,
		base: url
	};
}
function segmentUrls(text, base) {
	let map = "";
	const segments = [];
	const lines = text.split("\n");
	for (const raw of lines) {
		const line = raw.trim();
		if (line.startsWith("#EXT-X-MAP:")) {
			const uri = line.match(/URI="([^"]+)"/);
			if (uri?.[1]) map = resolveRef(base, uri[1]);
		} else if (line.startsWith("#EXT-X-TWITCH-PREFETCH:")) {
			const uri = line.slice(23).trim();
			if (uri) segments.push(resolveRef(base, uri));
		} else if (line && !line.startsWith("#")) segments.push(resolveRef(base, line));
	}
	return {
		map,
		segments
	};
}
async function grabTwitchStream(playlistUrl, filename, signal, onBytes) {
	const picked = await fileSink(filename);
	if (picked === "cancel" || signal.aborted) return;
	const sink = picked ?? memorySink(filename);
	const seen = /* @__PURE__ */ new Set();
	let mapWritten = false;
	let bytes = 0;
	try {
		while (!signal.aborted) {
			const playlist = await readPlaylist(playlistUrl);
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
			if (seen.size > 6e3) for (const url of [...seen].slice(0, 2e3)) seen.delete(url);
			await new Promise((resolve, reject) => {
				const timer = window.setTimeout(resolve, 2e3);
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
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var QUALITIES = [
	{
		id: "1080",
		label: "1080p"
	},
	{
		id: "720",
		label: "720p"
	},
	{
		id: "480",
		label: "480p"
	},
	{
		id: "360",
		label: "360p"
	}
];
function parentsOfThisPage() {
	const hosts = /* @__PURE__ */ new Set();
	const add = (host) => {
		const clean = host.trim().toLowerCase();
		if (!clean || clean.includes(":") || clean.includes("/")) return;
		hosts.add(clean);
	};
	add(window.location.hostname);
	if (window.location.hostname === "127.0.0.1") hosts.add("localhost");
	try {
		if (document.referrer) add(new URL(document.referrer).hostname);
	} catch {}
	const ancestors = window.location.ancestorOrigins;
	if (ancestors) for (const origin of ancestors) try {
		add(new URL(origin).hostname);
	} catch {}
	return [...hosts];
}
function ChatImage({ part }) {
	const [src, setSrc] = (0, import_react.useState)(part.url);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src,
		alt: part.alt,
		loading: "lazy",
		className: cn("mx-0.5 inline-block max-w-32 object-contain align-middle", part.animated ? "h-8" : "h-6"),
		onError: () => {
			if (part.fallback && src !== part.fallback) setSrc(part.fallback);
		}
	});
}
function ChatPane({ bucket, title }) {
	const lines = useChatLines(bucket);
	const scroller = (0, import_react.useRef)(null);
	const stick = (0, import_react.useRef)(true);
	const [saving, setSaving] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const el = scroller.current;
		if (!el || !stick.current) return;
		el.scrollTop = el.scrollHeight;
	}, [lines.length]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border-t border-line",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3 px-4 py-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "font-mono text-xs tracking-widest text-muted",
				children: ["ЧАТ · ", lines.length]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				disabled: !lines.length || saving,
				className: "inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg disabled:text-muted",
				onClick: () => {
					setSaving(true);
					downloadChatHtml(`pult-chat-${slugName(title)}-${fileStamp(/* @__PURE__ */ new Date())}.html`, `Чат · ${title}`, lines).finally(() => setSaving(false));
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
					className: "size-4",
					"aria-hidden": "true"
				}), saving ? "Собираю" : "Скачать чат"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref: scroller,
			className: "h-72 overflow-y-auto px-4 pb-3",
			onScroll: (event) => {
				const el = event.currentTarget;
				stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
			},
			children: lines.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Сообщений пока нет. Картинки и GIF появятся прямо в строке."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "flex flex-col gap-1.5",
				children: lines.slice(-300).map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "text-sm leading-relaxed break-words text-fg",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mr-2 font-mono text-xs text-muted",
							children: new Date(line.t).toLocaleTimeString("ru-RU", {
								hour: "2-digit",
								minute: "2-digit",
								second: "2-digit"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mr-1 font-medium",
							style: { color: line.color },
							children: line.author
						}),
						line.parts.map((part, index) => part.kind === "text" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: part.text }, `${line.id}-${index}`) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatImage, { part }, `${line.id}-${index}`))
					]
				}, line.id))
			})
		})]
	});
}
function TwitchLogin() {
	const clientId = useTwitchAuth((state) => state.clientId);
	const auth = useTwitchAuth((state) => state.auth);
	const setClientId = useTwitchAuth((state) => state.setClientId);
	const setAuth = useTwitchAuth((state) => state.setAuth);
	const [open, setOpen] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [code, setCode] = (0, import_react.useState)("");
	const [link, setLink] = (0, import_react.useState)("");
	const [waiting, setWaiting] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const alive = (0, import_react.useRef)(true);
	(0, import_react.useEffect)(() => {
		alive.current = true;
		hydrateTwitchAuth();
		return () => {
			alive.current = false;
		};
	}, []);
	(0, import_react.useEffect)(() => setDraft(clientId), [clientId]);
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
		const deadline = Date.now() + started.expiresIn * 1e3;
		const interval = Math.max(5, started.interval) * 1e3;
		while (alive.current && Date.now() < deadline) {
			await new Promise((resolve) => window.setTimeout(resolve, interval));
			if (!alive.current) return;
			const polled = await pollTwitchDevice({ data: {
				clientId: id,
				deviceCode: started.deviceCode
			} });
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
				expiresAt: Date.now() + polled.expiresIn * 1e3,
				login: who.ok ? who.login : "twitch",
				scopes: who.ok && who.scopes.length ? who.scopes : polled.scopes
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
	if (auth) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		className: "inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg",
		onClick: () => setAuth(null),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, {
			className: "size-4",
			"aria-hidden": "true"
		}), auth.login]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col items-start gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg",
			onClick: () => setOpen((value) => !value),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogIn, {
				className: "size-4",
				"aria-hidden": "true"
			}), "Войти в Twitch"]
		}), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-md rounded-md border border-line bg-bg p-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm leading-relaxed text-muted",
					children: [
						"Создайте публичное приложение на",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "text-fg underline",
							href: "https://dev.twitch.tv/console/apps",
							target: "_blank",
							rel: "noreferrer",
							children: "dev.twitch.tv"
						}),
						". Redirect можно поставить http://localhost. Секрет не нужен — только Client ID."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-3 block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "sr-only",
						children: "Client ID"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: draft,
						onChange: (event) => setDraft(event.target.value),
						placeholder: "Client ID",
						spellCheck: false,
						className: "h-11 w-full rounded-md border border-line bg-surface px-3 font-mono text-sm text-fg outline-none"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: waiting,
					className: "mt-2 h-11 rounded-md bg-fg px-3 text-sm font-medium text-bg disabled:opacity-60",
					onClick: () => void begin(),
					children: waiting ? "Жду подтверждение" : "Получить код"
				}),
				code ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 text-sm text-fg",
					children: [
						"Код ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-base",
							children: code
						}),
						link ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [" ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "underline",
							href: link,
							target: "_blank",
							rel: "noreferrer",
							children: "открыть Twitch"
						})] }) : null
					]
				}) : null,
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-live",
					children: error
				}) : null
			]
		}) : null]
	});
}
function TwitchLive({ channel, sessionId }) {
	const videoRef = (0, import_react.useRef)(null);
	const grabAbort = (0, import_react.useRef)(null);
	const authLogin = useTwitchAuth((state) => state.auth?.login || "");
	const [mode, setMode] = (0, import_react.useState)("own");
	const [quality, setQuality] = (0, import_react.useState)("720");
	const [status, setStatus] = (0, import_react.useState)("");
	const [grabbing, setGrabbing] = (0, import_react.useState)(false);
	const [grabBytes, setGrabBytes] = (0, import_react.useState)(0);
	const [parents, setParents] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		hydrateTwitchAuth();
		setParents(parentsOfThisPage());
	}, []);
	(0, import_react.useEffect)(() => {
		const video = videoRef.current;
		if (!video || mode !== "own") return;
		let dead = false;
		let player = null;
		setStatus("Подключаю поток…");
		(async () => {
			const cred = await currentTwitchCredential();
			const result = await resolveTwitchPlayback({ data: {
				login: channel.key,
				quality,
				clientId: cred.clientId,
				token: cred.token
			} });
			if (dead) return;
			if (!result.ok) {
				setStatus(result.error);
				return;
			}
			setStatus("");
			const mod = await import("../_libs/hls.js.mjs").then((n) => n.t);
			if (dead) return;
			const Hls = mod.default;
			if (Hls.isSupported()) {
				const Base = Hls.DefaultConfig.loader;
				class ProxyLoader extends Base {
					load(context, config, callbacks) {
						if (context.url) context.url = proxied(context.url);
						super.load(context, config, callbacks);
					}
				}
				const hls = new Hls({
					enableWorker: false,
					backBufferLength: 30,
					loader: ProxyLoader
				});
				player = hls;
				hls.attachMedia(video);
				hls.loadSource(result.url);
				hls.on(Hls.Events.ERROR, (_event, data) => {
					if (data.fatal) setStatus("Поток оборвался. Попробуйте официальный плеер или другое качество.");
				});
				video.play().catch(() => void 0);
				return;
			}
			if (video.canPlayType("application/vnd.apple.mpegurl")) {
				video.src = result.url;
				video.play().catch(() => void 0);
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
	}, [
		channel.key,
		quality,
		mode,
		authLogin
	]);
	(0, import_react.useEffect)(() => () => grabAbort.current?.abort(), []);
	async function toggleGrab() {
		if (grabbing) {
			grabAbort.current?.abort();
			return;
		}
		setStatus("");
		const cred = await currentTwitchCredential();
		const result = await resolveTwitchPlayback({ data: {
			login: channel.key,
			quality,
			clientId: cred.clientId,
			token: cred.token
		} });
		if (!result.ok) {
			setStatus(result.error);
			return;
		}
		const ctrl = new AbortController();
		grabAbort.current = ctrl;
		setGrabbing(true);
		setGrabBytes(0);
		const name = `pult-${slugName(channel.displayName)}-${fileStamp(/* @__PURE__ */ new Date())}.ts`;
		try {
			await grabTwitchStream(result.url, name, ctrl.signal, setGrabBytes);
		} catch {
			if (!ctrl.signal.aborted) setStatus("Не удалось сохранить поток.");
		} finally {
			setGrabbing(false);
		}
	}
	const embedSrc = parents.length > 0 ? `https://player.twitch.tv/?channel=${encodeURIComponent(channel.key)}&muted=true&autoplay=true${parents.map((parent) => `&parent=${encodeURIComponent(parent)}`).join("")}` : "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [mode === "own" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative bg-bg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
			ref: videoRef,
			className: "aspect-video w-full bg-bg",
			controls: true,
			muted: true,
			autoPlay: true,
			playsInline: true
		}), status ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "absolute inset-x-0 bottom-12 px-4 text-sm text-fg",
			children: status
		}) : null]
	}) : embedSrc ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
		title: `Эфир ${channel.displayName}`,
		src: embedSrc,
		className: "aspect-video w-full bg-bg",
		allow: "autoplay; fullscreen; picture-in-picture",
		allowFullScreen: true
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "aspect-video bg-bg" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-3 border-t border-line p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted",
						children: "Качество"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: quality,
						onChange: (event) => setQuality(event.target.value),
						className: "bg-transparent text-fg outline-none",
						children: QUALITIES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: item.id,
							children: item.label
						}, item.id))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: cn("inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium", grabbing ? "bg-live text-bg" : "border border-line text-fg"),
					onClick: () => void toggleGrab(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
						className: "size-4",
						"aria-hidden": "true"
					}), grabbing ? `Стоп · ${formatBytes(grabBytes)}` : "Скачать поток"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "inline-flex h-11 items-center rounded-md border border-line px-3 text-sm text-fg",
					onClick: () => setMode((value) => value === "own" ? "embed" : "own"),
					children: mode === "own" ? "Официальный плеер" : "Свой плеер"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TwitchLogin, {})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-sm leading-relaxed text-muted",
			children: ["Свой плеер берёт поток напрямую, поэтому картинка есть даже внутри чужого окна. Вход через код Twitch нужен для чата подписчиков и закрытых эфиров. Файл .ts открывается в VLC.", sessionId ? " Чат этой сессии пишется." : " Чат виден сразу, в журнал попадёт после старта записи."]
		})]
	})] });
}
var schema = object({ items: array(object({
	platform: _enum([
		"twitch",
		"kick",
		"youtube"
	]),
	key: string().min(1).max(80),
	videoId: string().max(20).optional()
})).min(1).max(12) });
var checkStreams = createServerFn({ method: "POST" }).validator((input) => schema.parse(input)).handler(createSsrRpc("247fed45e4fa985e40aeb41de7a44a620c4f1f8ab343664957783ae72193208e"));
function emptySnapshot() {
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
		error: ""
	};
}
function snapshotFromResult(result, now) {
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
		error: ""
	};
}
function createSession(channel, snap, auto, now) {
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
		samples: snap.viewers == null ? [] : [{
			t: now,
			viewers: snap.viewers
		}],
		markers: [],
		takeId: null
	};
}
function peak(prev, next) {
	if (next == null) return prev;
	if (prev == null) return next;
	return Math.max(prev, next);
}
function pushSample(samples, sample) {
	const next = [...samples, sample];
	if (next.length <= 200) return next;
	return next.slice(next.length - 200);
}
function capSessions(list) {
	if (list.length <= 50) return list;
	const open = list.filter((item) => item.endedAt === null);
	const closed = list.filter((item) => item.endedAt !== null);
	return [...open, ...closed].slice(0, 50);
}
function reducePoll(input) {
	const snapshots = { ...input.snapshots };
	let sessions = input.sessions.slice();
	let takes = input.takes;
	let channels = input.channels;
	const toasts = [];
	const notifies = [];
	let sound = false;
	const summary = [];
	const openedIds = [];
	const channelByKey = new Map(channels.map((channel) => [`${channel.platform}:${channel.key}`, channel]));
	for (const result of input.results) {
		const channel = channelByKey.get(`${result.platform}:${result.queryKey}`);
		if (!channel) continue;
		if (!result.ok) {
			const prev = snapshots[channel.id] ?? emptySnapshot();
			snapshots[channel.id] = {
				...prev,
				checkedAt: input.now,
				error: result.error || "Сбой проверки"
			};
			continue;
		}
		if (result.found) channels = channels.map((item) => item.id === channel.id ? {
			...item,
			displayName: result.displayName || item.displayName,
			avatarUrl: result.avatarUrl || item.avatarUrl,
			profileUrl: result.profileUrl || item.profileUrl
		} : item);
		const prev = snapshots[channel.id] ?? emptySnapshot();
		const snap = result.found ? snapshotFromResult(result, input.now) : {
			...prev,
			live: false,
			checkedAt: input.now,
			error: "Канал не найден"
		};
		snapshots[channel.id] = snap;
		const openIndex = sessions.findIndex((session) => session.channelId === channel.id && session.endedAt === null);
		if (snap.live && openIndex >= 0) {
			const open = sessions[openIndex];
			if (!open) continue;
			const fresh = {
				...open,
				title: snap.title || open.title,
				category: snap.category || open.category,
				displayName: result.displayName || channel.displayName,
				peakViewers: peak(open.peakViewers, snap.viewers),
				samples: pushSample(open.samples, {
					t: input.now,
					viewers: snap.viewers
				})
			};
			sessions = sessions.map((session, index) => index === openIndex ? fresh : session);
			continue;
		}
		if (input.auto && channel.auto && snap.live && openIndex < 0) {
			if (!sessions.some((session) => session.channelId === channel.id && session.streamId !== "" && session.streamId === snap.streamId)) {
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
						icon: channel.avatarUrl
					});
				} else summary.push(channel.displayName);
			}
			continue;
		}
		if (openIndex >= 0 && !snap.live) {
			sessions = sessions.map((session, index) => index === openIndex ? {
				...session,
				endedAt: input.now
			} : session);
			if (input.primed) toasts.push(`${channel.displayName} закончил эфир. Запись закрыта.`);
		}
	}
	if (!input.primed && summary.length) toasts.push(`Сейчас в эфире: ${summary.join(", ")}. Журнал уже пишется.`);
	const openSessions = sessions.filter((session) => session.endedAt === null);
	let beginVideo = false;
	let stopVideo = false;
	let videoSessionIds = [];
	if (input.videoTakeId) {
		const takeId = input.videoTakeId;
		if (openSessions.length === 0) stopVideo = true;
		else {
			const ids = openSessions.map((session) => session.id);
			takes = takes.map((take) => take.id === takeId ? {
				...take,
				sessionIds: Array.from(/* @__PURE__ */ new Set([...take.sessionIds, ...ids]))
			} : take);
			sessions = sessions.map((session) => session.endedAt === null && !session.takeId ? {
				...session,
				takeId
			} : session);
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
		videoSessionIds
	};
}
var DEFAULT_SETTINGS = {
	monitor: false,
	intervalSec: 60,
	sound: true,
	notify: true,
	wake: false
};
var usePult = create()(persist((set) => ({
	channels: [],
	snapshots: {},
	sessions: [],
	takes: [],
	settings: DEFAULT_SETTINGS,
	selectedId: "",
	setSettings: (patch) => set((state) => ({ settings: {
		...state.settings,
		...patch
	} })),
	addChannel: (channel) => set((state) => {
		const duplicate = state.channels.find((item) => item.platform === channel.platform && item.key === channel.key);
		if (duplicate) return { selectedId: duplicate.id };
		return {
			channels: [channel, ...state.channels].slice(0, 12),
			selectedId: channel.id
		};
	}),
	removeChannel: (id) => set((state) => {
		const snapshots = { ...state.snapshots };
		delete snapshots[id];
		const channels = state.channels.filter((item) => item.id !== id);
		return {
			channels,
			snapshots,
			selectedId: state.selectedId === id ? channels[0]?.id ?? "" : state.selectedId,
			sessions: state.sessions.map((session) => session.channelId === id && session.endedAt === null ? {
				...session,
				endedAt: Date.now()
			} : session)
		};
	}),
	toggleAuto: (id) => set((state) => ({ channels: state.channels.map((item) => item.id === id ? {
		...item,
		auto: !item.auto
	} : item) })),
	select: (id) => set({ selectedId: id }),
	addMarker: (sessionId, note) => set((state) => ({ sessions: state.sessions.map((session) => session.id === sessionId ? {
		...session,
		markers: [...session.markers, {
			t: Date.now(),
			note
		}].slice(-80)
	} : session) })),
	markTakeSaved: (takeId) => set((state) => ({ takes: state.takes.map((take) => take.id === takeId ? {
		...take,
		saved: true
	} : take) })),
	clearFinished: () => set((state) => ({
		sessions: state.sessions.filter((session) => session.endedAt === null),
		takes: state.takes.filter((take) => take.endedAt === null)
	}))
}), {
	name: "pult-v1",
	skipHydration: true,
	partialize: (state) => ({
		channels: state.channels,
		sessions: state.sessions,
		takes: state.takes,
		settings: state.settings,
		selectedId: state.selectedId
	})
}));
var useToasts = create((set) => ({
	items: [],
	push: (texts) => set((state) => ({ items: [...texts.filter(Boolean).map((text) => ({
		id: crypto.randomUUID(),
		text
	})), ...state.items].slice(0, 4) })),
	dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
}));
var primed = false;
var chain = Promise.resolve();
var audio = null;
function enqueue(task) {
	const run = chain.then(task, task);
	chain = run.then(() => void 0, () => void 0);
	return run;
}
function beep() {
	const Ctx = window.AudioContext || window.webkitAudioContext;
	if (!Ctx) return;
	if (!audio) audio = new Ctx();
	const ctx = audio;
	if (ctx.state === "suspended") ctx.resume();
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = "sine";
	osc.frequency.setValueAtTime(620, ctx.currentTime);
	osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + .12);
	gain.gain.setValueAtTime(1e-4, ctx.currentTime);
	gain.gain.exponentialRampToValueAtTime(.06, ctx.currentTime + .03);
	gain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + .38);
	osc.connect(gain);
	gain.connect(ctx.destination);
	osc.start();
	osc.stop(ctx.currentTime + .4);
}
function beginVideo(sessionIds) {
	if (!sessionIds.length || !captureArmed() || isRecording()) return;
	const takeId = crypto.randomUUID();
	const now = Date.now();
	const mime = preferredMime();
	const state = usePult.getState();
	useCapture.setState({
		recording: true,
		takeId,
		bytes: 0,
		armed: true,
		error: ""
	});
	usePult.setState({
		takes: [{
			id: takeId,
			startedAt: now,
			endedAt: null,
			sessionIds,
			mime,
			bytes: null,
			saved: false
		}, ...state.takes].slice(0, 40),
		sessions: state.sessions.map((session) => sessionIds.includes(session.id) ? {
			...session,
			takeId
		} : session)
	});
	try {
		startRecorder(mime, (blob) => {
			putBlob(takeId, blob);
			const current = usePult.getState();
			usePult.setState({ takes: current.takes.map((take) => take.id === takeId ? {
				...take,
				endedAt: Date.now(),
				bytes: blob.size,
				mime: blob.type || mime
			} : take) });
			useCapture.setState({
				recording: false,
				takeId: null,
				bytes: blob.size
			});
			useToasts.getState().push([`Видео готово · ${formatBytes(blob.size)}. Скачайте, пока вкладка открыта.`]);
			triggerDownload(blob, `pult-${slugName(current.sessions.find((session) => sessionIds.includes(session.id))?.displayName || "efir")}-${fileStamp()}.webm`);
		});
	} catch {
		useCapture.setState({
			recording: false,
			takeId: null,
			error: "Не удалось начать видео"
		});
		useToasts.getState().push(["Не удалось начать видео. Журнал сессии всё равно ведётся."]);
	}
}
function triggerDownload(blob, filename) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 8e3);
}
function runEffects(decision) {
	const settings = usePult.getState().settings;
	if (decision.sound && settings.sound) beep();
	if (settings.notify && typeof Notification !== "undefined" && Notification.permission === "granted") for (const note of decision.notifies) try {
		new Notification(note.title, {
			body: note.body,
			icon: note.icon || void 0
		});
	} catch {}
	if (decision.toasts.length) useToasts.getState().push(decision.toasts);
	if (decision.stopVideo) stopRecorder();
	if (decision.beginVideo) beginVideo(decision.videoSessionIds);
}
async function submitChannel(platform, raw) {
	const parsed = normalizeTarget(platform, raw);
	if ("error" in parsed) return parsed.error;
	const existing = usePult.getState().channels.find((channel) => channel.platform === platform && channel.key === parsed.key);
	if (existing) {
		usePult.getState().select(existing.id);
		useToasts.getState().push(["Этот канал уже в списке"]);
		return null;
	}
	if (usePult.getState().channels.length >= 12) return "В списке уже 12 каналов — уберите лишний.";
	let message = null;
	await enqueue(async () => {
		let result;
		try {
			const first = (await checkStreams({ data: { items: [{
				platform,
				key: parsed.key
			}] } }))[0];
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
			addedAt: Date.now()
		};
		usePult.getState().addChannel(channel);
		ingestResults([{
			...result,
			queryKey: result.key
		}], usePult.getState().settings.monitor);
		if (!result.live) useToasts.getState().push([`${channel.displayName} в списке. Запись откроется сама, когда начнётся эфир.`]);
		else if (!usePult.getState().settings.monitor) useToasts.getState().push([`${channel.displayName} уже в эфире. Включите монитор, чтобы ловить следующие.`]);
	});
	return message;
}
function ingestResults(results, auto) {
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
		videoTakeId: capture.recording ? capture.takeId : null
	});
	usePult.setState({
		channels: decision.channels,
		snapshots: decision.snapshots,
		sessions: decision.sessions,
		takes: decision.takes
	});
	runEffects(decision);
}
function manualStart(channelId) {
	const state = usePult.getState();
	const channel = state.channels.find((item) => item.id === channelId);
	const snap = channel ? state.snapshots[channel.id] : void 0;
	if (!channel || !snap?.live) return;
	if (state.sessions.some((session) => session.channelId === channelId && session.endedAt === null)) return;
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
		samples: snap.viewers == null ? [] : [{
			t: Date.now(),
			viewers: snap.viewers
		}],
		markers: [],
		takeId: null
	};
	usePult.setState({ sessions: [session, ...state.sessions].slice(0, 50) });
	const capture = useCapture.getState();
	if (capture.armed && !capture.recording) beginVideo([session.id]);
	else if (capture.recording && capture.takeId) {
		const takeId = capture.takeId;
		const next = usePult.getState();
		usePult.setState({
			sessions: next.sessions.map((item) => item.id === session.id ? {
				...item,
				takeId
			} : item),
			takes: next.takes.map((take) => take.id === takeId ? {
				...take,
				sessionIds: [...take.sessionIds, session.id]
			} : take)
		});
	}
	useToasts.getState().push([`Запись «${channel.displayName}» начата`]);
}
function manualStop(channelId) {
	const state = usePult.getState();
	const open = state.sessions.find((session) => session.channelId === channelId && session.endedAt === null);
	if (!open) return;
	const sessions = state.sessions.map((session) => session.id === open.id ? {
		...session,
		endedAt: Date.now()
	} : session);
	usePult.setState({ sessions });
	if (!sessions.some((session) => session.endedAt === null)) stopRecorder();
	useToasts.getState().push(["Запись остановлена"]);
}
async function armScreen() {
	try {
		await armCapture(() => {
			useCapture.setState({
				armed: false,
				recording: false,
				takeId: null
			});
		});
		useCapture.setState({
			armed: true,
			error: ""
		});
		useToasts.getState().push(["Экран армирован. Видео включится само, когда кто-то из списка выйдет в эфир."]);
		const open = usePult.getState().sessions.filter((session) => session.endedAt === null);
		if (open.length) beginVideo(open.map((session) => session.id));
	} catch (error) {
		const text = (error instanceof Error ? error.name : "") === "NotAllowedError" ? "Разрешение на экран не дано. Журнал без видео всё равно работает." : "Этот браузер не отдал захват экрана.";
		useCapture.setState({
			armed: false,
			error: text
		});
		useToasts.getState().push([text]);
	}
}
function disarmScreen() {
	disarmCapture();
	useCapture.setState({
		armed: false,
		recording: false,
		takeId: null,
		bytes: 0
	});
}
function downloadTakeFile(takeId, filename) {
	const url = playbackUrl(takeId);
	if (!url || !url) return false;
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
	const results = await checkStreams({ data: { items: channels.map((channel) => {
		const snap = snapshots[channel.id];
		const videoId = snap?.live ? snap.videoId : "";
		return {
			platform: channel.platform,
			key: channel.key,
			...videoId ? { videoId } : {}
		};
	}) } });
	const { settings } = usePult.getState();
	ingestResults(results, settings.monitor);
}
function useMonitor() {
	const monitor = usePult((state) => state.settings.monitor);
	const intervalSec = usePult((state) => state.settings.intervalSec);
	const wake = usePult((state) => state.settings.wake);
	const channelKey = usePult((state) => state.channels.map((channel) => channel.id).join("|"));
	const [checking, setChecking] = (0, import_react.useState)(false);
	const [nextAt, setNextAt] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
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
		function schedule(delay) {
			setNextAt(Date.now() + delay);
			timer = window.setTimeout(async () => {
				await tick();
				if (stopped) return;
				if (usePult.getState().settings.monitor) schedule(usePult.getState().settings.intervalSec * 1e3);
				else setNextAt(0);
			}, delay);
		}
		tick().then(() => {
			if (stopped) return;
			if (usePult.getState().settings.monitor) schedule(usePult.getState().settings.intervalSec * 1e3);
		});
		return () => {
			stopped = true;
			window.clearTimeout(timer);
		};
	}, [
		monitor,
		intervalSec,
		channelKey
	]);
	(0, import_react.useEffect)(() => {
		const onVisible = () => {
			if (document.visibilityState !== "visible") return;
			if (!usePult.getState().settings.monitor) return;
			if (nextAt && Date.now() > nextAt + 1e3) enqueue(async () => {
				setChecking(true);
				try {
					await pollNow();
					primed = true;
				} finally {
					setChecking(false);
				}
			});
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => document.removeEventListener("visibilitychange", onVisible);
	}, [nextAt]);
	(0, import_react.useEffect)(() => {
		let lock = null;
		let gone = false;
		const nav = navigator;
		async function claim() {
			if (!wake || !monitor || !nav.wakeLock || document.visibilityState !== "visible") return;
			try {
				const sentinel = await nav.wakeLock.request("screen");
				if (gone) {
					await sentinel.release();
					return;
				}
				lock = sentinel;
			} catch {}
		}
		const onVisible = () => {
			if (document.visibilityState === "visible") claim();
		};
		claim();
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			gone = true;
			document.removeEventListener("visibilitychange", onVisible);
			lock?.release();
		};
	}, [wake, monitor]);
	(0, import_react.useEffect)(() => {
		const onLeave = (event) => {
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
	return {
		checking,
		nextAt
	};
}
async function enableMonitor(on) {
	usePult.getState().setSettings({ monitor: on });
	if (!on) return;
	const { settings } = usePult.getState();
	if (settings.notify && typeof Notification !== "undefined" && Notification.permission === "default") try {
		await Notification.requestPermission();
	} catch {}
	const Ctx = window.AudioContext || window.webkitAudioContext;
	if (settings.sound && Ctx) {
		if (!audio) audio = new Ctx();
		audio.resume();
	}
}
var emoteCache = /* @__PURE__ */ new Map();
function colorOf(value) {
	return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#f3efe2";
}
function twitchEmoteUrl(id, animated) {
	return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/${animated ? "animated" : "default"}/dark/2.0`;
}
function splitThird(text, emotes) {
	if (!text) return [];
	const parts = [];
	for (const token of text.split(/(\s+)/)) {
		if (!token) continue;
		const emote = emotes.get(token);
		if (emote) parts.push({
			kind: "image",
			url: emote.url,
			alt: token,
			animated: emote.animated
		});
		else parts.push({
			kind: "text",
			text: token
		});
	}
	return parts;
}
function applyEmotes(text, tag, emotes) {
	const ranges = [];
	if (tag) for (const group of tag.split("/")) {
		const [id, places] = group.split(":");
		if (!id || !places) continue;
		for (const place of places.split(",")) {
			const [start, end] = place.split("-").map(Number);
			if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end >= text.length) continue;
			ranges.push({
				start,
				end,
				id
			});
		}
	}
	ranges.sort((a, b) => a.start - b.start);
	const parts = [];
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
			animated: true
		});
		cursor = range.end + 1;
	}
	if (cursor < text.length) parts.push(...splitThird(text.slice(cursor), emotes));
	return parts.length ? parts : [{
		kind: "text",
		text
	}];
}
function parseTags(raw) {
	const tags = {};
	for (const piece of raw.split(";")) {
		const eq = piece.indexOf("=");
		if (eq <= 0) continue;
		tags[piece.slice(0, eq)] = piece.slice(eq + 1).replaceAll("\\s", " ").replaceAll("\\:", ";");
	}
	return tags;
}
function parsePriv(line, emotes) {
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
		parts: applyEmotes(text, tags.emotes || "", emotes)
	};
}
async function loadEmotes(login) {
	const hit = emoteCache.get(login);
	if (hit && hit.exp > Date.now()) return hit.map;
	try {
		const result = await twitchEmotes({ data: { login } });
		const map = new Map(Object.entries(result.emotes));
		emoteCache.set(login, {
			exp: Date.now() + 6e5,
			map
		});
		return map;
	} catch {
		return /* @__PURE__ */ new Map();
	}
}
function connectIrc(login, token, onLine) {
	let socket = null;
	let stopped = false;
	let timer = 0;
	let auth = token;
	const open = () => {
		if (stopped) return;
		socket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
		socket.onopen = () => {
			const nick = auth ? `pult${Math.floor(Math.random() * 99999)}` : `justinfan${Math.floor(1e4 + Math.random() * 89999)}`;
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
					auth = void 0;
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
function openBucket(bucket, login) {
	let stopSocket = () => {};
	let dead = false;
	(async () => {
		const emotes = await loadEmotes(login);
		if (dead) return;
		const auth = useTwitchAuth.getState().auth;
		stopSocket = connectIrc(login, auth?.scopes.includes("chat:read") ? auth.accessToken : void 0, (line) => {
			const message = parsePriv(line, emotes);
			if (message) appendChat(bucket, message);
		});
	})();
	return () => {
		dead = true;
		stopSocket();
	};
}
function useTwitchRecorders() {
	const sessions = usePult((state) => state.sessions);
	const channels = usePult((state) => state.channels);
	const snapshots = usePult((state) => state.snapshots);
	const selectedId = usePult((state) => state.selectedId);
	const authLogin = useTwitchAuth((state) => state.auth?.login || "");
	const open = sessions.filter((session) => session.endedAt === null && session.platform === "twitch");
	const selected = channels.find((channel) => channel.id === selectedId);
	const preview = selected?.platform === "twitch" && snapshots[selected.id]?.live && !open.some((session) => session.channelId === selected.id) ? selected.id : "";
	const signature = `${authLogin}|${open.map((session) => `${session.id}:${session.key}`).join(",")}|${preview}`;
	(0, import_react.useEffect)(() => {
		hydrateTwitchAuth();
		const state = usePult.getState();
		const targets = [];
		const covered = /* @__PURE__ */ new Set();
		for (const session of state.sessions) {
			if (session.endedAt !== null || session.platform !== "twitch") continue;
			const login = session.key.toLowerCase();
			if (!/^[a-z0-9_]{2,25}$/.test(login)) continue;
			targets.push({
				bucket: session.id,
				login
			});
			covered.add(session.channelId);
			for (const line of getChat(`preview:${session.channelId}`)) appendChat(session.id, line);
		}
		const current = state.channels.find((channel) => channel.id === state.selectedId);
		if (current?.platform === "twitch" && state.snapshots[current.id]?.live && !covered.has(current.id) && /^[a-z0-9_]{2,25}$/.test(current.key)) targets.push({
			bucket: `preview:${current.id}`,
			login: current.key.toLowerCase()
		});
		const stops = targets.map((target) => openBucket(target.bucket, target.login));
		return () => stops.forEach((stop) => stop());
	}, [signature]);
}
var PLATFORM_LABEL = {
	twitch: "Twitch",
	kick: "Kick",
	youtube: "YouTube"
};
var SUGGESTIONS = [
	{
		platform: "youtube",
		query: "@LofiGirl",
		label: "Lofi Girl"
	},
	{
		platform: "twitch",
		query: "kaicenat",
		label: "KaiCenat"
	},
	{
		platform: "kick",
		query: "xqc",
		label: "xQc"
	}
];
function Desk() {
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
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	const [platform, setPlatform] = (0, import_react.useState)("twitch");
	const [query, setQuery] = (0, import_react.useState)("");
	const [formError, setFormError] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [confirmId, setConfirmId] = (0, import_react.useState)("");
	const [marker, setMarker] = (0, import_react.useState)("");
	const [openJournal, setOpenJournal] = (0, import_react.useState)("");
	const selected = channels.find((channel) => channel.id === selectedId) ?? channels[0] ?? null;
	const selectedSnap = selected ? snapshots[selected.id] : void 0;
	const openSession = selected ? sessions.find((session) => session.channelId === selected.id && session.endedAt === null) : void 0;
	const liveCount = channels.filter((channel) => snapshots[channel.id]?.live).length;
	const anyRecording = sessions.some((session) => session.endedAt === null);
	const secondsLeft = nextAt ? Math.max(0, Math.ceil((nextAt - now) / 1e3)) : 0;
	(0, import_react.useEffect)(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 1e3);
		return () => window.clearInterval(timer);
	}, []);
	(0, import_react.useEffect)(() => {
		document.title = anyRecording ? "REC · Пульт" : liveCount ? `${liveCount} в эфире · Пульт` : "Пульт";
		const nav = navigator;
		if (liveCount && nav.setAppBadge) nav.setAppBadge(liveCount).catch(() => void 0);
		else if (nav.clearAppBadge) nav.clearAppBadge().catch(() => void 0);
	}, [anyRecording, liveCount]);
	async function add(nextPlatform, raw) {
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
	function remove(id) {
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
		const blob = new Blob([JSON.stringify({
			channels: state.channels,
			sessions: state.sessions,
			takes: state.takes
		}, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `pult-zhurnal-${fileStamp()}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto min-h-screen w-full max-w-6xl px-4 py-5 pb-28 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-col gap-5 border-b border-line pb-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-end justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-xs tracking-widest text-muted",
								children: "TWITCH · KICK · YOUTUBE"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "mt-1 text-3xl font-semibold tracking-tight",
								children: "Пульт"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 max-w-xl text-sm leading-relaxed text-muted",
								children: "Следит за выбранными стримерами и сам открывает запись, когда начинается эфир. Вкладку можно свернуть — проверка и уведомление останутся."
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveMeter, {
							count: liveCount,
							recording: anyRecording
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: cn("inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium", settings.monitor ? "bg-live text-bg" : "border border-line bg-surface text-fg"),
							"aria-pressed": settings.monitor,
							onClick: () => void enableMonitor(!settings.monitor),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, {
								className: "size-4",
								"aria-hidden": "true"
							}), settings.monitor ? "Монитор включён" : "Включить монитор"]
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntervalPicker, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							on: settings.sound,
							label: settings.sound ? "Звук старта" : "Без звука",
							icon: settings.sound ? Volume2 : VolumeX,
							onClick: () => usePult.getState().setSettings({ sound: !settings.sound })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							on: settings.notify,
							label: settings.notify ? "Уведомления" : "Без уведомлений",
							icon: settings.notify ? Bell : BellOff,
							onClick: () => usePult.getState().setSettings({ notify: !settings.notify })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							on: settings.wake,
							label: "Не гасить экран",
							icon: Sun,
							onClick: () => usePult.getState().setSettings({ wake: !settings.wake })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-xs text-muted",
							"aria-live": "polite",
							children: checking ? "Проверяю эфиры…" : settings.monitor ? `Следующая проверка через ${secondsLeft} с` : "Монитор выключен — список не обновляется сам"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "flex min-w-0 flex-col gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "rounded-lg border border-line bg-surface p-3",
						onSubmit: (event) => {
							event.preventDefault();
							add(platform, query);
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-mono text-xs tracking-widest text-muted",
								children: "ДОБАВИТЬ"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 grid grid-cols-3 gap-2",
								role: "tablist",
								"aria-label": "Площадка",
								children: [
									"twitch",
									"kick",
									"youtube"
								].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									role: "tab",
									"aria-selected": platform === item,
									className: cn("h-11 rounded-md text-sm", platform === item ? "bg-fg text-bg" : "bg-surface-2 text-muted"),
									onClick: () => setPlatform(item),
									children: PLATFORM_LABEL[item]
								}, item))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "sr-only",
										children: "Ник или ссылка"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: query,
										onChange: (event) => setQuery(event.target.value),
										onKeyDown: (event) => {
											if (event.key === "Enter") {
												event.preventDefault();
												add(platform, query);
											}
										},
										placeholder: platform === "youtube" ? "@канал или ссылка" : "ник или ссылка",
										className: "h-11 w-full rounded-md border border-line bg-bg px-3 text-base text-fg outline-none placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
										autoCapitalize: "off",
										autoCorrect: "off",
										spellCheck: false
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									disabled: busy,
									className: "inline-flex h-11 items-center gap-2 rounded-md bg-live px-3 text-sm font-medium text-bg disabled:opacity-40",
									onClick: () => void add(platform, query),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
										className: "size-4",
										"aria-hidden": "true"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "hidden sm:inline",
										children: busy ? "Ищу…" : "Добавить"
									})]
								})]
							}),
							formError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-fg",
								children: formError
							}) : null
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex items-baseline justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-mono text-xs tracking-widest text-muted",
							children: "СПИСОК"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-xs text-muted",
							children: String(channels.length).padStart(2, "0")
						})]
					}), channels.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-dashed border-line p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm leading-relaxed text-muted",
							children: "Пока пусто. Добавьте канал — или начните с того, кто часто в эфире."
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 grid gap-2",
							children: SUGGESTIONS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								disabled: busy,
								className: "flex h-14 items-center justify-between rounded-md border border-line bg-surface px-3 text-left hover:bg-surface-2 disabled:opacity-40",
								onClick: () => void add(item.platform, item.query),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm text-fg",
									children: item.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-xs text-muted",
									children: PLATFORM_LABEL[item.platform]
								})]
							}, item.query))
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "flex flex-col gap-2",
						children: channels.map((channel) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChannelRow, {
							channel,
							snap: snapshots[channel.id],
							active: selected?.id === channel.id,
							confirm: confirmId === channel.id,
							recording: sessions.some((session) => session.channelId === channel.id && session.endedAt === null),
							onSelect: () => usePult.getState().select(channel.id),
							onToggleAuto: () => usePult.getState().toggleAuto(channel.id),
							onAskRemove: () => setConfirmId(channel.id),
							onCancelRemove: () => setConfirmId(""),
							onRemove: () => remove(channel.id)
						}, channel.id))
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "flex min-w-0 flex-col gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("overflow-hidden rounded-lg border bg-surface", anyRecording ? "border-live" : "border-line"),
						children: selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stage, {
							channel: selected,
							snap: selectedSnap,
							session: openSession,
							now,
							captureOn: capture.armed,
							captureRecording: capture.recording,
							captureBytes: capture.bytes,
							marker,
							onMarker: setMarker,
							onPutMarker: putMarker
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex aspect-video flex-col items-start justify-end p-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-xs tracking-widest text-muted",
								children: "СЦЕНА"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 max-w-md text-lg leading-snug text-fg",
								children: "Здесь появится плеер того, кого вы поставите на запись."
							})]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-line bg-surface p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "font-mono text-xs tracking-widest text-muted",
									children: "ЖУРНАЛ"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "h-11 rounded-md border border-line px-3 text-sm text-fg hover:bg-surface-2",
										onClick: exportJournal,
										children: "Скачать журнал"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "h-11 rounded-md border border-line px-3 text-sm text-muted hover:bg-surface-2",
										onClick: () => usePult.getState().clearFinished(),
										children: "Убрать готовые"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm leading-relaxed text-muted",
								children: "Сессия пишет время, название, зрителей и чат Twitch с картинками. Поток Twitch скачивается отдельным файлом .ts. Захват экрана по-прежнему нужен для Kick и YouTube."
							}),
							sessions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 text-sm text-fg",
								children: "Записей ещё нет."
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "mt-3 flex flex-col gap-2",
								children: sessions.map((session) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JournalRow, {
									session,
									now,
									open: openJournal === session.id,
									take: takes.find((take) => take.id === session.takeId),
									liveBytes: capture.recording && capture.takeId === session.takeId ? capture.bytes : 0,
									onToggle: () => setOpenJournal((current) => current === session.id ? "" : session.id)
								}, session.id))
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none fixed inset-x-0 bottom-4 z-20 flex flex-col items-center gap-2 px-4",
				children: toasts.map((toast) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToastView, {
					id: toast.id,
					text: toast.text
				}, toast.id))
			})
		]
	});
}
function LiveMeter({ count, recording }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("size-2.5 rounded-full", count || recording ? "bg-live rec-blink" : "bg-line"),
			"aria-hidden": "true"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-mono text-xs text-fg",
			children: recording ? "REC" : count ? `${String(count).padStart(2, "0")} В ЭФИРЕ` : "ТИХО"
		})]
	});
}
function IntervalPicker() {
	const intervalSec = usePult((state) => state.settings.intervalSec);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex rounded-md border border-line p-1",
		role: "group",
		"aria-label": "Частота проверки",
		children: [
			[30, "30 с"],
			[60, "60 с"],
			[120, "2 мин"]
		].map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			"aria-pressed": intervalSec === value,
			className: cn("h-9 rounded px-3 text-sm", intervalSec === value ? "bg-fg text-bg" : "text-muted"),
			onClick: () => usePult.getState().setSettings({ intervalSec: value }),
			children: label
		}, value))
	});
}
function Toggle({ on, label, icon: Icon, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		"aria-pressed": on,
		onClick,
		className: cn("inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm", on ? "border-fg bg-surface text-fg" : "border-line bg-surface text-muted"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
			className: "size-4",
			"aria-hidden": "true"
		}), label]
	});
}
function ChannelRow({ channel, snap, active, confirm, recording, onSelect, onToggleAuto, onAskRemove, onCancelRemove, onRemove }) {
	const status = !snap || snap.checkedAt === 0 ? "ещё не проверяли" : snap.error ? `сбой · ${snap.error}` : snap.live ? snap.title || "в эфире" : "не в сети";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
		className: cn("rounded-lg border bg-surface", active ? "border-fg" : "border-line", snap?.live ? "border-l-4 border-l-live" : "border-l-4 border-l-transparent"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start gap-3 p-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onSelect,
				className: "flex min-w-0 flex-1 items-start gap-3 text-left",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
					name: channel.displayName,
					url: channel.avatarUrl
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate text-sm font-medium text-fg",
									children: channel.displayName
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-xs text-muted",
									children: PLATFORM_LABEL[channel.platform]
								}),
								recording ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-xs text-fg",
									children: "REC"
								}) : null
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-1 block truncate text-sm text-muted",
							children: status
						}),
						snap?.live && snap.viewers != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "mt-1 block font-mono text-xs text-muted",
							children: [
								formatViewers(snap.viewers),
								" зрит.",
								snap.category ? ` · ${snap.category}` : ""
							]
						}) : snap?.live && snap.category ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-1 block font-mono text-xs text-muted",
							children: snap.category
						}) : null
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-pressed": channel.auto,
						onClick: onToggleAuto,
						className: cn("h-11 rounded-md px-3 text-sm", channel.auto ? "bg-fg text-bg" : "border border-line text-muted"),
						children: channel.auto ? "Авто" : "Вручную"
					}),
					confirm ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onRemove,
						className: "h-11 rounded-md bg-live px-3 text-sm text-bg",
						children: "Убрать"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": `Убрать ${channel.displayName}`,
						onClick: onAskRemove,
						className: "inline-flex h-11 items-center justify-center rounded-md border border-line text-muted hover:text-fg",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
							className: "size-4",
							"aria-hidden": "true"
						})
					}),
					confirm ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onCancelRemove,
						className: "text-xs text-muted",
						children: "отмена"
					}) : null
				]
			})]
		})
	});
}
function Avatar({ name, url }) {
	if (!url) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-sm text-fg",
		children: name.slice(0, 1).toUpperCase()
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: url,
		alt: "",
		className: "size-11 shrink-0 rounded-full object-cover"
	});
}
function Stage({ channel, snap, session, now, captureOn, captureRecording, captureBytes, marker, onMarker, onPutMarker }) {
	const live = !!snap?.live;
	const uptime = live && snap?.startedAt ? now - new Date(snap.startedAt).getTime() : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		channel.platform === "twitch" && live ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TwitchLive, {
			channel,
			sessionId: session?.id
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Player, {
			channel,
			snap
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col gap-4 p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-xs text-muted",
								children: PLATFORM_LABEL[channel.platform]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "mt-1 text-xl font-medium leading-snug text-fg",
								children: channel.displayName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm leading-relaxed text-muted",
								children: live ? snap?.title || "В эфире" : snap?.error || "Сейчас не в сети"
							})
						]
					}), live ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "font-mono text-sm text-fg",
						children: [
							snap?.viewers != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								formatViewers(snap.viewers),
								" ",
								viewersWord(snap.viewers)
							] }) : null,
							uptime > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-muted",
								children: ["эфир ", formatDuration(uptime)]
							}) : null,
							snap?.category ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-muted",
								children: snap.category
							}) : null,
							session ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-fg",
								children: ["ловим ", formatDuration(now - session.startedAt)]
							}) : null
						]
					}) : null]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [
						live && !session ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "inline-flex h-11 items-center gap-2 rounded-md bg-live px-3 text-sm font-medium text-bg",
							onClick: () => manualStart(channel.id),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "size-2 rounded-full bg-bg",
								"aria-hidden": "true"
							}), "Начать запись"]
						}) : null,
						session ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg",
							onClick: () => manualStop(channel.id),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, {
								className: "size-4",
								"aria-hidden": "true"
							}), "Остановить"]
						}) : null,
						captureOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg",
							onClick: () => disarmScreen(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Monitor, {
								className: "size-4",
								"aria-hidden": "true"
							}), captureRecording ? `Пишу экран · ${formatBytes(captureBytes)}` : "Экран армирован"]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg hover:bg-surface-2",
							onClick: () => void armScreen(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Monitor, {
								className: "size-4",
								"aria-hidden": "true"
							}), "Армировать экран"]
						}),
						live && snap?.watchUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: snap.watchUrl,
							target: "_blank",
							rel: "noreferrer",
							className: "inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg hover:bg-surface-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, {
								className: "size-4",
								"aria-hidden": "true"
							}), "Открыть эфир"]
						}) : channel.profileUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: channel.profileUrl,
							target: "_blank",
							rel: "noreferrer",
							className: "inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg hover:bg-surface-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, {
								className: "size-4",
								"aria-hidden": "true"
							}), "Открыть канал"]
						}) : null
					]
				}),
				session ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "flex gap-2",
					onSubmit: (event) => {
						event.preventDefault();
						onPutMarker();
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "sr-only",
							children: "Метка"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: marker,
							onChange: (event) => onMarker(event.target.value),
							placeholder: "Метка — начало катки, смешной момент",
							className: "h-11 w-full rounded-md border border-line bg-bg px-3 text-base text-fg outline-none placeholder:text-muted"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						className: "h-11 rounded-md bg-fg px-3 text-sm font-medium text-bg",
						children: "Метка"
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm leading-relaxed text-muted",
					children: channel.auto ? "Авто включено: как только канал станет онлайн, сессия откроется сама." : "Авто выключено — запись только кнопкой, когда канал в эфире."
				}),
				snap?.checkedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "inline-flex items-center gap-2 font-mono text-xs text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
							className: "size-3",
							"aria-hidden": "true"
						}),
						"проверено ",
						formatClock(new Date(snap.checkedAt).toISOString())
					]
				}) : null
			]
		}),
		channel.platform === "twitch" && live ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatPane, {
			bucket: chatBucket(channel.id, session?.id),
			title: channel.displayName
		}) : null
	] });
}
function Player({ channel, snap }) {
	if (!snap?.live) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex aspect-video items-end bg-bg p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-xs text-muted",
			children: "ОФФЛАЙН"
		})
	});
	if (channel.platform === "kick") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
		title: `Эфир ${channel.displayName}`,
		src: `https://player.kick.com/${encodeURIComponent(channel.key)}`,
		className: "aspect-video w-full bg-bg",
		allow: "autoplay; fullscreen; picture-in-picture",
		allowFullScreen: true
	});
	if (snap.videoId) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
		title: `Эфир ${channel.displayName}`,
		src: `https://www.youtube.com/embed/${encodeURIComponent(snap.videoId)}?autoplay=1&mute=1`,
		className: "aspect-video w-full bg-bg",
		allow: "autoplay; fullscreen; picture-in-picture; encrypted-media",
		allowFullScreen: true
	});
	if (snap.thumbnailUrl) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: snap.thumbnailUrl,
		alt: "",
		className: "aspect-video w-full object-cover"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "aspect-video bg-bg" });
}
function JournalRow({ session, now, open, take, liveBytes, onToggle }) {
	const ended = session.endedAt ?? now;
	const url = session.takeId ? playbackUrl(session.takeId) : null;
	const points = session.samples.filter((sample) => sample.viewers != null).map((sample) => ({
		viewers: sample.viewers,
		label: formatDuration(sample.t - session.startedAt)
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "rounded-md border border-line",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: onToggle,
			className: "flex w-full items-start gap-3 p-3 text-left",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("mt-1 size-2 shrink-0 rounded-full", session.endedAt ? "bg-line" : "bg-live rec-blink") }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex flex-wrap items-baseline gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-medium text-fg",
								children: session.displayName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-xs text-muted",
								children: PLATFORM_LABEL[session.platform]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-xs text-muted",
								children: session.auto ? "авто" : "вручную"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-1 block truncate text-sm text-muted",
						children: session.title || "без названия"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "shrink-0 text-right font-mono text-xs text-fg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block",
						children: formatDuration(ended - session.startedAt)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-muted",
						children: ["пик ", formatViewers(session.peakViewers)]
					})]
				})
			]
		}), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "border-t border-line px-3 py-3",
			children: [
				session.streamStartedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: ["Эфир начался ", formatClock(session.streamStartedAt)]
				}) : null,
				points.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 h-24 w-full",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
						width: "100%",
						height: "100%",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
							data: points,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								contentStyle: {
									background: "var(--color-surface-2)",
									border: "1px solid var(--color-line)",
									borderRadius: 8,
									color: "var(--color-fg)"
								},
								formatter: (value) => [formatViewers(typeof value === "number" ? value : null), "зрители"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
								dataKey: "viewers",
								stroke: "var(--color-fg)",
								fill: "var(--color-line)",
								strokeWidth: 1.5,
								isAnimationActive: false
							})]
						})
					})
				}) : null,
				session.markers.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 flex flex-col gap-1",
					children: session.markers.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "text-sm text-fg",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-xs text-muted",
								children: ["+", formatDuration(item.t - session.startedAt)]
							}),
							" ",
							item.note
						]
					}, `${item.t}-${item.note}`))
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "Меток нет."
				}),
				url ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
						src: url,
						controls: true,
						className: "w-full rounded-md bg-bg"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "mt-2 inline-flex h-11 items-center gap-2 rounded-md bg-fg px-3 text-sm font-medium text-bg",
						onClick: () => downloadTakeFile(session.takeId || "", `pult-${slugName(session.displayName)}-${fileStamp(new Date(session.startedAt))}.webm`),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
								className: "size-4",
								"aria-hidden": "true"
							}),
							"Скачать WebM",
							take?.bytes ? ` · ${formatBytes(take.bytes)}` : ""
						]
					})]
				}) : liveBytes ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 font-mono text-xs text-fg",
					children: ["Видео пишется · ", formatBytes(liveBytes)]
				}) : take && !take.endedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "Видео ещё пишется."
				}) : session.takeId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "Видео было в этой сессии. После обновления страницы файл уже не восстановить — в следующий раз скачайте его сразу."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "Видео с экрана не писалось."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatDownload, { session })
			]
		}) : null]
	});
}
function ChatDownload({ session }) {
	const lines = useChatLines(session.platform === "twitch" ? session.id : "");
	const [saving, setSaving] = (0, import_react.useState)(false);
	if (session.platform !== "twitch") return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		disabled: !lines.length || saving,
		className: "mt-3 inline-flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-fg disabled:text-muted",
		onClick: () => {
			setSaving(true);
			downloadChatHtml(`pult-chat-${slugName(session.displayName)}-${fileStamp(new Date(session.startedAt))}.html`, `Чат · ${session.displayName}`, lines).finally(() => setSaving(false));
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
			className: "size-4",
			"aria-hidden": "true"
		}), saving ? "Собираю чат" : `Скачать чат${lines.length ? ` · ${lines.length}` : ""}`]
	});
}
function ToastView({ id, text }) {
	(0, import_react.useEffect)(() => {
		const timer = window.setTimeout(() => useToasts.getState().dismiss(id), 7e3);
		return () => window.clearTimeout(timer);
	}, [id]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-auto w-full max-w-md rounded-md border border-line bg-surface px-3 py-3 text-sm text-fg shadow-none",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "leading-relaxed",
				children: text
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "font-mono text-xs text-muted",
				onClick: () => useToasts.getState().dismiss(id),
				children: "скрыть"
			})]
		})
	});
}
function Home() {
	(0, import_react.useEffect)(() => {
		usePult.persist.rehydrate();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Desk, {});
}
//#endregion
export { Home as component };
