"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { FlowMetricsSnapshot } from "@/lib/flowMetricsService";
import ProfilesTable from "@/components/ProfilesTable";
import DashboardSyncButton from "@/components/DashboardSyncButton";

type SnapshotRow = {
  store_id: string;
  raw: FlowMetricsSnapshot;
  created_at: string | null;
};

type ApiResponse =
  | { snapshots: SnapshotRow[]; error?: undefined }
  | { snapshots?: undefined; error: string };

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
          if (
            typeof audienceTotal === "number" &&
            typeof audienceSuppressed === "number"
          ) {
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

export default function DashboardClient() {
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session?.access_token) {
          throw new Error("Not authenticated");
        }

        const res = await fetch("/api/dashboard/snapshots", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          credentials: "omit",
        });

        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(text.slice(0, 200) || "Unexpected response");
        }

        const json = (await res.json()) as ApiResponse;
        if (!res.ok || json.error) {
          throw new Error(json.error ?? "Failed to load dashboard data");
        }
        setSnapshots(json.snapshots ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  const agg = aggregateSnapshots(snapshots);
  const primaryStoreId = snapshots[0]?.store_id;

  return (
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

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

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
              <Progress
                value={Math.min(100, Math.round((agg.profiles.total / 4000) * 100))}
              />
            </div>
          </div>
          <ProfilesTable profiles={agg.profiles.list} perPage={25} />
        </div>
      </div>
    </div>
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
        <span>{value}%</span>
        <span>100%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-[#b78deb] to-[#6dd5fa]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
