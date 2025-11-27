import { supabase } from "./supabaseClient";
import { getSupabaseAdmin } from "./supabaseAdmin";

export type SyncStatus = "success" | "error";

export type SyncLogRow = {
  id: string;
  store_id: string;
  status: SyncStatus;
  endpoint: string | null;
  message: string | null;
  created_at: string | null;
};

export async function logSync(
  storeId: string,
  status: SyncStatus,
  endpoint: string,
  message: string | null,
) {
  const client = getSupabaseAdmin() ?? supabase;

  const { error } = await client.from("sync_logs").insert({
    store_id: storeId,
    status,
    endpoint,
    message,
  });

  if (error) {
    throw new Error(`Failed to log sync: ${error.message}`);
  }
}

export async function getLatestSyncLog(storeId: string) {
  const client = getSupabaseAdmin() ?? supabase;

  const { data, error } = await client
    .from("sync_logs")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch sync log: ${error.message}`);
  }
  return data as SyncLogRow | null;
}

export async function getSyncLogCounts() {
  const client = getSupabaseAdmin() ?? supabase;

  const { count, error } = await client
    .from("sync_logs")
    .select("*", { count: "exact", head: true });

  if (error) throw new Error(`Failed to count sync logs: ${error.message}`);
  return count ?? 0;
}
