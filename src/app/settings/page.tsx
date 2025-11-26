"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import ConnectKlaviyo from "@/components/ConnectKlaviyo";
import ConnectStoreCard from "@/components/ConnectStoreCard";
import SyncNowButton from "@/components/SyncNowButton";
import { supabase } from "@/lib/supabaseClient";
import type { Integration, Store } from "@/lib/storeService";
import type { SyncLogRow } from "@/lib/syncLogService";

type StoreWithStatus = Store & {
  klaviyo?: Integration | null;
  latestLog: SyncLogRow | null;
};

function formatRelative(dateString: string | null) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function deriveStatus(log: SyncLogRow | null) {
  if (!log)
    return {
      label: "Never synced",
      className: "bg-white/5 border-white/10 text-white/70",
    };
  if (log.status === "success") {
    return {
      label: "OK",
      className: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
    };
  }
  return {
    label: "Error",
    className: "bg-amber-400/20 text-amber-100 border-amber-400/40",
  };
}

export default function SettingsPage() {
  const [stores, setStores] = useState<StoreWithStatus[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [klaviyoKey, setKlaviyoKey] = useState("");
  const [shopDomain, setShopDomain] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [storesLoading, setStoresLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setStoresLoading(true);
      const { data: storesData, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false });

      if (storeError) {
        setError(storeError.message);
        setStoresLoading(false);
        return;
      }

      const ids = (storesData ?? []).map((s) => (s as Store).id);
      if (ids.length === 0) {
        setStores([]);
        setStoresLoading(false);
        return;
      }

      const [{ data: logs }, { data: integrations }] = await Promise.all([
        supabase
          .from("sync_logs")
          .select("*")
          .in("store_id", ids)
          .order("created_at", { ascending: false }),
        supabase
          .from("integrations")
          .select("*")
          .eq("integration_type", "KLAVIYO")
          .in("store_id", ids),
      ]);

      const latestByStore = new Map<string, SyncLogRow>();
      (logs as SyncLogRow[] | null)?.forEach((log) => {
        if (!latestByStore.has(log.store_id)) {
          latestByStore.set(log.store_id, log);
        }
      });

      const klaviyoByStore = new Map<string, Integration>();
      (integrations as Integration[] | null)?.forEach((integration) => {
        if (!klaviyoByStore.has(integration.store_id)) {
          klaviyoByStore.set(integration.store_id, integration);
        }
      });

      const withIntegration: StoreWithStatus[] = (storesData ?? []).map((s) => {
        const store = s as Store;
        return {
          ...store,
          klaviyo:
            (integrations ?? []).find(
              (i) => (i as Integration).store_id === store.id,
            ) ?? null,
          latestLog: latestByStore.get(store.id) ?? null,
        };
      });

      setStores(withIntegration);
      if (withIntegration[0]) {
        setSelectedStore(withIntegration[0].id);
        setShopDomain(withIntegration[0].shop_domain ?? "");
      }
      setStoresLoading(false);
    };

    void load();
  }, []);

  const currentStore = stores.find((s) => s.id === selectedStore);

  const handleSaveKlaviyo = async () => {
    if (!selectedStore) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: selectedStore,
        integrationType: "KLAVIYO",
        apiKey: klaviyoKey,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save Klaviyo key");
      return;
    }
    setMessage("Klaviyo key updated.");
  };

  const handleDisconnectKlaviyo = async () => {
    if (!selectedStore) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/integrations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: selectedStore,
        integrationType: "KLAVIYO",
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to disconnect Klaviyo");
      return;
    }
    setMessage("Klaviyo disconnected.");
  };

  const handleSaveStore = async () => {
    if (!selectedStore) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/stores/${selectedStore}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopDomain }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to update store");
      return;
    }
    setMessage("Store updated.");
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">
            Settings
          </p>
          <h1 className="heading text-3xl">Settings</h1>
          <p className="mt-2 text-sm text-white/60">
            Manage your stores and Klaviyo connections in one place.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Stores</p>
              <p className="text-lg font-semibold text-white">
                Manage store sync and Klaviyo connections
              </p>
            </div>
          </div>

          {storesLoading ? (
            <div className="rounded-2xl border border-white/10 bg-[#0b101b]/60 p-6 text-sm text-white/70">
              Loading stores...
            </div>
          ) : stores.length === 0 ? (
            <ConnectStoreCard />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#17223e]/80 shadow-2xl shadow-black/40 backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#b78deb]/60">
              <table className="min-w-full text-left text-sm text-white/80">
                <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/50">
                  <tr>
                    <th className="px-6 py-4">Store</th>
                    <th className="px-6 py-4">Last sync</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Klaviyo</th>
                    <th className="px-6 py-4 text-right">Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stores.map((store) => {
                    const { label, className } = deriveStatus(store.latestLog);
                    return (
                      <tr
                        key={store.id}
                        className="transition hover:bg-white/5 hover:text-white"
                      >
                        <td className="px-6 py-4 font-medium">
                          <Link
                            className="text-[#b78deb] hover:underline"
                            href={`/stores/${store.id}`}
                          >
                            {store.name}
                          </Link>
                          <p className="text-xs text-white/50">
                            {store.shop_domain ?? "No domain set"}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-white/60">
                          {formatRelative(store.latestLog?.created_at ?? null)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
                          >
                            {label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <ConnectKlaviyo
                            storeId={store.id}
                            hasIntegration={Boolean(store.klaviyo)}
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <SyncNowButton
                            storeId={store.id}
                            disabled={!store.klaviyo}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-white/60">Select store</p>
              <p className="text-lg font-semibold text-white">
                {currentStore ? currentStore.name : "No store selected"}
              </p>
            </div>
            <select
              value={selectedStore}
              onChange={(e) => {
                setSelectedStore(e.target.value);
                const next = stores.find((s) => s.id === e.target.value);
                setShopDomain(next?.shop_domain ?? "");
              }}
              className="w-full max-w-xs rounded-lg border border-white/10 bg-[#0b101b] px-3 py-2 text-sm text-white outline-none transition focus:border-[#b78deb] focus:ring-2 focus:ring-[#b78deb]/40"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id} className="bg-[#0b101b]">
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#0b101b]/60 p-4">
              <p className="text-sm text-white/60">Klaviyo API key</p>
              <div className="mt-3 space-y-3">
                <input
                  value={klaviyoKey}
                  onChange={(e) => setKlaviyoKey(e.target.value)}
                  placeholder="pk_..."
                  className="w-full rounded-lg border border-white/10 bg-[#0b101b] px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-[#b78deb] focus:ring-2 focus:ring-[#b78deb]/40"
                />
                <div className="flex gap-2">
                  <button
                    className="btn px-4 py-2 text-sm"
                    onClick={handleSaveKlaviyo}
                    disabled={loading || !klaviyoKey}
                  >
                    Save key
                  </button>
                  <button
                    className="btn px-4 py-2 text-sm"
                    onClick={handleDisconnectKlaviyo}
                    disabled={loading}
                  >
                    Disconnect
                  </button>
                </div>
                <p className="text-xs text-white/50">
                  Current status: {currentStore?.klaviyo ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b101b]/60 p-4">
              <p className="text-sm text-white/60">Shopify domain</p>
              <div className="mt-3 space-y-3">
                <input
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  placeholder="your-store.myshopify.com"
                  className="w-full rounded-lg border border-white/10 bg-[#0b101b] px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-[#b78deb] focus:ring-2 focus:ring-[#b78deb]/40"
                />
                <div className="flex gap-2">
                  <button
                    className="btn px-4 py-2 text-sm"
                    onClick={handleSaveStore}
                    disabled={loading || !selectedStore}
                  >
                    Save domain
                  </button>
                </div>
                <p className="text-xs text-white/50">
                  Store domain is used for Shopify connection metadata.
                </p>
              </div>
            </div>
          </div>

          {message && (
            <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
