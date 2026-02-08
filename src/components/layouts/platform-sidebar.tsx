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
  ClipboardList,
  Search,
  ArrowLeftRight,
  User,
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
  { key: "mySubmissions", href: "/my-submissions", icon: ClipboardList },
  { key: "wallet", href: "/wallet", icon: Wallet },
  { key: "messages", href: "/messages", icon: MessageSquare },
  { key: "settings", href: "/settings", icon: Settings },
] as const;

const NAV_LABELS: Record<string, { ko: string; en: string }> = {
  dashboard: { ko: "대시보드", en: "Dashboard" },
  myCampaigns: { ko: "내 캠페인", en: "My Campaigns" },
  browseCampaigns: { ko: "캠페인 찾기", en: "Find Campaigns" },
  mySubmissions: { ko: "내 제출 현황", en: "My Submissions" },
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
  const { mode, toggleMode } = useMode();
  const { data: session } = useSession();

  const navItems = mode === "creator" ? creatorNav : clipperNav;
  const userName = session?.user?.name;
  const userEmail = session?.user?.email;
  const initials = getInitials(userName, userEmail);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Scissors className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">{tc("appName")}</span>
      </div>

      {/* Mode Switcher */}
      <div className="border-b px-3 py-3">
        <button
          onClick={toggleMode}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            "bg-accent hover:bg-accent/80"
          )}
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white",
              mode === "creator" ? "bg-violet-600" : "bg-emerald-600"
            )}>
              {mode === "creator" ? "C" : "P"}
            </div>
            <span>
              {mode === "creator" ? "크리에이터" : "클리퍼"}
            </span>
          </div>
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {NAV_LABELS[item.key]?.ko ?? item.key}
            </Link>
          );
        })}
      </nav>

      {/* User Card + Logout */}
      <div className="border-t p-3 space-y-2">
        {session?.user && (
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {userName || "사용자"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {userEmail}
              </p>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-5 w-5" />
          {tc("logout")}
        </Button>
      </div>
    </aside>
  );
}
