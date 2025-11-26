"use client";

import { useEffect, useState } from "react";

type Notification = { id: string; title: string; body: string; createdAt: string; read?: boolean };

const STORAGE_KEY = "ecomflows-notifications";

function loadNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as Notification[];
  } catch {
    return [];
  }
}

export function addNotification(notification: Notification) {
  if (typeof window === "undefined") return;
  const current = loadNotifications();
  const next = [notification, ...current].slice(0, 50);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("storage"));
}

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const onStorage = () => setNotifications(loadNotifications());
    onStorage();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    setNotifications(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <header className="pointer-events-auto flex h-14 items-center justify-end gap-4 border-b border-white/5 bg-[#0b101b]/70 px-6 backdrop-blur-xl">
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
                        setNotifications(next);
                        if (typeof window !== "undefined") {
                          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                          window.dispatchEvent(new Event("storage"));
                        }
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
