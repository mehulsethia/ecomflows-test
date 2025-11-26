"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addNotification } from "./TopBar";

type Props = {
  storeId: string;
  disabled?: boolean;
};

export default function SyncNowButton({ storeId, disabled }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleSync = async () => {
    setError(null);
    setStatus("Starting sync and fetching data.");
    setLoading(true);
    console.log("[sync-button] Triggering sync", { storeId });
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId }),
    });
    console.log("[sync-button] /api/sync response", {
      status: res.status,
      ok: res.ok,
    });
    setLoading(false);
    setStatus(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("[sync-button] Sync failed", body);
      setError(body.error ?? "Sync failed");
      addNotification({
        id: `sync-fail-${Date.now()}`,
        title: "Sync failed",
        body: body.error ?? "Sync failed",
        createdAt: new Date().toISOString(),
      });
      return;
    }

    const body = await res.json().catch(() => ({}));
    console.log("[sync-button] Sync succeeded", body);
    if (body?.notification) {
      addNotification({
        id: `sync-${Date.now()}`,
        title: body.notification.title ?? "Sync complete",
        body: body.notification.body ?? "Data synced successfully.",
        createdAt: new Date().toISOString(),
      });
    }
    addNotification({
      id: `sync-profiles-${Date.now()}`,
      title: "Profiles refreshed",
      body: "Profiles and metrics have been pulled. Latest counts are now live.",
      createdAt: new Date().toISOString(),
    });

    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={disabled || loading}
        className="btn px-4 py-2 text-xs"
      >
        {loading ? "Syncing..." : "Sync now"}
      </button>
      {status && (
        <div className="max-w-md rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-right text-xs text-white/70">
          {status} This can take a moment; you will be notified once completed.
        </div>
      )}
      {error && (
        <div className="max-w-md rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-right text-xs text-red-100">
          {error}
        </div>
      )}
    </div>
  );
}
