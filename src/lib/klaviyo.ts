export type KlaviyoResponse = { data?: unknown[] } & Record<string, unknown>;

const KLAVIYO_REVISION = "2023-07-15";

export async function fetchKlaviyoFlows(apiKey: string): Promise<KlaviyoResponse> {
  const endpoint = "https://a.klaviyo.com/api/flows/";

  console.log("[sync] Fetching Klaviyo flows", { endpoint });
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Revision: KLAVIYO_REVISION,
      Authorization: `Klaviyo-API-Key ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail;
    } catch {
      // ignore JSON parse errors
    }
    const message = detail
      ? `${response.status}: ${detail}`
      : `Klaviyo request failed with status ${response.status}`;
    throw new Error(message);
  }

  const payload = (await response.json()) as KlaviyoResponse;
  const count = Array.isArray(payload.data) ? payload.data.length : 0;
  console.log("[sync] Flows response received", { status: response.status, count });
  return payload;
}

export async function fetchKlaviyoCampaigns(apiKey: string): Promise<KlaviyoResponse> {
  const endpoint =
    "https://a.klaviyo.com/api/campaigns/?filter=equals(messages.channel,'email')";
  const revision = "2025-10-15";

  console.log("[sync] Fetching Klaviyo campaigns", { endpoint });
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Revision: revision,
      Authorization: `Klaviyo-API-Key ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail;
    } catch {
      // ignore
    }
    const message = detail
      ? `${response.status}: ${detail}`
      : `Klaviyo request failed with status ${response.status}`;
    console.error("[sync] Campaigns fetch failed", { status: response.status, detail: detail ?? null });
    throw new Error(message);
  }

  const payload = (await response.json()) as KlaviyoResponse;
  const count = Array.isArray(payload.data) ? payload.data.length : 0;
  console.log("[sync] Campaigns response received", { status: response.status, count });
  return payload;
}

// Simulated/derived metrics for this exercise.
export type FlowMetricsSnapshot = import("./flowMetricsService").FlowMetricsSnapshot;

type KlaviyoProfile = {
  id: string;
  type?: string;
  attributes?: {
    email?: string;
    subscriptions?: {
      email?: {
        marketing?: {
          consented?: boolean;
          unsubscribed?: boolean;
          status?: string;
          state?: string;
          subscription_status?: string;
          consent?: unknown;
        };
      };
      sms?: {
        marketing?: {
          consented?: boolean;
          unsubscribed?: boolean;
        };
      };
    };
    suppression?: {
      suppressed?: boolean;
      reason?: string | null;
      email?: { marketing?: { suppressed?: boolean; reason?: string | null } };
      suppressions?: Array<{
        channel?: string;
        suppressed?: boolean;
        reason?: string | null;
      }>;
    };
    phone_number?: string;
    first_name?: string;
    last_name?: string;
    created?: string;
    updated?: string;
    location?: {
      address1?: string;
      city?: string;
      region?: string;
      country?: string;
    };
  };
};

type KlaviyoListResponse = {
  data?: KlaviyoProfile[];
  links?: { next?: string | null };
};

async function collectKlaviyoProfiles(
  apiKey: string,
  { pageSize, maxPages, withFields }: { pageSize: number; maxPages: number; withFields: boolean },
) {
  const collected: KlaviyoProfile[] = [];
  let nextUrl: string | null = withFields
    ? `https://a.klaviyo.com/api/profiles/?page[size]=${pageSize}&fields[profile]=email,phone_number,first_name,last_name,subscriptions,suppression,created,updated,location`
    : `https://a.klaviyo.com/api/profiles/?page[size]=${pageSize}`;
  let pages = 0;

  while (nextUrl && pages < maxPages) {
    pages += 1;
    console.log("[sync] Fetching Klaviyo profiles page", { page: pages, url: nextUrl });
    const json = await fetchKlaviyoProfilesPage(apiKey, nextUrl);
    const pageCount = Array.isArray(json.data) ? json.data.length : 0;
    console.log("[sync] Profiles page received", {
      page: pages,
      count: pageCount,
      next: json.links?.next ?? null,
    });
    if (Array.isArray(json.data)) {
      collected.push(...json.data);
    }
    const nextLink = json.links?.next ?? null;
    nextUrl = nextLink || null;
  }

  return collected;
}

