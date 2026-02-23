import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { CampaignDetailClient } from "./campaign-detail-client";
import { defaultLocale } from "@/i18n/config";
import { getYouTubeScopeStatus } from "@/lib/social/youtube-permissions";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale?: string }>;
}) {
  const { id, locale } = await params;
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
          snapshots: {
            orderBy: { capturedAt: "desc" },
            take: 1,
            select: {
              likeCount: true,
              commentCount: true,
              capturedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!campaign) notFound();

  const mySubmission = campaign.submissions.find((s) => s.clipperId === userId);
  const isCampaignOwner = userId === campaign.creatorId;
  const isParticipant = Boolean(
    userId &&
      campaign.submissions.some(
        (submission) =>
          submission.clipperId === userId &&
          !["APPLICATION_REJECTED", "WITHDRAWN"].includes(submission.status)
      )
  );
  const canViewSharedSubmissionBoard = isCampaignOwner || isParticipant;
  const requiresYouTubeScope =
    campaign.workflow !== "CREATOR_PUBLISH" &&
    campaign.targetPlatforms.includes("YOUTUBE_SHORTS");
  const localizedCampaignPath =
    locale && locale !== defaultLocale
      ? `/${locale}/campaigns/${id}`
      : `/campaigns/${id}`;

  let youtubeJoinGate: {
    required: boolean;
    status: "READY" | "MISSING_CONNECTION" | "MISSING_SCOPE";
    missingScopes: string[];
    connectUrl: string;
    reconnectUrl: string;
  } = {
    required: requiresYouTubeScope,
    status: "READY",
    missingScopes: [],
    connectUrl: `/api/v1/social/connect/youtube?returnTo=${encodeURIComponent(localizedCampaignPath)}&source=campaign`,
    reconnectUrl: `/api/v1/social/connect/youtube?returnTo=${encodeURIComponent(localizedCampaignPath)}&source=campaign`,
  };

  if (requiresYouTubeScope && userId && userId !== campaign.creatorId) {
    const youtubeConnection = await prisma.socialConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: "YOUTUBE",
        },
      },
      select: {
        scope: true,
      },
    });

    if (!youtubeConnection) {
      youtubeJoinGate.status = "MISSING_CONNECTION";
    } else {
      const scopeStatus = getYouTubeScopeStatus(youtubeConnection.scope);
      youtubeJoinGate.status = scopeStatus.ready ? "READY" : "MISSING_SCOPE";
      youtubeJoinGate.missingScopes = scopeStatus.missing;
    }
  }

  // Serialize data for client component (convert Decimal/Date to number/string)
  const data = {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    guidelines: campaign.guidelines,
    type: campaign.type,
    workflow: campaign.workflow,
    status: campaign.status,
    createdAt: campaign.createdAt.toISOString(),
    creatorId: campaign.creator.id,
    creatorName: campaign.creator.nickname ?? campaign.creator.name ?? "Unknown",
    isOwner: isCampaignOwner,
    isParticipant,
    canViewSharedSubmissionBoard,
    participantCount: campaign.participantCount,
    submissionCount: campaign.submissionCount,
    approvedCount: campaign.approvedCount,
    totalBudget: campaign.totalBudget ? Number(campaign.totalBudget) : null,
    totalSpent: Number(campaign.totalSpent),
    fixedPayPerClip: campaign.fixedPayPerClip ? Number(campaign.fixedPayPerClip) : null,
    cprRate: campaign.cprRate ? Number(campaign.cprRate) : null,
    viewBonusRate: campaign.viewBonusRate ? Number(campaign.viewBonusRate) : null,
    deadline: campaign.deadline.toISOString(),
    maxParticipants: campaign.maxParticipants,
    targetPlatforms: campaign.targetPlatforms,
    submissions: canViewSharedSubmissionBoard
      ? campaign.submissions.map((s) => {
          const canViewSensitiveFields = isCampaignOwner || s.clipperId === userId;
          return {
            id: s.id,
            status: s.status,
            clipTitle: s.clipTitle,
            clipUrl: s.clipUrl,
            clipFileUrl: canViewSensitiveFields ? s.clipFileUrl : null,
            thumbnailUrl: s.thumbnailUrl,
            targetPlatform: s.targetPlatform,
            pitch: canViewSensitiveFields ? s.pitch : null,
            proposedPrice:
              canViewSensitiveFields && s.proposedPrice ? Number(s.proposedPrice) : null,
            latestViewCount: s.latestViewCount,
            baselineViewCount: s.baselineViewCount,
            totalPaid: Number(s.totalPaid),
            revisionNotes: canViewSensitiveFields ? s.revisionNotes : null,
            applicationDecisionNotes: canViewSensitiveFields
              ? s.applicationDecisionNotes
              : null,
            applicationReviewedAt: s.applicationReviewedAt?.toISOString() ?? null,
            joinedAt: s.joinedAt?.toISOString() ?? null,
            withdrawnAt: s.withdrawnAt?.toISOString() ?? null,
            submittedAt: s.submittedAt?.toISOString() ?? null,
            updatedAt: s.updatedAt.toISOString(),
            lastMetricsSyncedAt: s.lastMetricsSyncedAt?.toISOString() ?? null,
            metricsSyncStatus: s.metricsSyncStatus,
            metricsLastError: s.metricsLastError,
            latestLikeCount: s.snapshots[0]?.likeCount ?? null,
            latestCommentCount: s.snapshots[0]?.commentCount ?? null,
            latestSnapshotCapturedAt: s.snapshots[0]?.capturedAt?.toISOString() ?? null,
            createdAt: s.createdAt.toISOString(),
            clipper: s.clipper,
          };
        })
      : [],
    mySubmission: mySubmission
      ? {
          id: mySubmission.id,
          status: mySubmission.status,
          revisionNotes: mySubmission.revisionNotes,
          applicationDecisionNotes: mySubmission.applicationDecisionNotes,
        }
      : null,
    youtubeJoinGate,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </Button>
        </Link>
      </div>

      <CampaignDetailClient campaign={data} />
    </div>
  );
}
