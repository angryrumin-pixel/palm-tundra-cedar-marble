import { create } from "zustand";
import { refreshTwitchToken } from "@/lib/streams/twitch";

const CLIENT_KEY = "pult-twitch-client";
const AUTH_KEY = "pult-twitch-auth";

export type TwitchSession = {
  clientId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  login: string;
  scopes: string[];
};

type AuthState = {
  clientId: string;
  auth: TwitchSession | null;
  ready: boolean;
  setClientId: (clientId: string) => void;
  setAuth: (auth: TwitchSession | null) => void;
};

export const useTwitchAuth = create<AuthState>((set) => ({
  clientId: "",
  auth: null,
  ready: false,
  setClientId: (clientId) => {
    try {
      localStorage.setItem(CLIENT_KEY, clientId.trim());
    } catch {
      // ignore
    }
    set({ clientId: clientId.trim() });
  },
  setAuth: (auth) => {
    try {
      if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
      else localStorage.removeItem(AUTH_KEY);
    } catch {
      // ignore
    }
    set({ auth });
  },
}));

export function hydrateTwitchAuth() {
  if (useTwitchAuth.getState().ready || typeof localStorage === "undefined") return;
  let clientId = "";
  let auth: TwitchSession | null = null;
  try {
    clientId = localStorage.getItem(CLIENT_KEY) || "";
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TwitchSession;
      if (parsed?.accessToken && parsed.clientId) auth = parsed;
    }
  } catch {
    auth = null;
  }
  useTwitchAuth.setState({ clientId, auth, ready: true });
}

export async function currentTwitchCredential(): Promise<{ clientId?: string; token?: string }> {
  const auth = useTwitchAuth.getState().auth;
  if (!auth?.accessToken || !auth.clientId) return {};
  if (auth.expiresAt - Date.now() > 60_000) {
    return { clientId: auth.clientId, token: auth.accessToken };
  }
  if (!auth.refreshToken) return { clientId: auth.clientId, token: auth.accessToken };
  const next = await refreshTwitchToken({ data: { clientId: auth.clientId, refreshToken: auth.refreshToken } });
  if (!next.ok) {
    useTwitchAuth.getState().setAuth(null);
    return {};
  }
  const updated: TwitchSession = {
    ...auth,
    accessToken: next.accessToken,
    refreshToken: next.refreshToken,
    expiresAt: Date.now() + next.expiresIn * 1000,
  };
  useTwitchAuth.getState().setAuth(updated);
  return { clientId: updated.clientId, token: updated.accessToken };
}
