"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const [stores, setStores] = useState<StoreWithStatus[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const prompt = searchParams.get("prompt");
  const needsStorePrompt = prompt === "store";
  const needsKlaviyoPrompt = prompt === "klaviyo";
  const hasStores = stores.length > 0;
  const hasAnyKlaviyo = stores.some((s) => Boolean(s.klaviyo));
  const showPrompt =
    (needsStorePrompt && !hasStores) ||
    (needsKlaviyoPrompt && (!hasStores || !hasAnyKlaviyo));

  useEffect(() => {
    const load = async () => {
      setStoresLoading(true);
      const { data: storesData, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false });

      if (storeError) {
        console.error("Failed to load stores", storeError);
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
      setStoresLoading(false);
    };

    void load();
  }, []);

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

        {showPrompt && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-50">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-200/70">
                Action needed
              </p>
              <p className="text-base font-semibold text-white">
                {needsStorePrompt
                  ? "Add your Shopify store to finish setup."
                  : "Connect your Klaviyo API key to start syncing."}
              </p>
              <p className="text-sm text-white/80">
                We detected you don&apos;t have a{" "}
                {needsStorePrompt ? "store" : "Klaviyo connection"} yet. Add it
                below to continue.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4" id="stores-section">
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

      </div>
    </AppLayout>
  );
}
