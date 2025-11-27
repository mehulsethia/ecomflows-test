"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Store } from "@/lib/storeService";
import { ensurePublicUserProfile } from "@/lib/userProfileService";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkEmailExists = async (
    candidate: string,
  ): Promise<boolean | null> => {
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: candidate }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { exists?: boolean };
      return typeof json.exists === "boolean" ? json.exists : null;
    } catch {
      return null;
    }
  };

  const determineDestinationAfterAuth = async (): Promise<string> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return "/dashboard";

      const { data: stores } = await supabase
        .from("stores")
        .select("id, shop_domain, user_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      const store = (stores ?? [])[0] as Store | undefined;
      if (!store) return "/settings?prompt=store";

      const { data: klaviyo } = await supabase
        .from("integrations")
        .select("id")
        .eq("store_id", store.id)
        .eq("integration_type", "KLAVIYO")
        .maybeSingle();

      if (!klaviyo) return `/settings?prompt=klaviyo&storeId=${store.id}`;
    } catch (checkError) {
      console.error("Post-login setup check failed", checkError);
    }

    return "/dashboard";
  };

  const handleEmailLogin = async () => {
    setError(null);
    setLoading(true);

    const emailClean = email.trim();
    const passwordClean = password;

    if (!emailClean || !passwordClean) {
      setLoading(false);
      setError("Email and password are required.");
      return;
    }

    const emailExists = await checkEmailExists(emailClean);
    if (emailExists === false) {
      setLoading(false);
      setError("No account found with this email. Please sign up first.");
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: emailClean,
      password: passwordClean,
    });

    setLoading(false);
    if (authError) {
      const messageLower = authError.message.toLowerCase();
      const friendly = messageLower.includes("invalid")
        ? "Incorrect email or password."
        : authError.message;
      setError(friendly);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    await ensurePublicUserProfile(userData.user);

    const destination = await determineDestinationAfterAuth();
    router.push(destination);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-[#17223e]/90 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#b78deb]/50">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-white/50">
            Welcome back
          </p>
          <h1 className="text-2xl font-normal text-white">Log in to Ecomflows</h1>
          <p className="text-sm text-white/60">
            Use your email and password to access your dashboard.
          </p>
        </header>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-white/10 bg-[#0b101b] px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#b78deb] focus:ring-2 focus:ring-[#b78deb]/40"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              required
              className="w-full rounded-lg border border-white/10 bg-[#0b101b] px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#b78deb] focus:ring-2 focus:ring-[#b78deb]/40"
            />
          </div>

          <button
            type="button"
            onClick={handleEmailLogin}
            disabled={loading || !email.trim() || !password}
            className="btn w-full justify-center"
          >
            {loading ? "Signing in..." : "Log in"}
          </button>
        </div>

        <p className="text-center text-sm text-white/60">
          Need an account?{" "}
          <Link href="/register" className="text-[#b78deb] hover:underline">
            Create one
          </Link>
          .
        </p>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
