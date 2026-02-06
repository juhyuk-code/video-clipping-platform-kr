import { useTranslations } from "next-intl";
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
  FolderKanban,
  CheckCircle,
  Film,
  Wallet,
  Plus,
  ShoppingBag,
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

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  OPEN: "default",
  IN_PROGRESS: "secondary",
  IN_REVIEW: "secondary",
  COMPLETED: "outline",
  DRAFT: "outline",
};

async function getDashboardData(userId: string) {
  const [activeProjects, completedProjects, totalClips, recentProjects] =
    await Promise.all([
      prisma.project.count({
        where: {
          OR: [{ creatorId: userId }, { assignedClipperId: userId }],
          status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "REVISION_REQUESTED"] },
        },
      }),
      prisma.project.count({
        where: {
          OR: [{ creatorId: userId }, { assignedClipperId: userId }],
          status: "COMPLETED",
        },
      }),
      prisma.clip.count({
        where: {
          OR: [
            { project: { creatorId: userId } },
            { clipperId: userId },
          ],
        },
      }),
      prisma.project.findMany({
        where: {
          OR: [{ creatorId: userId }, { assignedClipperId: userId }],
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          creator: { select: { nickname: true, name: true } },
          assignedClipper: { select: { nickname: true, name: true } },
          _count: { select: { applications: true, clips: true } },
        },
      }),
    ]);

  return { activeProjects, completedProjects, totalClips, recentProjects };
}

export default async function DashboardPage() {
  const t = useTranslations("dashboard");
  const tp = useTranslations("projects");
  const tc = useTranslations("common");

  const session = await auth();
  const userId = session?.user?.id;

  let data: { activeProjects: number; completedProjects: number; totalClips: number; recentProjects: any[] } = {
    activeProjects: 0, completedProjects: 0, totalClips: 0, recentProjects: [],
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
          value={String(data.activeProjects)}
        />
        <StatCard
          icon={CheckCircle}
          label={t("completedProjects")}
          value={String(data.completedProjects)}
        />
        <StatCard
          icon={Film}
          label={t("totalClips")}
          value={String(data.totalClips)}
        />
        <StatCard icon={Wallet} label={t("totalSpent")} value="₩0" />
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("recentProjects")}</CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                {tc("viewAll")}
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentProjects.length === 0 ? (
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
          ) : (
            <div className="space-y-3">
              {data.recentProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent">
                    <div className="space-y-1">
                      <p className="font-medium">{project.title}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(project.deadline).toLocaleDateString("ko-KR")}
                        </span>
                        <span>{project._count.applications}명 지원</span>
                        <span>{project._count.clips}개 클립</span>
                      </div>
                    </div>
                    <Badge variant={STATUS_COLORS[project.status] ?? "outline"}>
                      {tp(`status.${project.status}`)}
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
