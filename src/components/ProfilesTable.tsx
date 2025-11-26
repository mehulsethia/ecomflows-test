"use client";

import { useMemo, useState } from "react";
import type { FlowMetricsSnapshot } from "@/lib/flowMetricsService";

type Props = {
  profiles: FlowMetricsSnapshot["profiles"]["items"];
  perPage?: number;
};

export default function ProfilesTable({ profiles, perPage = 25 }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(profiles.length / perPage));

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toISOString().slice(0, 10);
  };

  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage;
    return profiles.slice(start, start + perPage);
  }, [page, perPage, profiles]);

  const goTo = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
  };

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h2 className="text-lg font-semibold text-white">Profiles</h2>
        <div className="text-xs text-white/60">
          Page {page} / {totalPages}
        </div>
      </div>
      <div className="mt-3 overflow-auto">
        <table className="min-w-full text-left text-sm text-white/80">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/50">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {pageItems.map((p) => (
              <tr key={p.id} className="hover:bg-white/5">
                <td className="px-3 py-2 font-semibold text-white">{p.name}</td>
                <td className="px-3 py-2 text-[#b78deb]">{p.email}</td>
                <td className="px-3 py-2 text-white/70">{p.phone ?? "—"}</td>
                <td className="px-3 py-2 text-white/60">
                  {formatDate(p.created_at)}
                </td>
                <td className="px-3 py-2 text-white/60">
                  {formatDate(p.updated_at)}
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-sm text-white/60" colSpan={5}>
                  No profiles yet. Run a sync.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-white/60">
        <button
          className="underline-offset-4 transition hover:text-white hover:underline disabled:cursor-not-allowed disabled:text-white/30"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
        >
          Prev
        </button>
        <button
          className="underline-offset-4 transition hover:text-white hover:underline disabled:cursor-not-allowed disabled:text-white/30"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
