import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban,
  CheckCircle,
  Film,
  Wallet,
  Plus,
  ShoppingBag,
} from "lucide-react";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tp = useTranslations("projects");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("creatorDashboard")}</h1>
          <p className="text-muted-foreground">{t("welcome", { name: "User" })}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/marketplace">
            <Button variant="outline" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              {t("browseMarketplace")}
            </Button>
          </Link>
          <Link href="/projects/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t("newProject")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FolderKanban}
          label={t("activeProjects")}
          value="0"
        />
        <StatCard
          icon={CheckCircle}
          label={t("completedProjects")}
          value="0"
        />
        <StatCard icon={Film} label={t("totalClips")} value="0" />
        <StatCard icon={Wallet} label={t("totalSpent")} value="₩0" />
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("recentProjects")}</CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                전체 보기
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{tp("noProjects")}</p>
            <Link href="/projects/new" className="mt-4">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("newProject")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
