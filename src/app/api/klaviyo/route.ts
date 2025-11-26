import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

type KlaviyoMetric = {
  id: string;
  metric: string;
  name: string;
  value: number;
  timestamp: string;
};

type KlaviyoRaw = Record<string, unknown>;
type KlaviyoPayload = { data: KlaviyoRaw[] };

function isKlaviyoPayload(payload: unknown): payload is KlaviyoPayload {
  return (
    Boolean(payload) &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  );
}

const fallbackData: KlaviyoMetric[] = [
  {
    id: "demo-1",
    metric: "Placed Order",
    name: "Order #4821",
    value: 482,
    timestamp: new Date().toISOString(),
  },
  {
    id: "demo-2",
    metric: "Started Checkout",
    name: "Checkout started",
    value: 320,
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: "demo-3",
    metric: "Email Opened",
    name: "Flow email opened",
    value: 1,
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

function normalizePayload(payload: unknown): KlaviyoMetric[] {
  let rawCandidates: unknown[] = [];
  if (Array.isArray(payload)) {
    rawCandidates = payload;
  } else if (isKlaviyoPayload(payload)) {
    rawCandidates = payload.data;
  }

  const items = (rawCandidates as unknown[]).filter(
    (item): item is KlaviyoRaw =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );

  return items.slice(0, 10).map((item, index) => {
    const metric =
      (item.metric as KlaviyoRaw | undefined) ??
      (item.metric_name as KlaviyoRaw | undefined);
    const properties = item.properties as KlaviyoRaw | undefined;
    const aggregation = metric?.aggregation as KlaviyoRaw | undefined;

    const rawValue =
      (item.value as number | string | undefined) ??
      (properties?.value as number | string | undefined) ??
      (aggregation?.value as number | string | undefined);

    return {
      id: String(
        (item.id as string | undefined) ??
          (item.event_id as string | undefined) ??
          `klaviyo-${index}`,
      ),
      metric:
        (metric?.name as string | undefined) ??
        (item.metric_name as string | undefined) ??
        (item.event as string | undefined) ??
        (item.name as string | undefined) ??
        "Metric",
      name:
        (item.event as string | undefined) ??
        (item.name as string | undefined) ??
        "Event",
      value: Number(rawValue ?? index + 1),
      timestamp:
        (item.timestamp as string | undefined) ??
        (item.datetime as string | undefined) ??
        (item.occurred_at as string | undefined) ??
        new Date().toISOString(),
    };
  });
}

async function fetchKlaviyoSnapshot(): Promise<{
  data: KlaviyoMetric[];
  source: "klaviyo" | "fallback";
  warning?: string;
}> {
  const apiKey = process.env.KLAVIYO_API_KEY;
  const metricId = process.env.KLAVIYO_METRIC_ID ?? "metric-id";

  if (!apiKey) {
    return {
      data: fallbackData,
      source: "fallback",
      warning: "KLAVIYO_API_KEY not set. Returning mock data.",
    };
  }

  try {
    const response = await fetch(
      `https://a.klaviyo.com/api/v1/metric/${metricId}/export`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Klaviyo-API-Key ${apiKey}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Klaviyo responded with ${response.status}`);
    }

    const payload = await response.json();
    const data = normalizePayload(payload);
    return { data, source: "klaviyo" };
  } catch (error) {
    return {
      data: fallbackData,
      source: "fallback",
      warning: `Klaviyo fetch failed: ${String(error)}`,
    };
  }
}

export async function GET() {
  const { data, source, warning } = await fetchKlaviyoSnapshot();
  let supabaseStatus: { stored: number; message?: string } | null = null;

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("klaviyo_events")
      .upsert(
        data.map((item) => ({
          id: item.id,
          metric: item.metric,
          name: item.name,
          value: item.value,
          timestamp: item.timestamp,
        })),
        { onConflict: "id" },
      );

    supabaseStatus = error
      ? { stored: 0, message: error.message }
      : { stored: data.length, message: "Upserted into klaviyo_events" };
  } catch (error) {
    supabaseStatus = {
      stored: 0,
      message: `Skipped Supabase write: ${String(error)}`,
    };
  }

  return NextResponse.json({
    source,
    warning,
    count: data.length,
    items: data,
    supabase: supabaseStatus,
  });
}
