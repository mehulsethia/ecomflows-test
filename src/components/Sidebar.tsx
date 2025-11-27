"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Settings", href: "/settings" },
];

const baseItemClasses =
  "block rounded-lg px-4 py-3 text-sm font-semibold transition-colors border border-white/5";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Failed to sign out", error);
    } finally {
      router.push("/login");
    }
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-white/10 bg-[#0b101b]/90 px-6 py-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="mb-10">
        <div className="relative h-10 w-full">
          <Image
            src="/ecomflows-logo.png"
            alt="Ecomflows logo"
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${baseItemClasses} ${
                isActive
                  ? "bg-[#b78deb]/20 border-[#b78deb]/60 text-white shadow-lg shadow-black/30"
                  : "bg-white/0 text-white/80 hover:bg-white/5 hover:border-white/10"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 pt-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/60 shadow-lg shadow-black/30">
          <p className="font-semibold text-white">Quick tips</p>
          <p className="mt-2 leading-relaxed">
            Sync your Klaviyo metrics daily to keep alerts fresh and actionable.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center rounded-2xl border border-[#b78deb]/50 bg-[#b78deb]/15 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:border-[#b78deb] hover:bg-[#b78deb]/25"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
