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
  Users,
  FileCheck,
  CheckCircle,
  Eye,
  Wallet,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatKRW } from "@/lib/utils";
import { notFound } from "next/navigation";
import { CampaignActions } from "./campaign-actions";

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

const SUB_STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  APPLIED: "outline",
  JOINED: "secondary",
  SUBMITTED: "default",
  IN_REVIEW: "secondary",
  APPROVED: "default",
  REVISION_REQ: "destructive",
  REJECTED: "destructive",
  PAID: "outline",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("campaigns");
  const tc = await getTranslations("common");
  const session = await auth();
  const userId = session?.user?.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      creator: {
        select: { id: true, nickname: true, name: true, image: true },
      },
      submissions: {
        include: {
          clipper: {
            select: { id: true, nickname: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!campaign) notFound();

  const isCreator = userId === campaign.creatorId;
  const mySubmission = campaign.submissions.find((s) => s.clipperId === userId);
  const remaining = Number(campaign.totalBudget ?? 0) - Number(campaign.totalSpent);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            {tc("back")}
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{campaign.title}</h1>
            <Badge variant={TYPE_COLORS[campaign.type]}>{t(`type.${campaign.type}`)}</Badge>
            <Badge variant={STATUS_COLORS[campaign.status]}>{t(`status.${campaign.status}`)}</Badge>
          </div>
          <p className="text-muted-foreground">
            {campaign.creator.nickname ?? campaign.creator.name} &middot;{" "}
            {new Date(campaign.createdAt).toLocaleDateString("ko-KR")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">{t("detail.participants")}</p>
              <p className="text-xl font-bold">{campaign.participantCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <FileCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">{t("detail.submissions")}</p>
              <p className="text-xl font-bold">{campaign.submissionCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <CheckCircle className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">{t("detail.approved")}</p>
              <p className="text-xl font-bold">{campaign.approvedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <Wallet className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">{t("detail.budget")}</p>
              <p className="text-xl font-bold">
                {campaign.totalBudget ? formatKRW(Number(campaign.totalBudget)) : "무제한"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description + Guidelines */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("fields.description")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{campaign.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("fields.guidelines")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{campaign.guidelines}</p>
            </CardContent>
          </Card>

          {/* Submissions list */}
          <Card>
            <CardHeader>
              <CardTitle>{t("submission.title")} ({campaign.submissions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.submissions.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{t("detail.noSubmissions")}</p>
              ) : (
                <div className="space-y-3">
                  {campaign.submissions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {sub.clipper.nickname ?? sub.clipper.name}
                        </p>
                        {sub.clipTitle && (
                          <p className="text-sm text-muted-foreground">{sub.clipTitle}</p>
                        )}
                        {sub.pitch && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{sub.pitch}</p>
                        )}
                        {sub.clipUrl && (
                          <a
                            href={sub.clipUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            클립 보기
                          </a>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {sub.latestViewCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {sub.latestViewCount.toLocaleString()} views
                            </span>
                          )}
                          <span>
                            {new Date(sub.createdAt).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sub.totalPaid && Number(sub.totalPaid) > 0 && (
                          <span className="text-sm font-medium text-green-600">
                            {formatKRW(Number(sub.totalPaid))}
                          </span>
                        )}
                        <Badge variant={SUB_STATUS_COLORS[sub.status] ?? "outline"}>
                          {t(`submission.status.${sub.status}`)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing details */}
          <Card>
            <CardHeader>
              <CardTitle>보상 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {campaign.fixedPayPerClip && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("detail.perClip")}</span>
                  <span className="font-medium">{formatKRW(Number(campaign.fixedPayPerClip))}</span>
                </div>
              )}
              {campaign.cprRate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("detail.perView")}</span>
                  <span className="font-medium">{formatKRW(Number(campaign.cprRate))}</span>
                </div>
              )}
              {campaign.viewBonusRate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">뷰 보너스</span>
                  <span className="font-medium">{formatKRW(Number(campaign.viewBonusRate))}/1K</span>
                </div>
              )}
              {campaign.totalBudget && (
                <>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="text-muted-foreground">{t("detail.spent")}</span>
                    <span className="font-medium">{formatKRW(Number(campaign.totalSpent))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("detail.remaining")}</span>
                    <span className="font-medium">{formatKRW(remaining)}</span>
                  </div>
                </>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="text-muted-foreground">{t("fields.deadline")}</span>
                <span className="font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(campaign.deadline).toLocaleDateString("ko-KR")}
                </span>
              </div>
              {campaign.maxParticipants && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("fields.maxParticipants")}</span>
                  <span className="font-medium">
                    {campaign.participantCount}/{campaign.maxParticipants}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Platforms */}
          <Card>
            <CardHeader>
              <CardTitle>{t("fields.targetPlatforms")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {campaign.targetPlatforms.map((p) => (
                  <Badge key={p} variant="outline">{p.replace("_", " ")}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions (client component) */}
          <CampaignActions
            campaignId={campaign.id}
            campaignType={campaign.type}
            campaignStatus={campaign.status}
            isCreator={isCreator}
            mySubmission={mySubmission ? {
              id: mySubmission.id,
              status: mySubmission.status,
              revisionNotes: mySubmission.revisionNotes,
            } : null}
          />
        </div>
      </div>
    </div>
  );
}
