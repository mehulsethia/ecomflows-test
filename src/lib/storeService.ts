import { supabase } from "./supabaseClient";
import { getSupabaseAdmin } from "./supabaseAdmin";

export type Store = {
  id: string;
  user_id: string | null;
  name: string;
  shop_domain: string | null;
  created_at: string | null;
};

export type Integration = {
  id: string;
  store_id: string;
  integration_type: string;
  api_key: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

export async function createStore({
  name,
  shopDomain,
  userId = null,
}: {
  name: string;
  shopDomain?: string | null;
  userId?: string | null;
}) {
  // Use the service role if available to bypass RLS issues on insert.
  const client = getSupabaseAdmin() ?? supabase;

  const { data, error } = await client
    .from("stores")
    .insert({
      name,
      shop_domain: shopDomain ?? null,
      user_id: userId,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create store: ${error.message}`);
  return data as Store;
}

export async function getStoreById(storeId: string) {
  const client = getSupabaseAdmin() ?? supabase;

  const { data, error } = await client
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch store: ${error.message}`);
  return data as Store | null;
}

export async function getStores() {
  const client = getSupabaseAdmin() ?? supabase;

  const { data, error } = await client
    .from("stores")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch stores: ${error.message}`);
  return (data ?? []) as Store[];
}

export async function getKlaviyoIntegrationForStore(storeId: string) {
  const client = getSupabaseAdmin() ?? supabase;

  const { data, error } = await client
    .from("integrations")
    .select("*")
    .eq("store_id", storeId)
    .eq("integration_type", "KLAVIYO")
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch integration: ${error.message}`);
  return data as Integration | null;
}

export async function getIntegrationsForStores(storeIds: string[]) {
  if (storeIds.length === 0) return [];
  const client = getSupabaseAdmin() ?? supabase;

  const { data, error } = await client
    .from("integrations")
    .select("*")
    .in("store_id", storeIds);

  if (error) throw new Error(`Failed to fetch integrations: ${error.message}`);
  return (data ?? []) as Integration[];
}

export async function upsertKlaviyoIntegration(storeId: string, apiKey: string) {
  const client = getSupabaseAdmin() ?? supabase;
  // Check existing integration first to avoid depending on DB constraints
  const existing = await getKlaviyoIntegrationForStore(storeId);
  if (existing) {
    const { error } = await client
      .from("integrations")
      .update({ api_key: apiKey, metadata: { provider: "klaviyo" } })
      .eq("id", existing.id);
    if (error) throw new Error(`Failed to update integration: ${error.message}`);
    return { ...existing, api_key: apiKey };
  }

  const { data, error } = await client
    .from("integrations")
    .insert({
      store_id: storeId,
      integration_type: "KLAVIYO",
      api_key: apiKey,
      metadata: { provider: "klaviyo" },
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create integration: ${error.message}`);
  return data as Integration;
}
