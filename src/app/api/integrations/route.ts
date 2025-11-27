import { NextResponse } from "next/server";
import { upsertKlaviyoIntegration } from "@/lib/storeService";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type UpsertIntegrationBody = {
  storeId?: string;
  integrationType?: string;
  apiKey?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as UpsertIntegrationBody;
    const storeId = body.storeId?.trim();
    const integrationType = body.integrationType?.trim().toUpperCase();
    const apiKey = body.apiKey?.trim();

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }
    if (!integrationType || integrationType !== "KLAVIYO") {
      return NextResponse.json(
        { error: "integrationType must be KLAVIYO" },
        { status: 400 },
      );
    }
    if (!apiKey) {
      return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
    }

    const integration = await upsertKlaviyoIntegration(storeId, apiKey);
    return NextResponse.json({ integration });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as UpsertIntegrationBody;
    const storeId = body.storeId?.trim();
    const integrationType = body.integrationType?.trim().toUpperCase();

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }
    if (!integrationType || integrationType !== "KLAVIYO") {
      return NextResponse.json(
        { error: "integrationType must be KLAVIYO" },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const client = supabaseAdmin ?? null;

    if (!client) {
      return NextResponse.json(
        { error: "Supabase admin client is not configured" },
        { status: 500 },
      );
    }

    const { error } = await client
      .from("integrations")
      .delete()
      .eq("store_id", storeId)
      .eq("integration_type", "KLAVIYO");

    if (error) {
      throw new Error(`Failed to delete integration: ${error.message}`);
    }

    return NextResponse.json({ removed: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
