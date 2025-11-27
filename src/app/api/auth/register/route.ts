import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Body = {
  email?: string;
  password?: string;
  name?: string;
};

export async function POST(request: Request) {
  try {
    const { email, password, name } = (await request.json().catch(() => ({}))) as Body;
    const emailClean = email?.trim().toLowerCase();
    const passwordClean = password?.trim();
    const nameClean = name?.trim();

    if (!emailClean || !passwordClean) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Supabase admin client is not configured" },
        { status: 500 },
      );
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: emailClean,
      password: passwordClean,
      email_confirm: true,
      user_metadata: nameClean ? { name: nameClean } : undefined,
    });

    if (error) {
      const messageLower = error.message.toLowerCase();
      const friendly = messageLower.includes("already")
        ? "An account with this email already exists. Please log in instead."
        : error.message;
      return NextResponse.json({ error: friendly }, { status: 400 });
    }

    return NextResponse.json({ user: data.user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
