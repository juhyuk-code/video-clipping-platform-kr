"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link, usePathname } from "@/i18n/routing";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useMode } from "@/contexts/mode-context";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Scissors,
  Megaphone,
  Wallet,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const creatorNav = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "myCampaigns", href: "/campaigns", icon: Megaphone },
  { key: "wallet", href: "/wallet", icon: Wallet },
  { key: "messages", href: "/messages", icon: MessageSquare },
  { key: "analytics", href: "/analytics", icon: BarChart3 },
  { key: "settings", href: "/settings", icon: Settings },
] as const;

const clipperNav = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "browseCampaigns", href: "/campaigns", icon: Search },
  { key: "wallet", href: "/wallet", icon: Wallet },
  { key: "messages", href: "/messages", icon: MessageSquare },
  { key: "settings", href: "/settings", icon: Settings },
] as const;

const NAV_LABELS: Record<string, { ko: string; en: string }> = {
  dashboard: { ko: "대시보드", en: "Dashboard" },
  myCampaigns: { ko: "내 캠페인", en: "My Campaigns" },
  browseCampaigns: { ko: "캠페인 찾기", en: "Find Campaigns" },
  wallet: { ko: "지갑", en: "Wallet" },
  messages: { ko: "메시지", en: "Messages" },
  analytics: { ko: "분석", en: "Analytics" },
  settings: { ko: "설정", en: "Settings" },
};

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "U";
}

export function PlatformSidebar() {
  const tc = useTranslations("common");
  const pathname = usePathname();
  const { mode } = useMode();
  const { data: session } = useSession();

  const navItems = mode === "creator" ? creatorNav : clipperNav;
  const displayName = session?.user?.nickname || null;
  const userEmail = session?.user?.email;
  const initials = getInitials(displayName, userEmail);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border/50 bg-background">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border/50 px-5">
        <Scissors className="h-5 w-5 text-foreground" />
        <span className="text-sm font-semibold tracking-tight text-foreground">
          {tc("appName")}
        </span>
      </div>

      {/* Role Indicator */}
      <div className="px-3 pt-3 pb-2">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-full px-3.5 py-2 text-xs font-medium border",
            mode === "creator"
              ? "border-violet-500/20 bg-violet-500/10 text-violet-400"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              mode === "creator" ? "bg-violet-400" : "bg-emerald-400"
            )}
          />
          <span className="font-medium">
            {mode === "creator" ? "크리에이터" : "클리퍼"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2">
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent/50 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-foreground" />
                )}
                <item.icon className="h-4 w-4" />
                {NAV_LABELS[item.key]?.ko ?? item.key}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Card + Logout */}
      <div className="border-t border-border/50 p-2">
        {session?.user && (
          <Link
            href="/settings"
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-accent/50"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-accent text-xs font-semibold text-foreground">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {displayName || "사용자"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {userEmail}
              </p>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="mt-0.5 w-full justify-start gap-2.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-3.5 w-3.5" />
          {tc("logout")}
        </Button>
      </div>
    </aside>
  );
}
