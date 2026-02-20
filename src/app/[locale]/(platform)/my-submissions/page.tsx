import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ClipboardList,
  Wallet,
  Megaphone,
  CheckCircle,
  Eye,
  Calendar,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatKRW } from "@/lib/utils";

const SUB_STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  APPLIED: "outline",
  APPLICATION_REJECTED: "destructive",
  JOINED: "secondary",
  WITHDRAWN: "outline",
  SUBMITTED: "default",
  IN_REVIEW: "secondary",
  APPROVED: "default",
  REVISION_REQ: "destructive",
  REJECTED: "destructive",
  PAID: "outline",
};

function safeTranslate(t: (key: string) => string, key: string, fallback: string): string {
  try {
    return t(key);
  } catch {
    return fallback;
  }
}

async function getMySubmissions(userId: string) {
  const submissions = await prisma.campaignSubmission.findMany({
    where: { clipperId: userId },
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          deadline: true,
          creator: { select: { id: true, nickname: true, name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const totalEarned = submissions.reduce((sum, s) => sum + Number(s.totalPaid), 0);
  const activeCampaigns = submissions.filter((s) =>
    ["APPLIED", "JOINED", "SUBMITTED", "IN_REVIEW", "REVISION_REQ"].includes(s.status)
  ).length;
  const completedCampaigns = submissions.filter((s) =>
    ["APPROVED", "PAID", "REJECTED", "APPLICATION_REJECTED", "WITHDRAWN"].includes(s.status)
  ).length;

  return { submissions, totalEarned, activeCampaigns, completedCampaigns };
}

export default async function MySubmissionsPage() {
  const t = await getTranslations("mySubmissions");
  const tc = await getTranslations("campaigns");
  const session = await auth();
  const userId = session?.user?.id;

  let data = {
    submissions: [] as any[],
    totalEarned: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
  };

  if (userId) {
    try {
      data = await getMySubmissions(userId);
    } catch (e) {
      console.error("Failed to fetch submissions:", e);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <Wallet className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("totalEarnings")}</p>
              <p className="text-2xl font-bold">{formatKRW(data.totalEarned)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("activeCampaigns")}</p>
              <p className="text-2xl font-bold">{data.activeCampaigns}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("completedCampaigns")}</p>
              <p className="text-2xl font-bold">{data.completedCampaigns}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">{t("noCampaigns")}</p>
              <p className="text-sm text-muted-foreground/70">{t("browseText")}</p>
              <Link href="/campaigns" className="mt-4">
                <Button variant="outline">캠페인 둘러보기</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.submissions.map((sub: any) => (
                <Link key={sub.id} href={`/campaigns/${sub.campaign.id}`}>
                  <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent">
                    <div className="space-y-1">
                      <p className="font-medium">{sub.campaign.title}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="transition-colors">
                          {sub.campaign.creator.nickname ?? sub.campaign.creator.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {safeTranslate(tc as (key: string) => string, `type.${sub.campaign.type}`, sub.campaign.type)}
                        </Badge>
                        {sub.clipTitle && (
                          <span className="text-xs">클립: {sub.clipTitle}</span>
                        )}
                        {sub.latestViewCount > 0 && (
                          <span className="flex items-center gap-1 text-xs">
                            <Eye className="h-3 w-3" />
                            {sub.latestViewCount.toLocaleString()}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          {new Date(sub.campaign.deadline).toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {Number(sub.totalPaid) > 0 && (
                        <span className="text-sm font-medium text-green-600">
                          {formatKRW(Number(sub.totalPaid))}
                        </span>
                      )}
                      <Badge variant={SUB_STATUS_COLORS[sub.status] ?? "outline"}>
                        {safeTranslate(tc as (key: string) => string, `submission.status.${sub.status}`, sub.status)}
                      </Badge>
                    </div>
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
