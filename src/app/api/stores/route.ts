import { NextResponse } from "next/server";
import { createStore } from "@/lib/storeService";

type CreateStoreBody = {
  name?: string;
  shopDomain?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CreateStoreBody;
    const name = body.name?.trim();
    const shopDomain = body.shopDomain?.trim();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const store = await createStore({ name, shopDomain });
    return NextResponse.json({ store });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
