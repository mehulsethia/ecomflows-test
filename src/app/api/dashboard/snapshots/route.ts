import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;
    const accessToken = bearerToken ?? null;

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Supabase admin client is not configured" },
        { status: 500 },
      );
    }

    const {
      data: userData,
      error: userError,
    } = await admin.auth.getUser(accessToken);
    if (userError || !userData.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = userData.user.id;

    const { data: stores, error: storesError } = await admin
      .from("stores")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (storesError) {
      return NextResponse.json({ error: storesError.message }, { status: 500 });
    }
    const storeIds = (stores ?? []).map((s) => (s as { id: string }).id);
    if (storeIds.length === 0) return NextResponse.json({ snapshots: [] });

    const { data: metricsData, error: metricsError } = await admin
      .from("flow_metrics")
      .select("store_id, raw, created_at")
      .in("store_id", storeIds)
      .order("created_at", { ascending: false });

    if (metricsError) {
      return NextResponse.json(
        { error: metricsError.message },
        { status: 500 },
      );
    }

    const latestPerStore = new Map<
      string,
      { store_id: string; raw: unknown; created_at: string | null }
    >();
    (metricsData ?? []).forEach((row) => {
      const typed = row as { store_id: string; raw: unknown; created_at: string | null };
      if (!latestPerStore.has(typed.store_id)) {
        latestPerStore.set(typed.store_id, typed);
      }
    });

    return NextResponse.json({ snapshots: Array.from(latestPerStore.values()) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
