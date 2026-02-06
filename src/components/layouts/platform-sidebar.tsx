"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  ShoppingBag,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Scissors,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "projects", href: "/projects", icon: FolderKanban },
  { key: "marketplace", href: "/marketplace", icon: ShoppingBag },
  { key: "messages", href: "/messages", icon: MessageSquare },
  { key: "analytics", href: "/analytics", icon: BarChart3 },
  { key: "settings", href: "/settings", icon: Settings },
] as const;

export function PlatformSidebar() {
  const t = useTranslations("common");
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Scissors className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">{t("appName")}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
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
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
        >
          <LogOut className="h-5 w-5" />
          {t("logout")}
        </Button>
      </div>
    </aside>
  );
}
