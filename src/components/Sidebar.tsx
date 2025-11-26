"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Settings", href: "/settings" },
];

const baseItemClasses =
  "block rounded-lg px-4 py-3 text-sm font-semibold transition-colors border border-white/5";

export default function Sidebar() {
  const pathname = usePathname();

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
        <AccountBadge />
      </div>
    </aside>
  );
}

function AccountBadge() {
  return (
    <div className="group relative">
      <details className="peer/account w-full cursor-pointer">
        <summary className="list-none">
          <div className="flex items-center gap-3 rounded-2xl border border-[#b78deb]/40 bg-[#b78deb]/10 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:border-[#b78deb]/70 hover:bg-[#b78deb]/20">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b78deb]/30 text-xs font-bold text-white">
              ME
            </div>
            <div className="flex flex-col">
              <span>Senseibles</span>
              <span className="text-xs text-white/70">sethiamehul14@gmail.com</span>
            </div>
            <span className="ml-auto text-lg text-white/60 transition group-open/account:rotate-180">
              ⌄
            </span>
          </div>
        </summary>
        <div className="absolute bottom-14 left-0 w-full rounded-2xl border border-white/10 bg-[#0f172a]/95 p-4 text-sm text-white shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#b78deb]/30 text-sm font-bold text-white">
              ME
            </div>
            <div>
              <div className="text-base font-semibold">Senseibles</div>
              <div className="text-xs text-white/60">sethiamehul14@gmail.com</div>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            <button className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-[#b78deb] hover:text-white">
              ✨ <span>What&apos;s new?</span>
            </button>
            <button className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-[#b78deb] hover:text-white">
              🧾 <span>Billing</span>
            </button>
            <button className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-[#b78deb] hover:text-white">
              ⚙️ <span>Settings</span>
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-[#b78deb]">
            <button className="font-semibold hover:underline">Log out</button>
            <button className="text-white/60 hover:text-white">Legal</button>
          </div>
        </div>
      </details>
    </div>
  );
}
