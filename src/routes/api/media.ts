import { createFileRoute } from "@tanstack/react-router";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function allowed(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  const host = url.hostname;
  return host.endsWith(".ttvnw.net") || host.endsWith(".live-video.net");
}

async function pull(target: string, hops = 0): Promise<Response> {
  const current = new URL(target);
  if (!allowed(current)) return new Response("forbidden", { status: 403 });
  const upstream = await fetch(current, {
    headers: { "user-agent": UA, accept: "*/*" },
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
  if (upstream.status >= 300 && upstream.status < 400 && hops < 3) {
    const location = upstream.headers.get("location");
    if (!location) return new Response("bad redirect", { status: 502 });
    return pull(new URL(location, current).toString(), hops + 1);
  }
  const length = Number(upstream.headers.get("content-length") || "0");
  if (length > 25_000_000) return new Response("too large", { status: 502 });
  const type = upstream.headers.get("content-type") || "application/octet-stream";
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": type,
      "cache-control": "no-store",
    },
  });
}

export const Route = createFileRoute("/api/media")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("u") || "";
        let target: URL;
        try {
          target = new URL(raw);
        } catch {
          return new Response("bad url", { status: 400 });
        }
        if (!allowed(target)) return new Response("forbidden", { status: 403 });
        try {
          return await pull(target.toString());
        } catch {
          return new Response("upstream failed", { status: 502 });
        }
      },
    },
  },
});
