import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderKanban, AlertTriangle, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatKRW } from "@/lib/utils";

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline", OPEN: "default", ASSIGNED: "secondary",
  IN_PROGRESS: "secondary", IN_REVIEW: "secondary",
  REVISION_REQUESTED: "destructive", COMPLETED: "outline",
  CANCELLED: "outline", DISPUTED: "destructive",
};

async function getAdminStats() {
  const [totalUsers, totalCreators, totalClippers, totalProjects, openProjects, disputedProjects, totalFees, recentProjects] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "CREATOR" } }),
      prisma.user.count({ where: { role: "CLIPPER" } }),
      prisma.project.count(),
      prisma.project.count({ where: { status: "OPEN" } }),
      prisma.project.count({ where: { status: "DISPUTED" } }),
      prisma.payment.aggregate({ where: { status: { in: ["ESCROWED", "RELEASED"] } }, _sum: { platformFee: true } }),
      prisma.project.findMany({
        orderBy: { createdAt: "desc" }, take: 10,
        include: {
          creator: { select: { nickname: true, name: true } },
          assignedClipper: { select: { nickname: true, name: true } },
        },
      }),
    ]);

  return { totalUsers, totalCreators, totalClippers, totalProjects, openProjects, disputedProjects, platformRevenue: Number(totalFees._sum.platformFee ?? 0), recentProjects };
}

export default async function AdminPage() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">관리자 대시보드</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-6"><Users className="h-5 w-5 text-muted-foreground" /><p className="mt-3 text-2xl font-bold">{stats.totalUsers}</p><p className="text-sm text-muted-foreground">전체 사용자 (크리에이터 {stats.totalCreators} / 클리퍼 {stats.totalClippers})</p></CardContent></Card>
        <Card><CardContent className="p-6"><FolderKanban className="h-5 w-5 text-muted-foreground" /><p className="mt-3 text-2xl font-bold">{stats.totalProjects}</p><p className="text-sm text-muted-foreground">전체 프로젝트 ({stats.openProjects}개 공개 중)</p></CardContent></Card>
        <Card><CardContent className="p-6"><AlertTriangle className="h-5 w-5 text-destructive" /><p className="mt-3 text-2xl font-bold">{stats.disputedProjects}</p><p className="text-sm text-muted-foreground">분쟁 프로젝트</p></CardContent></Card>
        <Card><CardContent className="p-6"><Wallet className="h-5 w-5 text-muted-foreground" /><p className="mt-3 text-2xl font-bold">{formatKRW(stats.platformRevenue)}</p><p className="text-sm text-muted-foreground">플랫폼 수수료 수입</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>최근 프로젝트</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentProjects.map((project) => (
              <div key={project.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{project.title}</p>
                  <p className="text-xs text-muted-foreground">
                    크리에이터: {project.creator.nickname ?? project.creator.name}
                    {project.assignedClipper && ` → 클리퍼: ${project.assignedClipper.nickname ?? project.assignedClipper.name}`}
                  </p>
                </div>
                <Badge variant={STATUS_COLORS[project.status] ?? "outline"}>{project.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
