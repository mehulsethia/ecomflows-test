import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import type { FlowMetricsSnapshot } from "@/lib/flowMetricsService";
import ProfilesTable from "@/components/ProfilesTable";
import DashboardSyncButton from "@/components/DashboardSyncButton";

type SnapshotRow = {
  store_id: string;
  raw: FlowMetricsSnapshot;
  created_at: string | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadSnapshots(): Promise<SnapshotRow[]> {
  const { data, error } = await supabase
    .from("flow_metrics")
    .select("store_id, raw, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch snapshots: ${error.message}`);
  const seen = new Set<string>();
  const latestPerStore: SnapshotRow[] = [];
  (data ?? []).forEach((row) => {
    const typed = row as SnapshotRow;
    if (!seen.has(typed.store_id)) {
      seen.add(typed.store_id);
      latestPerStore.push(typed);
    }
  });
  return latestPerStore;
}

function aggregateSnapshots(snapshots: SnapshotRow[]) {
  const profileItems = snapshots.flatMap((s) =>
    (s.raw?.profiles?.items ?? []).map((p) => ({
      ...p,
      store_id: s.store_id,
    })),
  );

  const totalProfiles =
    profileItems.length > 0
      ? profileItems.length
      : snapshots.reduce(
          (sum, s) =>
            sum +
            (s.raw?.profiles?.total_profiles ??
              s.raw?.audience?.total_profiles ??
              0),
          0,
        );
  const suppressedProfiles =
    profileItems.length > 0
      ? profileItems.filter((p) => p.is_suppressed).length
      : snapshots.reduce(
          (sum, s) =>
            sum +
            (s.raw?.profiles?.suppressed_profiles ??
              s.raw?.audience?.suppressed_profiles ??
              0),
          0,
        );
  const activeProfiles =
    profileItems.length > 0
      ? profileItems.filter((p) => p.is_active).length
      : snapshots.reduce((sum, s) => {
          const profileActive = s.raw?.profiles?.active_profiles;
          if (typeof profileActive === "number") return sum + profileActive;
          const audienceTotal = s.raw?.audience?.total_profiles;
          const audienceSuppressed = s.raw?.audience?.suppressed_profiles;
          if (typeof audienceTotal === "number" && typeof audienceSuppressed === "number") {
            return sum + Math.max(0, audienceTotal - audienceSuppressed);
          }
          return sum;
        }, 0);

  const activeFlows = snapshots.reduce(
    (sum, s) =>
      sum +
      (s.raw?.flows ?? []).filter((f) => {
        const status = (f as { status?: string }).status;
        return typeof status === "string" && status.toLowerCase() === "live";
      }).length,
    0,
  );
  const activeCampaigns = snapshots.reduce(
    (sum, s) =>
      sum +
      (s.raw?.campaigns ?? []).filter((c) => {
        const status = (c as { status?: string }).status;
        return typeof status === "string" && status.toLowerCase() === "live";
      }).length,
    0,
  );

  return {
    stores: snapshots.length,
    profiles: {
      total: totalProfiles,
      active: activeProfiles,
      suppressed: suppressedProfiles,
      list: profileItems,
    },
    activeFlows,
    activeCampaigns,
  };
}

export default async function DashboardPage() {
  const snapshots = await loadSnapshots();
  const agg = aggregateSnapshots(snapshots);
  const primaryStoreId = snapshots[0]?.store_id;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/50">
              Overview
            </p>
            <h1 className="heading">Dashboard</h1>
          </div>
          <DashboardSyncButton storeId={primaryStoreId} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <CardStat title="Stores" value={agg.stores} hint="Total stores with data" />
          <CardStat
            title="Active flows"
            value={agg.activeFlows.toLocaleString()}
            hint="Flows with live status"
          />
          <CardStat
            title="Active campaigns"
            value={agg.activeCampaigns.toLocaleString()}
            hint="Campaigns in latest snapshot"
          />
        </div>

        <div className="border-t border-white/10" />

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <CardStat
              title="Profiles"
              value={agg.profiles.total.toLocaleString()}
              hint="Total profiles"
            />
            <CardStat
              title="Active profiles"
              value={agg.profiles.active.toLocaleString()}
              hint="Klaviyo marketing consented"
            />
            <CardStat
              title="Suppressed"
              value={agg.profiles.suppressed.toLocaleString()}
              hint="Suppressed/unsubscribed"
            />
          </div>
          <div className="glass-card rounded-2xl border border-white/10 p-6">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-lg font-semibold text-white">Profiles</h2>
              <div className="flex items-center gap-3 text-xs text-white/60">
                <span>Progress to 4k</span>
                <Progress value={Math.min(100, Math.round((agg.profiles.total / 4000) * 100))} />
              </div>
            </div>
            <ProfilesTable profiles={agg.profiles.list} perPage={25} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function CardStat({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="glass-card rounded-2xl border border-white/10 p-5">
      <p className="text-sm text-white/60">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs text-[#b78deb]">{hint}</p>
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="w-36">
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>Progress to 4k</span>
        <span className="text-[#b78deb]">{value}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-[#b78deb]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
