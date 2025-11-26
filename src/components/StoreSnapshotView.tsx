"use client";

import { useMemo, useState } from "react";
import type { FlowMetricsSnapshot } from "@/lib/flowMetricsService";

type Props = {
  snapshot: FlowMetricsSnapshot;
};

const ranges = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Year-to-date", days: 365 },
];

function isWithinDays(date: string, days: number) {
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return target >= cutoff;
}

export default function StoreSnapshotView({ snapshot }: Props) {
  const [range, setRange] = useState(ranges[1]); // default 30d

  const activeFlows = useMemo(
    () =>
      snapshot.flows.filter((f) => {
        const status = (f.status ?? "").toLowerCase();
        return status === "live" || status === "active";
      }).length,
    [snapshot.flows],
  );

  const activeCampaigns = useMemo(
    () =>
      snapshot.campaigns.filter((c) => {
        const status = ((c as { status?: string }).status ?? "").toLowerCase();
        if (!status) return true;
        return ["live", "active", "scheduled", "sending", "sent"].includes(status);
      }).length,
    [snapshot.campaigns],
  );

  const filteredProfiles = useMemo(() => {
    return snapshot.profiles.items.filter((p) => isWithinDays(p.created_at, range.days));
  }, [snapshot.profiles.items, range]);

  const topFlows = useMemo(() => {
    return [...snapshot.flows]
      .sort((a, b) => b.emails_sent_30d - a.emails_sent_30d)
      .slice(0, 5);
  }, [snapshot.flows]);

  const profileProgress = Math.min(
    100,
    Math.round((snapshot.profiles.total_profiles / 4000) * 100),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">
            Latest snapshot
          </p>
          <p className="text-xs text-white/50">
            Synced at {new Date(snapshot.synced_at).toLocaleString()}
          </p>
        </div>
        <select
          className="w-full max-w-xs rounded-lg border border-white/10 bg-[#0b101b] px-3 py-2 text-sm text-white outline-none transition focus:border-[#b78deb] focus:ring-2 focus:ring-[#b78deb]/40"
          value={range.days}
          onChange={(e) => {
            const selected = ranges.find((r) => r.days === Number(e.target.value));
            if (selected) setRange(selected);
          }}
        >
          {ranges.map((r) => (
            <option key={r.days} value={r.days} className="bg-[#0b101b]">
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat title="Active flows" value={activeFlows.toLocaleString()} />
        <Stat title="Active campaigns" value={activeCampaigns.toLocaleString()} />
        <Stat title="Profiles" value={snapshot.profiles.total_profiles.toLocaleString()} />
        <Stat
          title="Avg open rate (30d)"
          value={`${(snapshot.overview.avg_open_rate_30d * 100).toFixed(1)}%`}
        />
        <Stat
          title="Avg click rate (30d)"
          value={`${(snapshot.overview.avg_click_rate_30d * 100).toFixed(1)}%`}
        />
        <Stat
          title="Emails sent (30d)"
          value={snapshot.overview.emails_sent_30d.toLocaleString()}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#17223e] p-5 shadow-lg shadow-black/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60">Profiles</p>
            <p className="text-2xl font-semibold text-white">
              {snapshot.profiles.total_profiles.toLocaleString()} total
            </p>
            <p className="text-xs text-white/50">
              Active: {snapshot.profiles.active_profiles.toLocaleString()} ·
              Suppressed: {snapshot.profiles.suppressed_profiles.toLocaleString()}
            </p>
          </div>
          <div className="w-48">
            <div className="text-xs text-white/60 mb-2">Progress to 4,000</div>
            <div className="h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-[#b78deb]"
                style={{ width: `${profileProgress}%` }}
              />
            </div>
            <div className="mt-1 text-right text-xs text-white/50">
              {profileProgress}% of target
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Showing profiles created in {range.label}</span>
            <span>{filteredProfiles.length} shown</span>
          </div>
          <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#0b101b]/60">
            <div className="grid grid-cols-4 gap-3 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-white/50">
              <div>Name</div>
              <div>Email</div>
              <div>Created</div>
              <div className="text-right">Updated</div>
            </div>
            <div className="divide-y divide-white/10">
              {filteredProfiles.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-4 gap-3 px-4 py-2 text-sm text-white/80"
                >
                  <div className="truncate">{p.name}</div>
                  <div className="truncate text-[#b78deb]">{p.email}</div>
                  <div className="text-white/60">
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-right text-white/60">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {filteredProfiles.length === 0 && (
                <div className="px-4 py-4 text-sm text-white/60">
                  No profiles in this range.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#17223e] p-5 shadow-lg shadow-black/30">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-lg font-semibold text-white">Top flows (by sends)</h3>
          <span className="text-xs text-white/50">Filtered by {range.label}</span>
        </div>
        <div className="divide-y divide-white/10">
          {topFlows.map((flow) => (
            <div
              key={flow.flow_id}
              className="grid gap-3 px-2 py-3 text-sm text-white/80 md:grid-cols-4"
            >
              <div className="md:col-span-2">
                <p className="font-semibold text-white">{flow.flow_name}</p>
                <p className="text-xs text-white/50">{flow.status}</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Emails sent (30d)</p>
                <p className="font-semibold">{flow.emails_sent_30d.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Open / Click</p>
                <p className="font-semibold">
                  {(flow.open_rate_30d * 100).toFixed(1)}% /{" "}
                  {(flow.click_rate_30d * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="rounded-2xl border border-white/10 bg-[#17223e] p-5 shadow-lg shadow-black/30">
        <summary className="cursor-pointer text-sm font-semibold text-white">
          Raw snapshot JSON
        </summary>
        <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs text-white/70">
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b101b]/60 p-3">
      <p className="text-xs text-white/50">{title}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