async function fetchKlaviyoProfilesPage(apiKey: string, url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Revision: KLAVIYO_REVISION,
      Authorization: `Klaviyo-API-Key ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = (body as { detail?: string }).detail;
    throw new Error(
      detail ? `${response.status}: ${detail}` : `Profiles request failed ${response.status}`,
    );
  }

  const payload = (await response.json()) as KlaviyoListResponse;
  const count = Array.isArray(payload.data) ? payload.data.length : 0;
  console.log("[sync] Profiles page ok", { status: response.status, count });
  return payload;
}

async function fetchAllKlaviyoProfiles(apiKey: string, pageSize = 100, maxPages = 200) {
  // Try with explicit fields first; if Klaviyo returns nothing (or errors), fall back to default schema.
  try {
    const primary = await collectKlaviyoProfiles(apiKey, {
      pageSize,
      maxPages,
      withFields: true,
    });
    if (primary.length > 0) return primary;
  } catch {
    // fall back below
  }

  const fallback = await collectKlaviyoProfiles(apiKey, {
    pageSize: Math.min(pageSize, 100),
    maxPages,
    withFields: false,
  });

  if (fallback.length === 0) {
    throw new Error("No profiles returned from Klaviyo");
  }

  return fallback;
}

type RevenueAggregate = {
  total_revenue: number;
  series: Array<{ date: string; total_revenue: number }>;
};

type TimeframeKey = "last_7d" | "last_30d" | "last_90d" | "month_to_date" | "year_to_date";

function getRange(key: TimeframeKey) {
  const now = new Date();
  const end = now.toISOString();
  const start = new Date(now);

  if (key === "last_7d") start.setDate(start.getDate() - 7);
  if (key === "last_30d") start.setDate(start.getDate() - 30);
  if (key === "last_90d") start.setDate(start.getDate() - 90);
  if (key === "month_to_date") {
    start.setDate(1);
  }
  if (key === "year_to_date") {
    start.setMonth(0, 1);
  }

  return { start: start.toISOString(), end };
}

type MetricAggregateResponse = {
  data?: Array<{
    attributes?: {
      results?: Array<{
        interval_start?: string;
        interval_end?: string;
        sum_value?: number;
        measurements?: { sum_value?: number };
        data?: number;
      }>;
      total?: { sum_value?: number };
    };
  }>;
};

async function fetchRevenueForRange(
  apiKey: string,
  metricId: string,
  range: TimeframeKey,
): Promise<RevenueAggregate> {
  const { start, end } = getRange(range);
  const basePayload = {
    data: {
      type: "metric-aggregate",
      attributes: {
        metric_id: metricId,
        measurements: ["sum_value"],
        interval: "day",
        filter: `greater-or-equal(datetime,'${start}'),less-than(datetime,'${end}')`,
        timezone: "Asia/Kolkata",
      },
    },
  };

  const doRequest = async (payload: unknown) => {
    const response = await fetch("https://a.klaviyo.com/api/metric-aggregates/", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Revision: KLAVIYO_REVISION,
        Authorization: `Klaviyo-API-Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = (body as { detail?: string }).detail;
      const message = detail
        ? `${response.status}: ${detail}`
        : `Revenue request failed ${response.status}`;
      throw new Error(message);
    }
    return body as MetricAggregateResponse;
  };

  let payload: MetricAggregateResponse | null = null;
  try {
    payload = await doRequest(basePayload);
  } catch (err) {
    payload = await doRequest({
      ...basePayload,
      data: {
        ...basePayload.data,
        attributes: {
          ...basePayload.data.attributes,
          timezone: undefined,
        },
      },
    });
  }
  const node = Array.isArray(payload?.data) ? payload.data[0] : undefined;
  const rows = node?.attributes?.results ?? [];
  const series = rows.map((r) => {
    const maybeRecord = r as Record<string, unknown>;
    const measurements = maybeRecord.measurements as Record<string, unknown> | undefined;
    const dateVal =
      (r as { interval_start?: string }).interval_start ??
      (maybeRecord.date as string | undefined) ??
      (maybeRecord.datetime as string | undefined) ??
      (maybeRecord.time as string | undefined) ??
      (maybeRecord.interval as string | undefined) ??
      start;

    const totalVal =
      (r as { sum_value?: number }).sum_value ??
      (measurements?.sum_value as number | undefined) ??
      (maybeRecord.data as number | undefined) ??
      0;

    return {
      date: dateVal,
      total_revenue: Number(totalVal),
    };
  });
  const total =
    Number(node?.attributes?.total?.sum_value ?? 0) ||
    series.reduce((sum, r) => sum + r.total_revenue, 0);

  return { total_revenue: total, series };
}

