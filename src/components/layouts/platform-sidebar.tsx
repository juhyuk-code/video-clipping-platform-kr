"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, ns: "common" },
  { key: "title", href: "/campaigns", icon: Megaphone, ns: "campaigns" },
  { key: "title", href: "/my-submissions", icon: ClipboardList, ns: "mySubmissions" },
  { key: "title", href: "/wallet", icon: Wallet, ns: "wallet" },
  { key: "messages", href: "/messages", icon: MessageSquare, ns: "common" },
  { key: "analytics", href: "/analytics", icon: BarChart3, ns: "common" },
  { key: "settings", href: "/settings", icon: Settings, ns: "common" },
] as const;

export function PlatformSidebar() {
  const tc = useTranslations("common");
  const tCamp = useTranslations("campaigns");
  const tWallet = useTranslations("wallet");
  const tSub = useTranslations("mySubmissions");
  const pathname = usePathname();

  function getLabel(ns: string, key: string) {
    if (ns === "campaigns") return tCamp(key as any);
    if (ns === "wallet") return tWallet(key as any);
    if (ns === "mySubmissions") return tSub(key as any);
    return tc(key as any);
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Scissors className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">{tc("appName")}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {getLabel(item.ns, item.key)}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t p-3">
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
