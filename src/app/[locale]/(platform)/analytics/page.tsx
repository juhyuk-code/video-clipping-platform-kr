import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Film, FolderKanban } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatKRW } from "@/lib/utils";

type RecentSubmission = {
  id: string;
  clipTitle: string | null;
  status: string;
  latestViewCount: number;
  updatedAt: Date;
  campaignTitle: string;
  editorName: string | null;
};

async function getCampaignAnalytics(userId: string, role: "CREATOR" | "CLIPPER") {
  if (role === "CREATOR") {
    const [
      campaignCount,
      publishedSubmissionCount,
      totalViewsAgg,
      totalSpentAgg,
      recentSubmissions,
    ] = await Promise.all([
      prisma.campaign.count({ where: { creatorId: userId } }),
      prisma.campaignSubmission.count({
        where: {
          campaign: { creatorId: userId },
          clipUrl: { not: null },
          status: { in: ["APPROVED", "PAID"] },
        },
      }),
      prisma.campaignSubmission.aggregate({
        where: {
          campaign: { creatorId: userId },
          clipUrl: { not: null },
          status: { in: ["SUBMITTED", "IN_REVIEW", "APPROVED", "PAID", "REVISION_REQ"] },
        },
        _sum: { latestViewCount: true },
      }),
      prisma.campaign.aggregate({
        where: { creatorId: userId },
        _sum: { totalSpent: true },
      }),
      prisma.campaignSubmission.findMany({
        where: { campaign: { creatorId: userId } },
        orderBy: { updatedAt: "desc" },
        take: 12,
        include: {
          campaign: { select: { title: true } },
          clipper: { select: { nickname: true, name: true } },
        },
      }),
    ]);

    return {
      role,
      totalCampaigns: campaignCount,
      completedOrPublishedSubmissions: publishedSubmissionCount,
      totalViews: Number(totalViewsAgg._sum.latestViewCount ?? 0),
      totalMoney: Number(totalSpentAgg._sum.totalSpent ?? 0),
      moneyLabel: "총 집행액",
      recentSubmissions: recentSubmissions.map((submission) => ({
        id: submission.id,
        clipTitle: submission.clipTitle,
        status: submission.status,
        latestViewCount: submission.latestViewCount,
        updatedAt: submission.updatedAt,
        campaignTitle: submission.campaign.title,
        editorName: submission.clipper.nickname ?? submission.clipper.name ?? null,
      })) satisfies RecentSubmission[],
    };
  }

  const [submissionCount, approvedCount, totalViewsAgg, wallet, recentSubmissions] =
    await Promise.all([
      prisma.campaignSubmission.count({ where: { clipperId: userId } }),
      prisma.campaignSubmission.count({
        where: {
          clipperId: userId,
          status: { in: ["APPROVED", "PAID"] },
        },
      }),
      prisma.campaignSubmission.aggregate({
        where: {
          clipperId: userId,
          status: { in: ["SUBMITTED", "IN_REVIEW", "APPROVED", "PAID", "REVISION_REQ"] },
        },
        _sum: { latestViewCount: true },
      }),
      prisma.wallet.findUnique({
        where: { userId },
        select: { totalEarned: true },
      }),
      prisma.campaignSubmission.findMany({
        where: { clipperId: userId },
        orderBy: { updatedAt: "desc" },
        take: 12,
        include: {
          campaign: { select: { title: true } },
          clipper: { select: { nickname: true, name: true } },
        },
      }),
    ]);

  return {
    role,
    totalCampaigns: submissionCount,
    completedOrPublishedSubmissions: approvedCount,
    totalViews: Number(totalViewsAgg._sum.latestViewCount ?? 0),
    totalMoney: Number(wallet?.totalEarned ?? 0),
    moneyLabel: "총 수익",
    recentSubmissions: recentSubmissions.map((submission) => ({
      id: submission.id,
      clipTitle: submission.clipTitle,
      status: submission.status,
      latestViewCount: submission.latestViewCount,
      updatedAt: submission.updatedAt,
      campaignTitle: submission.campaign.title,
      editorName: submission.clipper.nickname ?? submission.clipper.name ?? null,
    })) satisfies RecentSubmission[],
  };
}

function statusLabel(status: string) {
  if (status === "APPLIED") return "지원";
  if (status === "APPLICATION_REJECTED") return "지원 반려";
  if (status === "JOINED") return "참여 확정";
  if (status === "WITHDRAWN") return "철회";
  if (status === "SUBMITTED") return "제출";
  if (status === "IN_REVIEW") return "검토 중";
  if (status === "APPROVED") return "승인";
  if (status === "REVISION_REQ") return "수정 요청";
  if (status === "REJECTED") return "반려";
  if (status === "PAID") return "정산 완료";
  return status;
}

export default async function AnalyticsPage() {
  const tc = await getTranslations("common");
  const session = await auth();
  const userId = session?.user?.id;
  const role = (session?.user?.role as "CREATOR" | "CLIPPER" | undefined) ?? "CLIPPER";

  const data = userId
    ? await getCampaignAnalytics(userId, role === "CREATOR" ? "CREATOR" : "CLIPPER")
    : {
        role: "CLIPPER" as const,
        totalCampaigns: 0,
        completedOrPublishedSubmissions: 0,
        totalViews: 0,
        totalMoney: 0,
        moneyLabel: "총 수익",
        recentSubmissions: [] as RecentSubmission[],
      };

  const primaryCountLabel =
    data.role === "CREATOR" ? "내 캠페인" : "내 지원/참여";
  const secondaryCountLabel =
    data.role === "CREATOR" ? "게시/승인된 제출" : "승인/정산 완료";
  const roleSubtitle =
    data.role === "CREATOR"
      ? "크리에이터 관점 캠페인 운영 지표"
      : "에디터 관점 제출/수익 지표";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">{tc("analytics")}</h1>
        <p className="text-sm text-muted-foreground">{roleSubtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <FolderKanban className="h-5 w-5 text-muted-foreground" />
            <p className="mt-3 text-2xl font-bold">{data.totalCampaigns.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{primaryCountLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Film className="h-5 w-5 text-muted-foreground" />
            <p className="mt-3 text-2xl font-bold">
              {data.completedOrPublishedSubmissions.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">{secondaryCountLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <p className="mt-3 text-2xl font-bold">{data.totalViews.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">집계 조회수</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <p className="mt-3 text-2xl font-bold">{formatKRW(data.totalMoney)}</p>
            <p className="text-sm text-muted-foreground">{data.moneyLabel}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 제출 업데이트</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentSubmissions.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              아직 분석할 제출 데이터가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {data.recentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {submission.clipTitle || "제목 없는 제출"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {submission.campaignTitle}
                      {data.role === "CREATOR" && submission.editorName
                        ? ` · ${submission.editorName}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {submission.latestViewCount.toLocaleString()} views
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {statusLabel(submission.status)} ·{" "}
                      {new Date(submission.updatedAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
