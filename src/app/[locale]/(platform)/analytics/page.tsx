import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Film, FolderKanban } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatKRW } from "@/lib/utils";

async function getAnalytics(userId: string) {
  const [totalProjects, completedProjects, totalClips, approvedClips, totalEarnings, totalSpent, recentClips] =
    await Promise.all([
      prisma.project.count({ where: { OR: [{ creatorId: userId }, { assignedClipperId: userId }] } }),
      prisma.project.count({ where: { OR: [{ creatorId: userId }, { assignedClipperId: userId }], status: "COMPLETED" } }),
      prisma.clip.count({ where: { OR: [{ project: { creatorId: userId } }, { clipperId: userId }] } }),
      prisma.clip.count({ where: { OR: [{ project: { creatorId: userId } }, { clipperId: userId }], status: "APPROVED" } }),
      prisma.payment.aggregate({ where: { payeeId: userId, status: { in: ["RELEASED", "ESCROWED"] } }, _sum: { netPayeeAmount: true } }),
      prisma.payment.aggregate({ where: { payerId: userId, status: { in: ["RELEASED", "ESCROWED"] } }, _sum: { amount: true } }),
      prisma.clip.findMany({
        where: { OR: [{ project: { creatorId: userId } }, { clipperId: userId }] },
        orderBy: { createdAt: "desc" }, take: 10,
        include: { project: { select: { title: true } }, clipper: { select: { nickname: true, name: true } } },
      }),
    ]);

  return {
    totalProjects, completedProjects, totalClips, approvedClips,
    totalEarnings: Number(totalEarnings._sum.netPayeeAmount ?? 0),
    totalSpent: Number(totalSpent._sum.amount ?? 0),
    recentClips,
  };
}

export default async function AnalyticsPage() {
  const tc = await getTranslations("common");
  const session = await auth();
  const userId = session?.user?.id;
  const data = userId
    ? await getAnalytics(userId)
    : { totalProjects: 0, completedProjects: 0, totalClips: 0, approvedClips: 0, totalEarnings: 0, totalSpent: 0, recentClips: [] };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{tc("analytics")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-6"><FolderKanban className="h-5 w-5 text-muted-foreground" /><p className="mt-3 text-2xl font-bold">{data.totalProjects}</p><p className="text-sm text-muted-foreground">총 프로젝트</p></CardContent></Card>
        <Card><CardContent className="p-6"><Film className="h-5 w-5 text-muted-foreground" /><p className="mt-3 text-2xl font-bold">{data.approvedClips} / {data.totalClips}</p><p className="text-sm text-muted-foreground">승인 / 총 클립</p></CardContent></Card>
        <Card><CardContent className="p-6"><TrendingUp className="h-5 w-5 text-muted-foreground" /><p className="mt-3 text-2xl font-bold">{data.totalProjects > 0 ? `${Math.round((data.completedProjects / data.totalProjects) * 100)}%` : "0%"}</p><p className="text-sm text-muted-foreground">완료율</p></CardContent></Card>
        <Card><CardContent className="p-6"><DollarSign className="h-5 w-5 text-muted-foreground" /><p className="mt-3 text-2xl font-bold">{data.totalEarnings > 0 ? formatKRW(data.totalEarnings) : data.totalSpent > 0 ? formatKRW(data.totalSpent) : "₩0"}</p><p className="text-sm text-muted-foreground">총 수입 / 지출</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>최근 클립</CardTitle></CardHeader>
        <CardContent>
          {data.recentClips.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">아직 분석할 데이터가 없습니다</p>
          ) : (
            <div className="space-y-3">
              {data.recentClips.map((clip) => (
                <div key={clip.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{clip.title}</p>
                    <p className="text-xs text-muted-foreground">{clip.project.title} · {clip.targetPlatform}</p>
                  </div>
                  <span className={`text-xs font-medium ${clip.status === "APPROVED" ? "text-green-600" : clip.status === "REVISION_REQUESTED" ? "text-red-600" : "text-yellow-600"}`}>
                    {clip.status === "SUBMITTED" ? "제출됨" : clip.status === "APPROVED" ? "승인됨" : clip.status === "REVISION_REQUESTED" ? "수정 요청" : "거절됨"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
