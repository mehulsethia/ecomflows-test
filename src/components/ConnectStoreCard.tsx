"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { addNotification } from "./TopBar";

type Props = {
  onCreated?: () => void;
};

export default function ConnectStoreCard({ onCreated }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [shopDomain, setShopDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    const nameClean = name.trim();
    const domainClean = shopDomain.trim();

    if (!nameClean || !domainClean) {
      setLoading(false);
      setError("Store name and shop domain are required.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user?.id) {
      setLoading(false);
      setError("You must be logged in to add a store.");
      return;
    }

    const res = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameClean,
        shopDomain: domainClean,
        userId: userData.user.id,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create store");
      await addNotification({
        id: `store-error-${Date.now()}`,
        title: "Store connection failed",
        body: body.error ?? "Failed to create store",
        createdAt: new Date().toISOString(),
      });
      return;
    }
    await addNotification({
      id: `store-success-${Date.now()}`,
      title: "Store connected",
      body: `${nameClean} connected successfully.`,
      createdAt: new Date().toISOString(),
    });
    router.refresh();
    onCreated?.();
    setName("");
    setShopDomain("");
  };

  const disabled = loading || !name.trim() || !shopDomain.trim();

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white">Connect a store</h3>
      <p className="mt-2 text-sm text-white/60">
        Add your Shopify (or other) store to start syncing Klaviyo data.
      </p>

      <div className="mt-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Store name"
            className="flex-1 rounded-lg border border-white/10 bg-[#0b101b] px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#b78deb] focus:ring-2 focus:ring-[#b78deb]/40"
          />
          <input
            value={shopDomain}
            onChange={(e) => setShopDomain(e.target.value)}
            placeholder="shop-domain.myshopify.com"
            className="flex-1 rounded-lg border border-white/10 bg-[#0b101b] px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#b78deb] focus:ring-2 focus:ring-[#b78deb]/40"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled}
            className="btn w-full justify-center md:w-40"
          >
            {loading ? "Connecting..." : "Connect store"}
          </button>
        </div>
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
