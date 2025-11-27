"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Notification = { id: string; title: string; body: string; createdAt: string; read?: boolean };

const STORAGE_KEY = "ecomflows-notifications";
const notificationKey = (userId?: string | null) =>
  userId ? `${STORAGE_KEY}-${userId}` : STORAGE_KEY;

function loadNotifications(userId?: string | null): Notification[] {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(notificationKey(userId));
  if (!stored) return [];
  try {
    return JSON.parse(stored) as Notification[];
  } catch {
    return [];
  }
}

export async function addNotification(notification: Notification) {
  if (typeof window === "undefined") return;
  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch (error) {
    console.error("Failed to resolve user for notification", error);
  }
  const current = loadNotifications(userId);
  const next = [notification, ...current].slice(0, 50);
  window.localStorage.setItem(notificationKey(userId), JSON.stringify(next));
  window.dispatchEvent(new Event("storage"));
}

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [displayName, setDisplayName] = useState<string>("Account");
  const [displayEmail, setDisplayEmail] = useState<string>("—");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const onStorage = () => setNotifications(loadNotifications(userId));
    onStorage();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) return;
        setUserId(user.id ?? null);
        const name =
          (user.user_metadata as { name?: string | null } | null)?.name ??
          user.email ??
          "Account";
        setDisplayName(name);
        setDisplayEmail(user.email ?? "—");
      } catch (error) {
        console.error("Failed to load header user info", error);
      }
    };
    void loadUser();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const saveNotifications = (next: Notification[]) => {
    setNotifications(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(notificationKey(userId), JSON.stringify(next));
      window.dispatchEvent(new Event("storage"));
    }
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    saveNotifications(updated);
  };

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "ME";

  return (
    <>
      <header className="pointer-events-auto flex h-14 items-center justify-between gap-4 border-b border-white/5 bg-[#0b101b]/70 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-md bg-[#b78deb]/15 px-2 py-1 text-xs font-semibold text-white/80">
            {initials}
          </span>
          <span className="font-semibold text-white">
            Hey, {displayName} ({displayEmail})
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:border-[#b78deb] hover:text-white"
            aria-label="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-h-[18px] min-w-[18px] rounded-full bg-[#b78deb] px-1 text-[10px] font-semibold text-[#0b101b]">
                {unreadCount}
              </span>
            )}
          </button>
          <a
            href="mailto:hello@ecomflows.io"
            className="btn px-4 py-2 text-xs font-semibold"
          >
            Support
          </a>
        </div>
      </header>

      {open && (
        <div className="pointer-events-none fixed inset-y-0 right-0 z-40 flex items-start justify-end">
          <div
            className="pointer-events-auto mt-16 mr-6 w-80 rounded-2xl border border-white/10 bg-[#0b101b]/95 p-4 text-sm text-white shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-base font-semibold text-white">Notifications</h3>
            </div>
            <div className="mt-3 max-h-80 space-y-3 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`relative flex w-full flex-col items-start rounded-xl border px-3 py-2 text-left ${
                      n.read
                        ? "border-white/10 bg-white/5"
                        : "border-[#b78deb]/60 bg-[#b78deb]/10"
                    }`}
                  >
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="flex w-full flex-col items-start text-left"
                    >
                      <div className="flex w-full items-center justify-between">
                        <p className="font-semibold text-white">{n.title}</p>
                        <span className="text-[10px] text-white/60">
                          {formatTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-white/70">{n.body}</p>
                    </button>
                    <button
                      aria-label="Delete notification"
                      className="absolute bottom-2 right-2 text-xs text-white/60 transition hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = notifications.filter((item) => item.id !== n.id);
                        saveNotifications(next);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/60">No notifications yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
