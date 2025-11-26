import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

type UpdateStoreBody = {
  name?: string;
  shopDomain?: string | null;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as UpdateStoreBody;
    const updates: Record<string, string | null> = {};

    if (typeof body.name === "string") updates.name = body.name.trim();
    if (body.shopDomain !== undefined) {
      updates.shop_domain = body.shopDomain ? body.shopDomain.trim() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("stores")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ store: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
