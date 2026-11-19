import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { t as assertKey } from "./normalize-CTb0GLAl.mjs";
import { a as object, n as array, o as string, t as _enum } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/check-CWxWzyR4.js
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
var YT_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
var schema = object({ items: array(object({
	platform: _enum([
		"twitch",
		"kick",
		"youtube"
	]),
	key: string().min(1).max(80),
	videoId: string().max(20).optional()
})).min(1).max(12) });
var cache = /* @__PURE__ */ new Map();
function blank(platform, key, patch) {
	return {
		platform,
		queryKey: key,
		key,
		ok: false,
		found: false,
		error: "",
		displayName: "",
		avatarUrl: "",
		profileUrl: "",
		live: false,
		title: "",
		category: "",
		viewers: null,
		startedAt: null,
		thumbnailUrl: "",
		watchUrl: "",
		streamId: "",
		videoId: "",
		...patch
	};
}
function asRecord(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value;
}
function str(value) {
	return typeof value === "string" ? value : "";
}
function num(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function dig(root, path) {
	let cur = root;
	for (const key of path) {
		const rec = asRecord(cur);
		if (!rec) return void 0;
		cur = rec[key];
	}
	return cur;
}
async function fetchJson(url, init) {
	const res = await fetch(url, {
		...init,
		headers: {
			"user-agent": UA,
			accept: "application/json",
			...init?.headers ?? {}
		},
		signal: AbortSignal.timeout(12e3)
	});
	const text = await res.text();
	let json = null;
	if (text) try {
		json = JSON.parse(text);
	} catch {
		json = null;
	}
	return {
		status: res.status,
		json
	};
}
function remember(cacheKey, value, ttl) {
	cache.set(cacheKey, {
		exp: Date.now() + ttl,
		value
	});
	return value;
}
function remembered(cacheKey) {
	const hit = cache.get(cacheKey);
	if (!hit) return null;
	if (hit.exp < Date.now()) {
		cache.delete(cacheKey);
		return null;
	}
	return hit.value;
}
function failMessage(error) {
	if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return "Площадка долго не отвечает";
	return "Нет связи с площадкой";
}
async function checkTwitch(key) {
	try {
		const gql = await fetchJson("https://gql.twitch.tv/gql", {
			method: "POST",
			headers: {
				"client-id": "kimne78kx3ncx6brgo4mv6wki5h1ko",
				"content-type": "application/json"
			},
			body: JSON.stringify({
				query: "query($login:String!){ user(login:$login){ login displayName profileImageURL(width:300) stream { id title viewersCount createdAt type game { name } } } }",
				variables: { login: key }
			})
		});
		const user = asRecord(dig(gql.json, ["data", "user"]));
		if (gql.status === 200 && user) return twitchFromUser(key, user);
		if (gql.status === 200 && dig(gql.json, ["data", "user"]) === null) return blank("twitch", key, {
			ok: true,
			found: false,
			error: "Канал не найден"
		});
	} catch {}
	try {
		const ivr = await fetchJson(`https://api.ivr.fi/v2/twitch/user?login=${encodeURIComponent(key)}`);
		if (ivr.status === 404 || ivr.status === 400) return blank("twitch", key, {
			ok: true,
			found: false,
			error: "Канал не найден"
		});
		const row = Array.isArray(ivr.json) ? asRecord(ivr.json[0]) : asRecord(ivr.json);
		if (!row || ivr.status >= 400) return blank("twitch", key, {
			ok: false,
			error: "Twitch не ответил"
		});
		const stream = asRecord(row.stream);
		const game = asRecord(stream?.game);
		const live = !!stream && (str(stream.type) === "" || str(stream.type) === "live");
		const login = str(row.login) || key;
		return blank("twitch", key, {
			ok: true,
			found: true,
			key: login.toLowerCase(),
			displayName: str(row.displayName) || login,
			avatarUrl: str(row.logo),
			profileUrl: `https://www.twitch.tv/${login}`,
			live,
			title: live ? str(stream?.title) : "",
			category: live ? str(game?.displayName) : "",
			viewers: live ? num(stream?.viewersCount) : null,
			startedAt: live ? str(stream?.createdAt) || null : null,
			thumbnailUrl: live ? `https://static-cdn.jtvnw.net/previews-ttv/live_user_${login.toLowerCase()}-640x360.jpg` : "",
			watchUrl: `https://www.twitch.tv/${login}`,
			streamId: live ? str(stream?.id) : ""
		});
	} catch (error) {
		return blank("twitch", key, {
			ok: false,
			error: failMessage(error)
		});
	}
}
function twitchFromUser(key, user) {
	const login = str(user.login) || key;
	const stream = asRecord(user.stream);
	const game = asRecord(stream?.game);
	const type = str(stream?.type);
	const live = !!stream && (type === "" || type === "live");
	return blank("twitch", key, {
		ok: true,
		found: true,
		key: login.toLowerCase(),
		displayName: str(user.displayName) || login,
		avatarUrl: str(user.profileImageURL),
		profileUrl: `https://www.twitch.tv/${login}`,
		live,
		title: live ? str(stream?.title) : "",
		category: live ? str(game?.name) : "",
		viewers: live ? num(stream?.viewersCount) : null,
		startedAt: live ? str(stream?.createdAt) || null : null,
		thumbnailUrl: live ? `https://static-cdn.jtvnw.net/previews-ttv/live_user_${login.toLowerCase()}-640x360.jpg` : "",
		watchUrl: `https://www.twitch.tv/${login}`,
		streamId: live ? str(stream?.id) : ""
	});
}
function kickThumb(value) {
	if (typeof value === "string") return value;
	return str(asRecord(value)?.src);
}
async function curlJson(url) {
	const { execFile } = await import("node:child_process");
	const { promisify } = await import("node:util");
	const { stdout } = await promisify(execFile)("curl", [
		"-sS",
		"-m",
		"12",
		"--http1.1",
		"-A",
		UA,
		"-H",
		"Accept: application/json",
		"-H",
		"Referer: https://kick.com/",
		"-w",
		"\n%{http_code}",
		"--",
		url
	], { maxBuffer: 6e6 });
	const text = stdout.trimEnd();
	const split = text.lastIndexOf("\n");
	const body = split >= 0 ? text.slice(0, split) : text;
	const status = Number(split >= 0 ? text.slice(split + 1).trim() : "0");
	let json = null;
	try {
		json = body ? JSON.parse(body) : null;
	} catch {
		json = null;
	}
	return {
		status: Number.isFinite(status) ? status : 0,
		json
	};
}
function kickResult(key, channel) {
	const user = asRecord(channel.user);
	const slug = str(channel.slug) || key;
	const liveBlock = asRecord(channel.livestream);
	const live = !!liveBlock && liveBlock.is_live !== false;
	const category = str(asRecord((Array.isArray(liveBlock?.categories) ? liveBlock.categories : [])[0])?.name);
	const started = str(liveBlock?.start_time) || str(liveBlock?.created_at);
	return blank("kick", key, {
		ok: true,
		found: true,
		key: slug.toLowerCase(),
		displayName: str(user?.username) || slug,
		avatarUrl: str(user?.profile_pic) || str(user?.profilepic),
		profileUrl: `https://kick.com/${slug}`,
		live,
		title: live ? str(liveBlock?.session_title) : "",
		category: live ? category : "",
		viewers: live ? num(liveBlock?.viewer_count) : null,
		startedAt: live ? normalizeKickDate(started) : null,
		thumbnailUrl: live ? kickThumb(liveBlock?.thumbnail) : "",
		watchUrl: `https://kick.com/${slug}`,
		streamId: live && liveBlock?.id != null ? String(liveBlock.id) : ""
	});
}
async function checkKick(key) {
	const url = `https://kick.com/api/v2/channels/${encodeURIComponent(key)}`;
	try {
		let loaded = await fetchJson(url, { headers: {
			accept: "application/json",
			referer: "https://kick.com/"
		} });
		if (loaded.status === 403 || loaded.status === 429 || !loaded.json) loaded = await curlJson(url);
		if (loaded.status === 404) return blank("kick", key, {
			ok: true,
			found: false,
			error: "Канал не найден"
		});
		const channel = asRecord(loaded.json);
		if (!channel || loaded.status >= 400) return blank("kick", key, {
			ok: false,
			error: "Kick не ответил"
		});
		return kickResult(key, channel);
	} catch (error) {
		try {
			const loaded = await curlJson(url);
			const channel = asRecord(loaded.json);
			if (loaded.status === 404) return blank("kick", key, {
				ok: true,
				found: false,
				error: "Канал не найден"
			});
			if (!channel || loaded.status >= 400) return blank("kick", key, {
				ok: false,
				error: "Kick не ответил"
			});
			return kickResult(key, channel);
		} catch {
			return blank("kick", key, {
				ok: false,
				error: failMessage(error)
			});
		}
	}
}
function normalizeKickDate(value) {
	if (!value) return null;
	const iso = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function extractObject(html, marker) {
	const at = html.indexOf(marker);
	if (at < 0) return null;
	const start = html.indexOf("{", at);
	if (start < 0) return null;
	let depth = 0;
	let inStr = false;
	let esc = false;
	for (let i = start; i < html.length; i += 1) {
		const ch = html[i];
		if (inStr) {
			if (esc) esc = false;
			else if (ch === "\\") esc = true;
			else if (ch === "\"") inStr = false;
			continue;
		}
		if (ch === "\"") {
			inStr = true;
			continue;
		}
		if (ch === "{") depth += 1;
		else if (ch === "}") {
			depth -= 1;
			if (depth === 0) try {
				return JSON.parse(html.slice(start, i + 1));
			} catch {
				return null;
			}
		}
	}
	return null;
}
function lastThumb(value) {
	if (!Array.isArray(value) || value.length === 0) return "";
	return str(asRecord(value[value.length - 1])?.url);
}
async function readPlayer(videoId) {
	if (!/^[\w-]{6,20}$/.test(videoId)) return null;
	try {
		const { status, json } = await fetchJson(`https://www.youtube.com/youtubei/v1/player?key=${YT_KEY}&prettyPrint=false`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				context: { client: {
					clientName: "WEB",
					clientVersion: "2.20241126.01.00",
					hl: "en",
					gl: "US"
				} },
				videoId
			})
		});
		if (status >= 400 || !json) return null;
		const details = asRecord(dig(json, ["videoDetails"]));
		const liveDetails = asRecord(dig(json, [
			"microformat",
			"playerMicroformatRenderer",
			"liveBroadcastDetails"
		]));
		const isLiveNow = liveDetails?.isLiveNow;
		const isLive = details?.isLive;
		let state = "unknown";
		if (isLiveNow === true || isLive === true) state = "live";
		else if (isLiveNow === false || isLive === false) state = "offline";
		const thumbs = dig(details ?? {}, ["thumbnail", "thumbnails"]);
		return {
			state,
			title: str(details?.title),
			author: str(details?.author),
			channelId: str(details?.channelId),
			startedAt: str(liveDetails?.startTimestamp) || null,
			thumbnailUrl: lastThumb(thumbs) || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
			videoId
		};
	} catch {
		return null;
	}
}
function youtubePageUrl(key) {
	if (key.startsWith("@")) return `https://www.youtube.com/${encodeURIComponent(key).replace("%40", "@")}`;
	if (key.startsWith("channel/")) return `https://www.youtube.com/${key}`;
	if (key.startsWith("c/") || key.startsWith("user/")) return `https://www.youtube.com/${key}`;
	return null;
}
async function authorKeyFromWatch(videoId) {
	try {
		const { status, json } = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`);
		if (status >= 400) return null;
		const authorUrl = str(asRecord(json)?.author_url);
		if (!authorUrl) return null;
		const parsed = new URL(authorUrl);
		const head = decodeURIComponent(parsed.pathname.split("/").filter(Boolean)[0] ?? "");
		if (head.startsWith("@")) return head;
		if (head === "channel") {
			const id = parsed.pathname.split("/").filter(Boolean)[1] ?? "";
			return id ? `channel/${id}` : null;
		}
		return null;
	} catch {
		return null;
	}
}
function parseChannel(html) {
	const data = extractObject(html, "ytInitialData");
	if (!data) return null;
	const meta = asRecord(dig(data, ["metadata", "channelMetadataRenderer"]));
	const avatar = asRecord(dig(data, [
		"header",
		"pageHeaderRenderer",
		"content",
		"pageHeaderViewModel",
		"image",
		"decoratedAvatarViewModel"
	]));
	const liveBadge = str(dig(avatar ?? {}, ["liveData", "liveBadgeText"]));
	const videoId = str(dig(avatar ?? {}, [
		"rendererContext",
		"commandContext",
		"onTap",
		"innertubeCommand",
		"watchEndpoint",
		"videoId"
	]));
	return {
		found: !!meta && (!!str(meta.title) || !!str(meta.externalId)),
		displayName: str(meta?.title),
		avatarUrl: lastThumb(meta?.avatar && asRecord(meta.avatar)?.thumbnails),
		externalId: str(meta?.externalId),
		live: liveBadge.length > 0,
		videoId
	};
}
async function oembedTitle(videoId) {
	try {
		const { status, json } = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`);
		if (status >= 400) return "";
		return str(asRecord(json)?.title);
	} catch {
		return "";
	}
}
async function withYoutubeTitle(result) {
	if (!result.live || !result.videoId || result.title) return result;
	const title = await oembedTitle(result.videoId);
	return title ? {
		...result,
		title
	} : result;
}
function youtubeResult(queryKey, key, page, player, live) {
	const videoId = player?.videoId || page?.videoId || "";
	const channelId = player?.channelId || page?.externalId || "";
	const profileUrl = channelId ? `https://www.youtube.com/channel/${channelId}` : key.startsWith("@") ? `https://www.youtube.com/${key}` : "";
	return blank("youtube", queryKey, {
		ok: true,
		found: true,
		key,
		displayName: page?.displayName || player?.author || key,
		avatarUrl: page?.avatarUrl || "",
		profileUrl,
		live,
		title: live ? player?.title || "" : "",
		category: "",
		viewers: null,
		startedAt: live ? player?.startedAt || null : null,
		thumbnailUrl: live ? player?.thumbnailUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "") : "",
		watchUrl: live && videoId ? `https://www.youtube.com/watch?v=${videoId}` : profileUrl,
		streamId: live ? videoId : "",
		videoId: live ? videoId : ""
	});
}
async function loadChannel(key) {
	const pageUrl = youtubePageUrl(key);
	if (!pageUrl) return {
		page: null,
		error: "Некорректная ссылка YouTube"
	};
	const res = await fetch(pageUrl, {
		headers: {
			"user-agent": UA,
			"accept-language": "en-US,en;q=0.9",
			accept: "text/html"
		},
		redirect: "follow",
		signal: AbortSignal.timeout(14e3)
	});
	if (res.status === 404) return {
		page: null,
		error: ""
	};
	if (!res.ok) return {
		page: null,
		error: "YouTube не ответил"
	};
	const page = parseChannel(await res.text());
	if (!page) return {
		page: null,
		error: "YouTube не отдал данные канала"
	};
	if (!page.found) return {
		page: null,
		error: ""
	};
	return {
		page,
		error: ""
	};
}
async function checkYoutube(key, videoHint) {
	try {
		let storageKey = key;
		if (key.startsWith("watch/")) {
			const resolved = await authorKeyFromWatch(key.slice(6));
			if (!resolved) return blank("youtube", key, {
				ok: true,
				found: false,
				error: "Ролик или канал не найден"
			});
			storageKey = resolved;
		}
		if (videoHint) {
			const player = await readPlayer(videoHint);
			if (player?.state === "live") return withYoutubeTitle(youtubeResult(key, storageKey, null, player, true));
		}
		const loaded = await loadChannel(storageKey);
		if (loaded.error && !loaded.page) return blank("youtube", key, {
			ok: false,
			error: loaded.error,
			key: storageKey
		});
		if (!loaded.page) return blank("youtube", key, {
			ok: true,
			found: false,
			error: "Канал не найден",
			key: storageKey
		});
		if (!loaded.page.live || !loaded.page.videoId) return youtubeResult(key, storageKey, loaded.page, null, false);
		const player = await readPlayer(loaded.page.videoId);
		const live = player?.state !== "offline";
		return withYoutubeTitle(youtubeResult(key, storageKey, loaded.page, player, live && loaded.page.live));
	} catch (error) {
		return blank("youtube", key, {
			ok: false,
			error: failMessage(error)
		});
	}
}
async function checkOne(platform, key, videoId) {
	if (!assertKey(platform, key)) return blank(platform, key, {
		ok: false,
		error: "Некорректное имя канала"
	});
	const hint = videoId && /^[\w-]{6,20}$/.test(videoId) ? videoId : "";
	const cacheKey = `${platform}|${key}|${hint}`;
	const hit = remembered(cacheKey);
	if (hit) return hit;
	const value = platform === "twitch" ? await checkTwitch(key) : platform === "kick" ? await checkKick(key) : await checkYoutube(key, hint || void 0);
	return remember(cacheKey, value, value.ok ? platform === "youtube" ? 2e4 : 12e3 : 4e3);
}
async function mapPool(items, limit, fn) {
	const out = new Array(items.length);
	let cursor = 0;
	async function worker() {
		while (cursor < items.length) {
			const index = cursor;
			cursor += 1;
			const item = items[index];
			if (item === void 0) return;
			out[index] = await fn(item);
		}
	}
	const workers = Math.min(limit, items.length);
	await Promise.all(Array.from({ length: workers }, () => worker()));
	return out;
}
var checkStreams_createServerFn_handler = createServerRpc({
	id: "247fed45e4fa985e40aeb41de7a44a620c4f1f8ab343664957783ae72193208e",
	name: "checkStreams",
	filename: "src/lib/streams/check.ts"
}, (opts) => checkStreams.__executeServer(opts));
var checkStreams = createServerFn({ method: "POST" }).validator((input) => schema.parse(input)).handler(checkStreams_createServerFn_handler, async ({ data }) => {
	return mapPool(data.items, 4, (item) => checkOne(item.platform, item.key, item.videoId));
});
//#endregion
export { checkStreams_createServerFn_handler };
