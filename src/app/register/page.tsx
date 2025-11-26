"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Store } from "@/lib/storeService";
import { ensurePublicUserProfile } from "@/lib/userProfileService";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkEmailExists = async (candidate: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: candidate }),
      });
      if (!res.ok) return false;
      const json = (await res.json()) as { exists?: boolean };
      return Boolean(json.exists);
    } catch {
      return false;
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
      console.error("Post-signup setup check failed", checkError);
    }

    return "/dashboard";
  };

  const handleEmailSignUp = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    const emailClean = email.trim();
    const nameClean = name.trim();
    const passwordClean = password;

    if (!emailClean || !nameClean || !passwordClean) {
      setLoading(false);
      setError("Name, email, and password are required.");
      return;
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard`
        : undefined;

    const emailExists = await checkEmailExists(emailClean);
    if (emailExists) {
      setLoading(false);
      setError("An account with this email already exists. Please log in instead.");
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: emailClean,
      password: passwordClean,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          name: nameClean,
        },
      },
    });

    setLoading(false);
    // Supabase can return no error but an empty identities array if the user already exists.
    if (
      signUpData?.user &&
      Array.isArray(signUpData.user.identities) &&
      signUpData.user.identities.length === 0
    ) {
      setError("An account with this email already exists. Please log in instead.");
      return;
    }

    if (signUpError) {
      const messageLower = signUpError.message.toLowerCase();
      const friendly =
        messageLower.includes("already") || messageLower.includes("registered")
          ? "An account with this email already exists. Please log in instead."
          : signUpError.message;
      setError(friendly);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      const { data: userData } = await supabase.auth.getUser();
      await ensurePublicUserProfile(userData.user);
      const destination = await determineDestinationAfterAuth();
      router.push(destination);
      return;
    }

    setMessage(
      "Check your email to confirm your account. You'll be redirected after verification.",
    );
    setName("");
    setEmail("");
    setPassword("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-[#17223e]/90 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#b78deb]/50">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-white/50">
            Get started
          </p>
          <h1 className="text-2xl font-normal text-white">
            Create your Ecomflows account
          </h1>
          <p className="text-sm text-white/60">
            You&apos;ll land in your dashboard after confirmation.
          </p>
        </header>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="Jane Doe"
              required
              className="w-full rounded-lg border border-white/10 bg-[#0b101b] px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#b78deb] focus:ring-2 focus:ring-[#b78deb]/40"
            />
          </div>

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
            onClick={handleEmailSignUp}
            disabled={
              loading ||
              !email.trim() ||
              !password ||
              !name.trim()
            }
            className="btn w-full justify-center"
          >
            {loading ? "Signing up..." : "Create account"}
          </button>
        </div>

        <p className="text-center text-sm text-white/60">
          Already have an account?{" "}
          <Link href="/login" className="text-[#b78deb] hover:underline">
            Log in
          </Link>
          .
        </p>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </div>
        )}

        <p className="text-center text-xs text-white/50">
          A confirmation link will be sent to your email. After
          confirming, you will be redirected to the dashboard.
        </p>
      </div>
    </div>
  );
}
