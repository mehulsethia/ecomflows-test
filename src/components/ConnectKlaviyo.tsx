"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addNotification } from "./TopBar";

type Props = {
  storeId: string;
  hasIntegration: boolean;
  onSaved?: () => void;
};

export default function ConnectKlaviyo({ storeId, hasIntegration, onSaved }: Props) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleSave = async () => {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        integrationType: "KLAVIYO",
        apiKey,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save integration");
      await addNotification({
        id: `klaviyo-error-${Date.now()}`,
        title: "Klaviyo connection failed",
        body: body.error ?? "Failed to save integration",
        createdAt: new Date().toISOString(),
      });
      return;
    }
    await addNotification({
      id: `klaviyo-success-${Date.now()}`,
      title: "Klaviyo connected",
      body: "API key saved and connection established.",
      createdAt: new Date().toISOString(),
    });
    setApiKey("");
    setOpen(false);
    router.refresh();
    onSaved?.();
  };

  if (hasIntegration && !open) {
    return (
      <div className="flex items-center gap-3 text-xs text-emerald-200">
        Connected to Klaviyo
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-white hover:border-[#b78deb]"
        >
          Update key
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Klaviyo API key"
            className="w-full rounded-lg border border-white/10 bg-[#0b101b] px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-[#b78deb] focus:ring-2 focus:ring-[#b78deb]/40"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !apiKey.trim()}
            className="btn px-4 py-2 text-xs"
          >
            {loading ? "Saving" : hasIntegration ? "Update" : "Connect"}
          </button>
        </div>
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}
    </div>
  );
}
