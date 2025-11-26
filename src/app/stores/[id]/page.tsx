import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import ConnectKlaviyo from "@/components/ConnectKlaviyo";
import SyncNowButton from "@/components/SyncNowButton";
import StoreSnapshotView from "@/components/StoreSnapshotView";
import type {
  FlowMetricsRow,
  FlowMetricsSnapshot,
} from "@/lib/flowMetricsService";
import type { Integration, Store } from "@/lib/storeService";

type PageProps = {
  params: { id: string };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function countFlows(raw: unknown) {
  if (raw && typeof raw === "object" && (raw as FlowMetricsSnapshot).flows) {
    return (raw as FlowMetricsSnapshot).flows.length;
  }
  if (raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)) {
    const dataField = (raw as { data?: unknown }).data;
    if (Array.isArray(dataField)) return dataField.length;
  }
  if (Array.isArray(raw)) return raw.length;
  return null;
}

async function loadStore(id: string) {
  const { data: store, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch store: ${error.message}`);
  return store as Store | null;
}

async function loadLatestMetrics(storeId: string) {
  const { data, error } = await supabase
    .from("flow_metrics")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch flow metrics: ${error.message}`);
  return data as FlowMetricsRow | null;
}

async function loadKlaviyoIntegration(storeId: string) {
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("store_id", storeId)
    .eq("integration_type", "KLAVIYO")
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch integration: ${error.message}`);
  return data as Integration | null;
}

export default async function StoreDetailPage({ params }: PageProps) {
  const store = await loadStore(params.id);
  const latestMetrics = store ? await loadLatestMetrics(store.id) : null;
  const klaviyo = store ? await loadKlaviyoIntegration(store.id) : null;
  const snapshot = latestMetrics?.raw as FlowMetricsSnapshot | undefined;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">
            Store
          </p>
          <h1 className="heading">{store ? store.name : "Store not found"}</h1>
          <p className="mt-2 text-sm text-white/60">
            {store
              ? "Latest synced Klaviyo flows data."
              : "Could not load this store."}
          </p>
        </div>

        {store ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#17223e] p-5 shadow-lg shadow-black/30">
                <p className="text-sm text-white/60">Store domain</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {store.shop_domain ?? "—"}
                </p>
                <p className="mt-2 text-xs text-[#b78deb]">Linked shop</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#17223e] p-5 shadow-lg shadow-black/30">
                <p className="text-sm text-white/60">Latest flow payload</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {latestMetrics ? "Received" : "Not yet"}
                </p>
                <p className="mt-2 text-xs text-[#b78deb]">
                  {latestMetrics?.created_at
                    ? new Date(latestMetrics.created_at).toLocaleString()
                    : "No sync recorded"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#17223e] p-5 shadow-lg shadow-black/30">
                <p className="text-sm text-white/60">Flows count</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {latestMetrics ? countFlows(latestMetrics.raw) ?? "—" : "0"}
                </p>
                <p className="mt-2 text-xs text-[#b78deb]">
                  Derived from Klaviyo flows response
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#17223e] p-5 shadow-lg shadow-black/30">
                <p className="text-sm text-white/60">Klaviyo integration</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {klaviyo ? "Connected" : "Not connected"}
                </p>
                <p className="mt-2 text-xs text-[#b78deb]">
                  {klaviyo ? "Update API key below" : "Connect to sync flows"}
                </p>
                <div className="mt-4">
                  <ConnectKlaviyo
                    storeId={store.id}
                    hasIntegration={Boolean(klaviyo)}
                  />
                  <div className="mt-4">
                    <SyncNowButton
                      storeId={store.id}
                      disabled={!klaviyo}
                    />
                  </div>
                </div>
              </div>
            </div>

            {snapshot ? (
              <StoreSnapshotView snapshot={snapshot} />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#17223e] p-6 text-white/70 shadow-lg shadow-black/30">
                No data synced yet. Trigger a sync to see metrics.
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#17223e] p-6 text-white/70 shadow-lg shadow-black/30">
            Store could not be found.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
