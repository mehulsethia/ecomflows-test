import { supabase } from "./supabaseClient";

export type FlowMetricsRow = {
  id: string;
  store_id: string;
  raw: unknown;
  created_at: string | null;
};

export type FlowMetricsSnapshot = {
  store_id: string;
  synced_at: string;
  period: {
    from: string;
    to: string;
  };
  overview: {
    total_revenue_30d: number;
    flow_revenue_30d: number;
    campaign_revenue_30d: number;
    emails_sent_30d: number;
    avg_open_rate_30d: number;
    avg_click_rate_30d: number;
  };
  flows: Array<{
    flow_id: string;
    flow_name: string;
    emails_sent_30d: number;
    opens_30d: number;
    clicks_30d: number;
    placed_orders_30d: number;
    revenue_30d: number;
    open_rate_30d: number;
    click_rate_30d: number;
    placed_order_rate_30d: number;
    status: string;
  }>;
  campaigns: Array<{
    campaign_id: string;
    name: string;
    subject: string;
    send_date: string;
    emails_sent: number;
    opens: number;
    clicks: number;
    placed_orders: number;
    revenue: number;
    open_rate: number;
    click_rate: number;
    placed_order_rate: number;
    unsubscribe_rate: number;
    status?: string;
  }>;
  audience: {
    total_profiles: number;
    new_profiles_7d: number;
    new_profiles_30d: number;
    unsubscribes_7d: number;
    unsubscribes_30d: number;
    suppressed_profiles: number;
    list_size_timeseries: Array<{
      date: string;
      total_profiles: number;
    }>;
  };
  deliverability: {
    bounce_rate_30d: number;
    spam_complaint_rate_30d: number;
    unsubscribe_rate_30d: number;
  };
  revenue_timeseries: Array<{
    date: string;
    flow_revenue: number;
    campaign_revenue: number;
    total_revenue: number;
  }>;
  meta?: {
    revenue_metric_id?: string | null;
    revenue_currency?: string;
  };
  profiles: {
    total_profiles: number;
    active_profiles: number;
    suppressed_profiles: number;
    items: Array<{
      id: string;
      name: string;
      email: string;
      phone?: string;
      created_at: string;
      updated_at: string;
      location?: string;
      is_active?: boolean;
      is_suppressed?: boolean;
    }>;
  };
  revenue_by_range?: Record<
    string,
    {
      total_revenue: number;
      series: Array<{ date: string; total_revenue: number }>;
    }
  >;
  total_revenue_7d?: number;
  total_revenue_90d?: number;
};

export async function saveFlowMetrics(storeId: string, snapshot: FlowMetricsSnapshot) {
  const flowCount = snapshot.flows.length;
  const campaignCount = snapshot.campaigns.length;
  const profilesTotal = snapshot.profiles.total_profiles;
  const profilesActive = snapshot.profiles.active_profiles;
  const profilesInactive = Math.max(0, profilesTotal - profilesActive);

  const { error } = await supabase.from("flow_metrics").insert({
    store_id: storeId,
    raw: snapshot,
    flow_count: flowCount,
    campaign_count: campaignCount,
    profiles_total: profilesTotal,
    profiles_active: profilesActive,
    profiles_inactive: profilesInactive,
  });

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }
}

export async function saveFlowMetricsSnapshot(
  storeId: string,
  snapshot: FlowMetricsSnapshot,
) {
  return saveFlowMetrics(storeId, snapshot);
}

export async function getLatestFlowMetrics(storeId: string) {
  const { data, error } = await supabase
    .from("flow_metrics")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch flow metrics: ${error.message}`);
  }
  return data as FlowMetricsRow | null;
}

export async function getLatestFlowMetricsSnapshot(storeId: string) {
  const row = await getLatestFlowMetrics(storeId);
  if (!row) return null;
  return row.raw as FlowMetricsSnapshot;
}
