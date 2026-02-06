"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlatformHeader() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/v1/notifications?unread=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setUnreadCount(data.unreadCount);
          setNotifications(data.notifications.slice(0, 5));
        }
      })
      .catch(() => {});
  }, []);

  async function markAllRead() {
    await fetch("/api/v1/notifications/all/read", { method: "PUT" });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end border-b bg-background/95 px-6 backdrop-blur">
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {showNotifications && (
          <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b p-3">
              <span className="text-sm font-semibold">알림</span>
              {unreadCount > 0 && (
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={markAllRead}
                >
                  모두 읽음
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  알림이 없습니다
                </p>
              ) : (
                notifications.map((n) => (
                  <a
                    key={n.id}
                    href={n.linkUrl ?? "#"}
                    className={`block border-b p-3 text-sm transition-colors hover:bg-accent ${
                      !n.isRead ? "bg-primary/5" : ""
                    }`}
                  >
                    <p className="font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                  </a>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
