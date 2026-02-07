import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  CheckCircle,
  Wallet,
  Plus,
  ClipboardList,
  Calendar,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatKRW } from "@/lib/utils";

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

const TYPE_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  PROJECT: "default",
  REWARD: "secondary",
  HYBRID: "outline",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  ACTIVE: "default",
  PAUSED: "secondary",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

async function getDashboardData(userId: string) {
  const [activeCampaigns, completedCampaigns, mySubmissions, wallet, recentCampaigns] =
    await Promise.all([
      prisma.campaign.count({
        where: { creatorId: userId, status: { in: ["ACTIVE", "PAUSED"] } },
      }),
      prisma.campaign.count({
        where: { creatorId: userId, status: "COMPLETED" },
      }),
      prisma.campaignSubmission.count({
        where: { clipperId: userId },
      }),
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.campaign.findMany({
        where: {
          OR: [
            { creatorId: userId },
            { submissions: { some: { clipperId: userId } } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          creator: { select: { nickname: true, name: true } },
          _count: { select: { submissions: true } },
        },
      }),
    ]);

  return {
    activeCampaigns,
    completedCampaigns,
    mySubmissions,
    walletBalance: Number(wallet?.balance ?? 0),
    recentCampaigns,
  };
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("campaigns");

  const session = await auth();
  const userId = session?.user?.id;

  let data = {
    activeCampaigns: 0,
    completedCampaigns: 0,
    mySubmissions: 0,
    walletBalance: 0,
    recentCampaigns: [] as any[],
  };

  if (userId) {
    try {
      data = await getDashboardData(userId);
    } catch (e) {
      console.error("Dashboard data fetch error:", e);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("creatorDashboard")}</h1>
          <p className="text-muted-foreground">
            {t("welcome", { name: session?.user?.name ?? "User" })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/campaigns">
            <Button variant="outline" className="gap-2">
              <Megaphone className="h-4 w-4" />
              {tc("allCampaigns")}
            </Button>
          </Link>
          <Link href="/campaigns/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {tc("create")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Megaphone}
          label={t("activeProjects")}
          value={String(data.activeCampaigns)}
        />
        <StatCard
          icon={CheckCircle}
          label={t("completedProjects")}
          value={String(data.completedCampaigns)}
        />
        <StatCard
          icon={ClipboardList}
          label={t("totalClips")}
          value={String(data.mySubmissions)}
        />
        <StatCard
          icon={Wallet}
          label={t("totalSpent")}
          value={formatKRW(data.walletBalance)}
        />
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("recentProjects")}</CardTitle>
            <Link href="/campaigns">
              <Button variant="ghost" size="sm">
                전체 보기
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Megaphone className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">{tc("noCampaigns")}</p>
              <Link href="/campaigns/new" className="mt-4">
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {tc("create")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentCampaigns.map((campaign: any) => (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                  <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{campaign.title}</p>
                        <Badge variant={TYPE_COLORS[campaign.type] ?? "outline"} className="text-xs">
                          {tc(`type.${campaign.type}`)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(campaign.deadline).toLocaleDateString("ko-KR")}
                        </span>
                        <span>{campaign._count.submissions}명 참여</span>
                        {campaign.totalBudget && (
                          <span>{formatKRW(Number(campaign.totalBudget))}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant={STATUS_COLORS[campaign.status] ?? "outline"}>
                      {tc(`status.${campaign.status}`)}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
