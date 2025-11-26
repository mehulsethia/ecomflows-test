"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailSignUp = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard`
        : undefined;

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          name: name.trim(),
        },
      },
    });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
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
            Use email, password, name, and mobile. You&apos;ll land in your
            dashboard after confirmation.
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
              className="w-full rounded-lg border border-white/10 bg-[#0b101b] px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#b78deb] focus:ring-2 focus:ring-[#b78deb]/40"
            />
          </div>

          <button
            type="button"
            onClick={handleEmailSignUp}
            disabled={loading || !email || !password || !name}
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
