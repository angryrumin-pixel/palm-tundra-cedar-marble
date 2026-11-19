const HOSTS = [".ttvnw.net", ".live-video.net"];

export function isStreamHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return HOSTS.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

export function proxied(url: string): string {
  if (!isStreamHost(url) || typeof window === "undefined") return url;
  const prefix = /^\/hds-[a-z0-9]+-\d+-[a-z0-9]+(?=\/|$)/i.exec(window.location.pathname)?.[0] ?? "";
  return `${prefix}/api/media?u=${encodeURIComponent(url)}`;
}
