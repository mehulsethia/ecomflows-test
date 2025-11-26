import { NextResponse } from "next/server";
import { buildFlowMetricsSnapshot } from "@/lib/klaviyo";
import { saveFlowMetricsSnapshot } from "@/lib/flowMetricsService";
import {
  getKlaviyoIntegrationForStore,
  getStoreById,
} from "@/lib/storeService";
import { logSync } from "@/lib/syncLogService";

type SyncRequestBody = {
  storeId?: string;
  metricId?: string;
};

const ENDPOINT = "https://a.klaviyo.com/api/flows/";

export async function POST(request: Request) {
  let storeId: string | undefined;
  try {
    console.log("[sync] POST /api/sync invoked");
    const body = (await request.json().catch(() => ({}))) as SyncRequestBody;
    storeId = body.storeId;
    const metricIdOverride =
      body.metricId && typeof body.metricId === "string" && body.metricId.trim().length > 0
        ? body.metricId.trim()
        : undefined;
    console.log("[sync] Incoming sync request", {
      storeId,
      metricIdOverride: metricIdOverride ?? null,
    });

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json(
        { error: "storeId is required" },
        { status: 400 },
      );
    }

    const store = await getStoreById(storeId);
    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 },
      );
    }

    const integration = await getKlaviyoIntegrationForStore(storeId);
    if (!integration || !integration.api_key) {
      return NextResponse.json(
        { error: "Klaviyo integration not configured for this store" },
        { status: 400 },
      );
    }

    const snapshot = await buildFlowMetricsSnapshot(storeId, integration.api_key, {
      metricIdOverride,
    });
    console.log("[sync] Snapshot built", {
      storeId,
      flows: snapshot.flows.length,
      profiles: snapshot.profiles.total_profiles,
      campaigns: snapshot.campaigns.length,
    });
    await saveFlowMetricsSnapshot(storeId, snapshot);
    console.log("[sync] Snapshot saved to DB", {
      storeId,
      flow_count: snapshot.flows.length,
      campaign_count: snapshot.campaigns.length,
      profiles_total: snapshot.profiles.total_profiles,
      profiles_active: snapshot.profiles.active_profiles,
      profiles_inactive: Math.max(
        0,
        snapshot.profiles.total_profiles - snapshot.profiles.active_profiles,
      ),
    });
    await logSync(storeId, "success", ENDPOINT, "Klaviyo sync successful");

    return NextResponse.json({
      synced: true,
      storeId,
      profiles: {
        total: snapshot.profiles?.total_profiles ?? 0,
        active: snapshot.profiles?.active_profiles ?? 0,
        suppressed: snapshot.profiles?.suppressed_profiles ?? 0,
        items: snapshot.profiles?.items?.length ?? 0,
      },
      notification: {
        title: "Sync complete",
        body: `Store ${storeId} synced successfully.`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sync] Sync failed", { storeId, error: message });
    if (storeId) {
      try {
        await logSync(storeId, "error", ENDPOINT, message);
      } catch {
        // ignore log failures
      }
    }

    return NextResponse.json(
      {
        error: message || "Unknown error",
        notification: { title: "Sync failed", body: message },
      },
      { status: 500 },
    );
  }
}
