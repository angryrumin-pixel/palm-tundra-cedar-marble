import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SETTINGS } from "@/lib/streams/reduce";
import type { Channel, Session, Settings, Snapshot, Take } from "@/lib/streams/types";

type PultState = {
  channels: Channel[];
  snapshots: Record<string, Snapshot>;
  sessions: Session[];
  takes: Take[];
  settings: Settings;
  selectedId: string;
  setSettings: (patch: Partial<Settings>) => void;
  addChannel: (channel: Channel) => void;
  removeChannel: (id: string) => void;
  toggleAuto: (id: string) => void;
  select: (id: string) => void;
  addMarker: (sessionId: string, note: string) => void;
  markTakeSaved: (takeId: string) => void;
  clearFinished: () => void;
};

export const usePult = create<PultState>()(
  persist(
    (set) => ({
      channels: [],
      snapshots: {},
      sessions: [],
      takes: [],
      settings: DEFAULT_SETTINGS,
      selectedId: "",
      setSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      addChannel: (channel) =>
        set((state) => {
          const duplicate = state.channels.find(
            (item) => item.platform === channel.platform && item.key === channel.key,
          );
          if (duplicate) return { selectedId: duplicate.id };
          return {
            channels: [channel, ...state.channels].slice(0, 12),
            selectedId: channel.id,
          };
        }),
      removeChannel: (id) =>
        set((state) => {
          const snapshots = { ...state.snapshots };
          delete snapshots[id];
          const channels = state.channels.filter((item) => item.id !== id);
          return {
            channels,
            snapshots,
            selectedId: state.selectedId === id ? (channels[0]?.id ?? "") : state.selectedId,
            sessions: state.sessions.map((session) =>
              session.channelId === id && session.endedAt === null
                ? { ...session, endedAt: Date.now() }
                : session,
            ),
          };
        }),
      toggleAuto: (id) =>
        set((state) => ({
          channels: state.channels.map((item) =>
            item.id === id ? { ...item, auto: !item.auto } : item,
          ),
        })),
      select: (id) => set({ selectedId: id }),
      addMarker: (sessionId, note) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, markers: [...session.markers, { t: Date.now(), note }].slice(-80) }
              : session,
          ),
        })),
      markTakeSaved: (takeId) =>
        set((state) => ({
          takes: state.takes.map((take) => (take.id === takeId ? { ...take, saved: true } : take)),
        })),
      clearFinished: () =>
        set((state) => ({
          sessions: state.sessions.filter((session) => session.endedAt === null),
          takes: state.takes.filter((take) => take.endedAt === null),
        })),
    }),
    {
      name: "pult-v1",
      skipHydration: true,
      partialize: (state) => ({
        channels: state.channels,
        sessions: state.sessions,
        takes: state.takes,
        settings: state.settings,
        selectedId: state.selectedId,
      }),
    },
  ),
);

type Toast = { id: string; text: string };

export const useToasts = create<{
  items: Toast[];
  push: (texts: string[]) => void;
  dismiss: (id: string) => void;
}>((set) => ({
  items: [],
  push: (texts) =>
    set((state) => ({
      items: [
        ...texts.filter(Boolean).map((text) => ({ id: crypto.randomUUID(), text })),
        ...state.items,
      ].slice(0, 4),
    })),
  dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}));
