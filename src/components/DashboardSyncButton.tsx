"use client";

import SyncNowButton from "@/components/SyncNowButton";

type Props = { storeId?: string | null };

export default function DashboardSyncButton({ storeId }: Props) {
  if (!storeId) {
    return (
      <button
        type="button"
        disabled
        className="btn px-4 py-2 text-xs opacity-70"
        title="Connect a store to sync"
      >
        Sync now
      </button>
    );
  }

  return <SyncNowButton storeId={storeId} />;
}
