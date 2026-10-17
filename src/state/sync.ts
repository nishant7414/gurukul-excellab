export const SYNC_CHANNEL = "gurukul-excellab-state";

export interface SyncHooks {
  storageKey: string;
  /** Return false to ignore a payload (older than the live store). */
  applyRaw: (raw: string, source: "storage" | "broadcast") => boolean;
}

/** Keep supported local state aligned across tabs. This is not cross-device sync. */
export function startStateSync(hooks: SyncHooks): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== hooks.storageKey || e.storageArea !== localStorage) return;
    if (!e.newValue) return;
    hooks.applyRaw(e.newValue, "storage");
  };
  window.addEventListener("storage", onStorage);

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(SYNC_CHANNEL);
      channel.onmessage = (ev: MessageEvent) => {
        const data = ev.data;
        if (!data || data.type !== "state" || typeof data.raw !== "string") return;
        hooks.applyRaw(data.raw, "broadcast");
      };
    } catch {
      channel = null;
    }
  }

  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
}

export function broadcastState(raw: string): void {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL);
    ch.postMessage({ type: "state", raw });
    ch.close();
  } catch {
    /* ignore */
  }
}
