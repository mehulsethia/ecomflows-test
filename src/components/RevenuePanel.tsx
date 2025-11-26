"use client";

import { useMemo, useState } from "react";
import type { FlowMetricsSnapshot } from "@/lib/flowMetricsService";

type SnapshotRow = {
  store_id: string;
  raw: FlowMetricsSnapshot;
};

const ranges = [
  { value: "last_7d", label: "Last 7 days" },
  { value: "last_30d", label: "Last 30 days" },
  { value: "last_90d", label: "Last 90 days" },
  { value: "month_to_date", label: "Month to date" },
  { value: "year_to_date", label: "Year to date" },
];

export default function RevenuePanel({
  snapshots,
  currency,
}: {
  snapshots: SnapshotRow[];
  currency: string;
}) {
  const [range, setRange] = useState(ranges[1].value);

  const { total, series } = useMemo(() => {
    const seriesMap = new Map<string, number>();
    let total = 0;
    snapshots.forEach((s) => {
      const revenueRange = s.raw.revenue_by_range?.[range];
      if (revenueRange) {
        total += revenueRange.total_revenue;
        revenueRange.series.forEach((point) => {
          const current = seriesMap.get(point.date) ?? 0;
          seriesMap.set(point.date, current + point.total_revenue);
        });
      }
    });
    const mergedSeries = Array.from(seriesMap.entries())
      .map(([date, value]) => ({ date: date.slice(0, 10), total_revenue: value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return { total, series: mergedSeries };
  }, [snapshots, range]);

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-white/60">Revenue</p>
          <p className="text-3xl font-semibold text-white">
            {formatCurrency(total, currency)}
          </p>
          <p className="text-xs text-white/50">Across stores · {labelForRange(range)}</p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-white/10 bg-[#0b101b] px-3 py-2 text-sm text-white outline-none transition focus:border-[#b78deb] focus:ring-2 focus:ring-[#b78deb]/40"
        >
          {ranges.map((r) => (
            <option key={r.value} value={r.value} className="bg-[#0b101b]">
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-[#0b101b]/60">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Revenue over time</h3>
          <span className="text-xs text-white/50">Daily, merged</span>
        </div>
        <div className="divide-y divide-white/10">
          {series.length === 0 ? (
            <div className="flex h-28 items-center justify-center text-sm text-white/50">
              No data yet. Run a sync.
            </div>
          ) : (
            series.slice(-12).map((point) => (
              <div
                key={point.date}
                className="flex items-center justify-between px-4 py-2 text-sm text-white/80"
              >
                <span>{point.date}</span>
                <span className="font-semibold text-white">
                  {formatCurrency(point.total_revenue, currency)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function labelForRange(val: string) {
  const found = ranges.find((r) => r.value === val);
  return found ? found.label : val;
}
