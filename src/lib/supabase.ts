import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (client) return client;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase credentials are missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.",
    );
  }

  client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}
