import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { a as object, o as string, t as _enum } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/twitch-vjZKEypR.js
var WEB_CLIENT = "kimne78kx3ncx6brgo4mv6wki5h1ko";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
var loginSchema = string().regex(/^[a-z0-9_]{2,25}$/i);
var clientSchema = string().regex(/^[a-z0-9]{20,50}$/i);
var qualitySchema = _enum([
	"160",
	"360",
	"480",
	"720",
	"1080"
]);
var emoteCache = /* @__PURE__ */ new Map();
function asRecord(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value;
}
function pickVariant(playlist, quality) {
	const want = Number(quality);
	const lines = playlist.split("\n");
	const variants = [];
	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i] ?? "";
		if (!line.startsWith("#EXT-X-STREAM-INF")) continue;
		const match = line.match(/RESOLUTION=(\d+)x(\d+)/);
		const url = lines.slice(i + 1).find((item) => item.startsWith("http"));
		if (!match || !url) continue;
		variants.push({
			height: Number(match[2]),
			url
		});
	}
	if (!variants.length) return null;
	const exact = variants.find((item) => item.height === want);
	if (exact) return exact;
	const lower = variants.filter((item) => item.height <= want).sort((a, b) => b.height - a.height);
	if (lower[0]) return lower[0];
	return variants.sort((a, b) => a.height - b.height)[0] ?? null;
}
async function gqlToken(login, clientId, token) {
	const headers = {
		"client-id": clientId,
		"content-type": "application/json",
		"user-agent": UA
	};
	if (token) headers.authorization = `OAuth ${token}`;
	const res = await fetch("https://gql.twitch.tv/gql", {
		method: "POST",
		headers,
		body: JSON.stringify({
			operationName: "PlaybackAccessToken",
			variables: {
				isLive: true,
				login,
				isVod: false,
				vodID: "",
				playerType: "site"
			},
			extensions: { persistedQuery: {
				version: 1,
				sha256Hash: "0828119ded1c13477966434e15800ff57ddacf13ba1911c129dc2200705b0712"
			} }
		}),
		signal: AbortSignal.timeout(12e3)
	});
	if (!res.ok) return null;
	const tokenBlock = asRecord(asRecord(asRecord(await res.json())?.data)?.streamPlaybackAccessToken);
	const value = tokenBlock?.value;
	const signature = tokenBlock?.signature;
	if (typeof value !== "string" || typeof signature !== "string") return null;
	return {
		value,
		signature
	};
}
async function masterPlaylist(login, access) {
	const url = new URL(`https://usher.ttvnw.net/api/channel/hls/${login}.m3u8`);
	url.searchParams.set("allow_source", "true");
	url.searchParams.set("allow_audio_only", "true");
	url.searchParams.set("sig", access.signature);
	url.searchParams.set("token", access.value);
	const res = await fetch(url, {
		headers: { "user-agent": UA },
		signal: AbortSignal.timeout(12e3)
	});
	if (!res.ok) return null;
	return res.text();
}
var resolveTwitchPlayback_createServerFn_handler = createServerRpc({
	id: "27aac043a882ed03462398bb026efbea33be0eaa46ee060702975ce5ff4e12af",
	name: "resolveTwitchPlayback",
	filename: "src/lib/streams/twitch.ts"
}, (opts) => resolveTwitchPlayback.__executeServer(opts));
var resolveTwitchPlayback = createServerFn({ method: "POST" }).validator((input) => object({
	login: loginSchema,
	quality: qualitySchema,
	clientId: clientSchema.optional(),
	token: string().min(10).max(512).optional()
}).parse(input)).handler(resolveTwitchPlayback_createServerFn_handler, async ({ data }) => {
	const login = data.login.toLowerCase();
	const attempts = [];
	if (data.token && data.clientId) attempts.push({
		clientId: data.clientId,
		token: data.token
	});
	attempts.push({ clientId: WEB_CLIENT });
	for (const attempt of attempts) try {
		const access = await gqlToken(login, attempt.clientId, attempt.token);
		if (!access) continue;
		const playlist = await masterPlaylist(login, access);
		if (!playlist) continue;
		const variant = pickVariant(playlist, data.quality);
		if (!variant) continue;
		return {
			ok: true,
			url: variant.url,
			height: variant.height,
			login
		};
	} catch {
		continue;
	}
	return {
		ok: false,
		error: "Twitch не отдал поток. Канал мог выйти из эфира."
	};
});
var startTwitchDevice_createServerFn_handler = createServerRpc({
	id: "e8e546419ec19c531db61a94335e36f631d28730d89a1b78b6371983a1427714",
	name: "startTwitchDevice",
	filename: "src/lib/streams/twitch.ts"
}, (opts) => startTwitchDevice.__executeServer(opts));
var startTwitchDevice = createServerFn({ method: "POST" }).validator((input) => object({ clientId: clientSchema }).parse(input)).handler(startTwitchDevice_createServerFn_handler, async ({ data }) => {
	const res = await fetch("https://id.twitch.tv/oauth2/device", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: data.clientId,
			scopes: "chat:read"
		}),
		signal: AbortSignal.timeout(12e3)
	});
	const json = asRecord(await res.json().catch(() => null));
	if (!res.ok || !json || typeof json.device_code !== "string" || typeof json.user_code !== "string") return {
		ok: false,
		error: "Twitch не принял Client ID. Нужно публичное приложение с Device Code."
	};
	const verification = typeof json.verification_uri === "string" ? json.verification_uri : `https://www.twitch.tv/activate?public=true&device-code=${json.user_code}`;
	return {
		ok: true,
		deviceCode: json.device_code,
		userCode: json.user_code,
		verificationUri: verification,
		interval: typeof json.interval === "number" ? json.interval : 5,
		expiresIn: typeof json.expires_in === "number" ? json.expires_in : 1800
	};
});
var pollTwitchDevice_createServerFn_handler = createServerRpc({
	id: "b68944cbc0d62e65aba570036dff6cc518b8a87872c369aaec6cf7435873d152",
	name: "pollTwitchDevice",
	filename: "src/lib/streams/twitch.ts"
}, (opts) => pollTwitchDevice.__executeServer(opts));
var pollTwitchDevice = createServerFn({ method: "POST" }).validator((input) => object({
	clientId: clientSchema,
	deviceCode: string().min(8).max(512)
}).parse(input)).handler(pollTwitchDevice_createServerFn_handler, async ({ data }) => {
	const res = await fetch("https://id.twitch.tv/oauth2/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: data.clientId,
			device_code: data.deviceCode,
			grant_type: "urn:ietf:params:oauth:grant-type:device_code",
			scopes: "chat:read"
		}),
		signal: AbortSignal.timeout(12e3)
	});
	const json = asRecord(await res.json().catch(() => null));
	if (res.ok && json && typeof json.access_token === "string") {
		const scopes = Array.isArray(json.scope) ? json.scope.filter((item) => typeof item === "string") : ["chat:read"];
		return {
			ok: true,
			pending: false,
			accessToken: json.access_token,
			refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : "",
			expiresIn: typeof json.expires_in === "number" ? json.expires_in : 3600,
			scopes
		};
	}
	const message = typeof json?.message === "string" ? json.message : "";
	if (message === "authorization_pending" || message === "slow_down") return {
		ok: true,
		pending: true
	};
	if (message === "access_denied") return {
		ok: false,
		error: "Вход на Twitch отменён."
	};
	if (message === "expired_token") return {
		ok: false,
		error: "Код истёк. Запросите новый."
	};
	return {
		ok: false,
		error: "Не удалось завершить вход в Twitch."
	};
});
var refreshTwitchToken_createServerFn_handler = createServerRpc({
	id: "7f5f2ddf32825b1c3f9b35a7c6a7a8d6cdca6de4e96b667d065813807fa9129e",
	name: "refreshTwitchToken",
	filename: "src/lib/streams/twitch.ts"
}, (opts) => refreshTwitchToken.__executeServer(opts));
var refreshTwitchToken = createServerFn({ method: "POST" }).validator((input) => object({
	clientId: clientSchema,
	refreshToken: string().min(8).max(512)
}).parse(input)).handler(refreshTwitchToken_createServerFn_handler, async ({ data }) => {
	const res = await fetch("https://id.twitch.tv/oauth2/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: data.clientId,
			grant_type: "refresh_token",
			refresh_token: data.refreshToken
		}),
		signal: AbortSignal.timeout(12e3)
	});
	const json = asRecord(await res.json().catch(() => null));
	if (!res.ok || !json || typeof json.access_token !== "string") return { ok: false };
	return {
		ok: true,
		accessToken: json.access_token,
		refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : data.refreshToken,
		expiresIn: typeof json.expires_in === "number" ? json.expires_in : 3600
	};
});
var validateTwitchToken_createServerFn_handler = createServerRpc({
	id: "cd007a89114f7efbfd0e75082b75371289f151aea4b41b519dd489b69d48fd29",
	name: "validateTwitchToken",
	filename: "src/lib/streams/twitch.ts"
}, (opts) => validateTwitchToken.__executeServer(opts));
var validateTwitchToken = createServerFn({ method: "POST" }).validator((input) => object({ token: string().min(10).max(512) }).parse(input)).handler(validateTwitchToken_createServerFn_handler, async ({ data }) => {
	const res = await fetch("https://id.twitch.tv/oauth2/validate", {
		headers: { authorization: `OAuth ${data.token}` },
		signal: AbortSignal.timeout(12e3)
	});
	const json = asRecord(await res.json().catch(() => null));
	if (!res.ok || !json || typeof json.login !== "string") return { ok: false };
	const scopes = Array.isArray(json.scopes) ? json.scopes.filter((item) => typeof item === "string") : [];
	return {
		ok: true,
		login: json.login,
		scopes,
		expiresIn: typeof json.expires_in === "number" ? json.expires_in : 0
	};
});
function rememberEmote(map, code, emote) {
	if (!emote || typeof code !== "string") return;
	const name = code.trim();
	if (!name || name.length > 50 || map.has(name) || map.size >= 1500) return;
	if (!emote.url.startsWith("https://")) return;
	map.set(name, emote);
}
function bttvEmote(value) {
	const row = asRecord(value);
	const id = row?.id;
	const code = row?.code;
	if (typeof id !== "string" || typeof code !== "string") return null;
	const animated = row?.imageType === "gif";
	return {
		code,
		emote: {
			url: `https://cdn.betterttv.net/emote/${id}/2x.${animated ? "gif" : "png"}`,
			animated
		}
	};
}
function addBttv(map, list) {
	if (!Array.isArray(list)) return;
	for (const item of list) {
		const parsed = bttvEmote(item);
		if (parsed) rememberEmote(map, parsed.code, parsed.emote);
	}
}
function addFf(map, payload) {
	const sets = asRecord(asRecord(payload)?.sets);
	if (!sets) return;
	for (const set of Object.values(sets)) {
		const emotes = asRecord(set)?.emoticons;
		if (!Array.isArray(emotes)) continue;
		for (const item of emotes) {
			const row = asRecord(item);
			const urls = asRecord(row?.urls);
			const raw = urls?.["2"] || urls?.["4"] || urls?.["1"];
			if (typeof row?.name !== "string" || typeof raw !== "string") continue;
			const url = raw.startsWith("//") ? `https:${raw}` : raw;
			rememberEmote(map, row.name, {
				url,
				animated: url.includes(".gif")
			});
		}
	}
}
function addSeven(map, payload) {
	const list = asRecord(asRecord(payload)?.emote_set)?.emotes;
	if (!Array.isArray(list)) return;
	for (const item of list) {
		const row = asRecord(item);
		const data = asRecord(row?.data);
		const name = row?.name;
		if (!data || typeof name !== "string") continue;
		const host = asRecord(data.host)?.url;
		const id = data.id;
		let url = "";
		if (typeof host === "string" && host) url = `${host.startsWith("//") ? `https:${host}` : host}/2x.webp`;
		else if (typeof id === "string") url = `https://cdn.7tv.app/emote/${id}/2x.webp`;
		rememberEmote(map, name, url ? {
			url,
			animated: data.animated === true || url.endsWith(".gif")
		} : null);
	}
}
var twitchEmotes_createServerFn_handler = createServerRpc({
	id: "0f016e90d37a30449abdb56f15e68d1d6c28ba6ad53a2291adf980129d176d91",
	name: "twitchEmotes",
	filename: "src/lib/streams/twitch.ts"
}, (opts) => twitchEmotes.__executeServer(opts));
var twitchEmotes = createServerFn({ method: "POST" }).validator((input) => object({ login: loginSchema }).parse(input)).handler(twitchEmotes_createServerFn_handler, async ({ data }) => {
	const login = data.login.toLowerCase();
	const cached = emoteCache.get(login);
	if (cached && cached.exp > Date.now()) return { emotes: cached.emotes };
	const map = /* @__PURE__ */ new Map();
	try {
		const id = asRecord(asRecord(asRecord(await (await fetch("https://gql.twitch.tv/gql", {
			method: "POST",
			headers: {
				"client-id": WEB_CLIENT,
				"content-type": "application/json"
			},
			body: JSON.stringify({
				query: "query($login:String!){ user(login:$login){ id } }",
				variables: { login }
			}),
			signal: AbortSignal.timeout(8e3)
		})).json())?.data)?.user)?.id;
		if (typeof id !== "string") return { emotes: {} };
		const [globalBttv, channelBttv, ffz, seven] = await Promise.all([
			fetch("https://api.betterttv.net/3/cached/emotes/global", { signal: AbortSignal.timeout(8e3) }).then((res) => res.json()).catch(() => null),
			fetch(`https://api.betterttv.net/3/cached/users/twitch/${id}`, { signal: AbortSignal.timeout(8e3) }).then((res) => res.json()).catch(() => null),
			fetch(`https://api.frankerfacez.com/v1/room/id/${id}`, { signal: AbortSignal.timeout(8e3) }).then((res) => res.json()).catch(() => null),
			fetch(`https://7tv.io/v3/users/twitch/${id}`, { signal: AbortSignal.timeout(8e3) }).then((res) => res.json()).catch(() => null)
		]);
		addBttv(map, globalBttv);
		const channel = asRecord(channelBttv);
		addBttv(map, channel?.channelEmotes);
		addBttv(map, channel?.sharedEmotes);
		addFf(map, ffz);
		addSeven(map, seven);
	} catch {
		return { emotes: Object.fromEntries(map) };
	}
	const emotes = Object.fromEntries(map);
	emoteCache.set(login, {
		exp: Date.now() + 6e5,
		emotes
	});
	return { emotes };
});
//#endregion
export { pollTwitchDevice_createServerFn_handler, refreshTwitchToken_createServerFn_handler, resolveTwitchPlayback_createServerFn_handler, startTwitchDevice_createServerFn_handler, twitchEmotes_createServerFn_handler, validateTwitchToken_createServerFn_handler };