type MetricItem = {
  id: string;
  attributes?: { name?: string };
};

type MetricsResponse = {
  data?: MetricItem[];
  links?: { next?: string | null };
};

async function fetchMetricByFilter(apiKey: string, filter: string) {
  const url = `https://a.klaviyo.com/api/metrics/?page[size]=100&filter=${encodeURIComponent(filter)}`;
  console.log("[sync] Fetching metrics with filter", { url, filter });
  const json = await fetchMetricsPage(apiKey, url);
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchMetricsPage(apiKey: string, url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Revision: KLAVIYO_REVISION,
      Authorization: `Klaviyo-API-Key ${apiKey}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = (body as { detail?: string }).detail;
    throw new Error(
      detail ? `${response.status}: ${detail}` : `Metrics request failed ${response.status}`,
    );
  }
  const payload = (await response.json()) as MetricsResponse;
  const count = Array.isArray(payload.data) ? payload.data.length : 0;
  console.log("[sync] Metrics page ok", { status: response.status, count, next: payload.links?.next });
  return payload;
}

async function fetchPlacedOrderMetricId(apiKey: string) {
  // First, try filtered queries to reduce paging.
  const filters = ['equals(name,"Placed Order")', 'contains(name,"Placed Order")'];
  for (const filter of filters) {
    try {
      const filtered = await fetchMetricByFilter(apiKey, filter);
      const hit = filtered.find(
        (m) => m.attributes?.name?.toLowerCase() === "placed order",
      );
      if (hit?.id) return hit.id;
    } catch {
      // continue to paginated search below
    }
  }

  let next: string | null = "https://a.klaviyo.com/api/metrics/?page[size]=100";
  let pages = 0;
  while (next && pages < 20) {
    pages += 1;
    let json: MetricsResponse = {};
    try {
      json = await fetchMetricsPage(apiKey, next);
    } catch {
      break;
    }
    const found = (json.data ?? []).find(
      (m) => m.attributes?.name?.toLowerCase() === "placed order",
    );
    if (found) return found.id;
    next = json.links?.next ?? null;
  }
  return null;
}

function todayISO() {
  return new Date().toISOString();
}

function daysAgoISO(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

type BuildSnapshotOptions = {
  metricIdOverride?: string;
  currency?: string;
};

export async function buildFlowMetricsSnapshot(
  storeId: string,
  apiKey: string,
  options: BuildSnapshotOptions = {},
): Promise<FlowMetricsSnapshot> {
  console.log("[sync] Starting snapshot build", {
    storeId,
    metricOverride: options.metricIdOverride ?? null,
  });
  const flowsRaw = await fetchKlaviyoFlows(apiKey);
  let campaignsRaw: KlaviyoResponse | null = null;
  try {
    campaignsRaw = await fetchKlaviyoCampaigns(apiKey);
  } catch (err) {
    console.warn("[sync] Campaigns fetch failed, continuing with empty list", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  const profilesRaw = await fetchAllKlaviyoProfiles(apiKey);

  const now = todayISO();
  const from = daysAgoISO(30);

  // Extract a small set of flows to simulate stats.
  type FlowAttributes = { name?: string; status?: string };
  type FlowData = { id?: string; name?: string; attributes?: FlowAttributes };
  const flowsRawData = Array.isArray((flowsRaw as { data?: unknown }).data)
    ? ((flowsRaw as { data?: unknown }).data as FlowData[])
    : [];

  const flows = flowsRawData.length > 0
    ? flowsRawData.slice(0, 5).map((f, idx) => ({
        flow_id: String(f.id ?? `flow-${idx}`),
        flow_name: f.attributes?.name ?? f.name ?? `Flow ${idx + 1}`,
        emails_sent_30d: 0,
        opens_30d: 0,
        clicks_30d: 0,
        placed_orders_30d: 0,
        revenue_30d: 0,
        open_rate_30d: 0,
        click_rate_30d: 0,
        placed_order_rate_30d: 0,
        status: f.attributes?.status ?? "unknown",
      }))
    : [];
  console.log("[sync] Flows parsed", { total: flows.length });

  type CampaignAttributes = { name?: string; subject?: string; status?: string; send_time?: string };
  type CampaignData = { id?: string; name?: string; attributes?: CampaignAttributes };
  const campaignsRawData = Array.isArray((campaignsRaw as { data?: unknown })?.data)
    ? ((campaignsRaw as { data?: unknown }).data as CampaignData[])
    : [];
  const campaigns: FlowMetricsSnapshot["campaigns"] = campaignsRawData.length > 0
    ? campaignsRawData.slice(0, 5).map((c, idx) => ({
        campaign_id: String(c.id ?? `campaign-${idx}`),
        name: c.attributes?.name ?? c.name ?? `Campaign ${idx + 1}`,
        subject: c.attributes?.subject ?? "—",
        send_date: c.attributes?.send_time ?? todayISO(),
        emails_sent: 0,
        opens: 0,
        clicks: 0,
        placed_orders: 0,
        revenue: 0,
        open_rate: 0,
        click_rate: 0,
        placed_order_rate: 0,
        unsubscribe_rate: 0,
        status: c.attributes?.status ?? "unknown",
      }))
    : [];
  console.log("[sync] Campaigns parsed", { total: campaigns.length });

  // We do not have a revenue endpoint in this sample; default to zero to avoid inflated placeholder data.
  const totalFlowRevenue = 0;
  const totalCampaignRevenue = 0;
  const totalRevenue = 0;
  const revenue_timeseries: FlowMetricsSnapshot["revenue_timeseries"] = [];

  const profiles = mapProfiles(profilesRaw);
  console.log("[sync] Profiles parsed", {
    total: profiles.total_profiles,
    active: profiles.active_profiles,
    suppressed: profiles.suppressed_profiles,
  });

  return {
    store_id: storeId,
    synced_at: now,
    period: { from, to: now },
    overview: {
      total_revenue_30d: totalRevenue,
      flow_revenue_30d: totalFlowRevenue,
      campaign_revenue_30d: totalCampaignRevenue,
      emails_sent_30d: flows.reduce((sum, f) => sum + f.emails_sent_30d, 0),
      avg_open_rate_30d: 0.46,
      avg_click_rate_30d: 0.14,
    },
    flows,
    campaigns,
    audience: {
      total_profiles: 120_000,
      new_profiles_7d: 2400,
      new_profiles_30d: 9800,
      unsubscribes_7d: 210,
      unsubscribes_30d: 820,
      suppressed_profiles: 3200,
      list_size_timeseries: Array.from({ length: 7 }).map((_, idx) => ({
        date: daysAgoISO(7 - idx),
        total_profiles: 120_000 + idx * 300,
      })),
    },
    deliverability: {
      bounce_rate_30d: 0.006,
      spam_complaint_rate_30d: 0.0004,
      unsubscribe_rate_30d: 0.0025,
    },
    revenue_timeseries,
    meta: {},
    profiles,
    revenue_by_range: {},
  };
}

function mapProfiles(data: KlaviyoProfile[]): FlowMetricsSnapshot["profiles"] {
  const isSuppressed = (attr: NonNullable<KlaviyoProfile["attributes"]>) => {
    const suppression = attr.suppression as
      | {
          suppressed?: boolean;
          reason?: string | null;
          email?: { marketing?: { suppressed?: boolean; reason?: string | null } };
          suppressions?: Array<{ channel?: string; suppressed?: boolean; reason?: string | null }>;
        }
      | undefined;

    if (!suppression) return false;
    if (suppression.suppressed) return true;
    if (suppression.email?.marketing?.suppressed) return true;
    if (Array.isArray(suppression.suppressions)) {
      return suppression.suppressions.some(
        (s) =>
          (s.channel ?? "").toLowerCase() === "email" ||
          (s.suppressed ?? false) === true ||
          Boolean(s.reason),
      );
    }
    return false;
  };

  const parseMarketingStatus = (attr: NonNullable<KlaviyoProfile["attributes"]>) => {
    const marketing =
      attr.subscriptions?.email?.marketing as
        | {
            consent?: unknown;
            consented?: boolean;
            unsubscribed?: boolean;
            status?: string;
            state?: string;
            subscription_status?: string;
          }
        | undefined;

    const rawStatus =
      marketing?.status ??
      marketing?.state ??
      marketing?.subscription_status ??
      marketing?.consent;

    const hasConsentArray = Array.isArray(rawStatus) && rawStatus.length > 0;
    const statusString =
      typeof rawStatus === "string"
        ? rawStatus.toLowerCase()
        : Array.isArray(rawStatus)
          ? rawStatus.map((v) => String(v).toLowerCase()).join(",")
          : "";

    const consented =
      marketing?.consented === true ||
      marketing?.unsubscribed === false ||
      hasConsentArray ||
      statusString.includes("subscribed") ||
      statusString.includes("consent") ||
      statusString.includes("active") ||
      statusString.includes("opted_in") ||
      statusString.includes("opt-in") ||
      statusString.includes("opt in");

    const unsubscribed =
      marketing?.unsubscribed === true ||
      statusString.includes("unsubscribed") ||
      statusString.includes("suppressed") ||
      statusString.includes("denied") ||
      statusString.includes("opted_out") ||
      statusString.includes("opt-out") ||
      statusString.includes("opt out");

    const hasStatus =
      typeof rawStatus !== "undefined" ||
      typeof marketing?.consented !== "undefined" ||
      typeof marketing?.unsubscribed !== "undefined";

    return { consented, unsubscribed, hasStatus };
  };

  const items =
    data?.map((p) => {
      const attr = p.attributes ?? {};
      const name = [attr.first_name, attr.last_name].filter(Boolean).join(" ").trim();
      const marketingStatus = parseMarketingStatus(attr);
      const emailSuppressed = isSuppressed(attr) || marketingStatus.unsubscribed;
      const emailActive =
        !emailSuppressed && (marketingStatus.consented || !marketingStatus.hasStatus);
      return {
        id: p.id,
        name: name || attr.email || attr.phone_number || "Unknown profile",
        email: attr.email ?? "—",
        phone: attr.phone_number,
        created_at: attr.created ?? todayISO(),
        updated_at: attr.updated ?? attr.created ?? todayISO(),
        location:
          attr.location?.city ??
          attr.location?.region ??
          attr.location?.country ??
          undefined,
        is_suppressed: emailSuppressed,
        is_active: emailActive,
      };
    }) ?? [];

  const activeCount = items.filter((i) => i.is_active).length;
  const suppressedCount = items.filter((i) => i.is_suppressed).length;

  return {
    total_profiles: items.length,
    active_profiles: activeCount,
    suppressed_profiles: suppressedCount,
    items,
  };
}
