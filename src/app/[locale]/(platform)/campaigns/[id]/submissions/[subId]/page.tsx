import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { SubmissionDetailClient } from "./submission-detail-client";
import { buildSubmissionAnalyticsPayload } from "@/lib/social/submission-analytics";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string; subId: string }>;
}) {
  const { id, subId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: subId },
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          guidelines: true,
          creatorId: true,
          fixedPayPerClip: true,
          cprRate: true,
          viewBonusRate: true,
          totalBudget: true,
          targetPlatforms: true,
        },
      },
      clipper: {
        select: {
          id: true,
          nickname: true,
          name: true,
          image: true,
          bio: true,
          role: true,
          createdAt: true,
          clipperProfile: {
            select: {
              editingTools: true,
              specializations: true,
              languages: true,
              tier: true,
              isVerified: true,
              averageRating: true,
              totalProjectsCompleted: true,
              portfolioItems: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  videoUrl: true,
                  thumbnailUrl: true,
                  platform: true,
                  viewCount: true,
                },
                take: 12,
                orderBy: { createdAt: "desc" },
              },
            },
          },
          creatorProfile: {
            select: {
              youtubeChannelName: true,
              subscriberCount: true,
              contentCategories: true,
              preferredClipStyle: true,
              twitchUrl: true,
              afreecaTvUrl: true,
              chzzkUrl: true,
              averageRating: true,
              totalProjectsPosted: true,
            },
          },
          socialConnections: {
            select: {
              provider: true,
              username: true,
              displayName: true,
              profileUrl: true,
              followerCount: true,
              channelName: true,
            },
          },
          _count: {
            select: {
              reviewsReceived: true,
            },
          },
        },
      },
      snapshots: { orderBy: { capturedAt: "desc" }, take: 20 },
    },
  });

  if (!submission) notFound();

  // Access control: only campaign creator or the clipper themselves
  const isCreator = submission.campaign.creatorId === session.user.id;
  const isClipper = submission.clipperId === session.user.id;
  if (!isCreator && !isClipper) notFound();

  // Fetch additional clipper stats in parallel (for creator view)
  const clipperId = submission.clipperId;
  const [submissionCounts, viewsAggregate, activeCampaignCount] = await Promise.all([
    prisma.campaignSubmission.groupBy({
      by: ["status"],
      where: { clipperId },
      _count: true,
    }),
    prisma.campaignSubmission.aggregate({
      where: { clipperId },
      _sum: { latestViewCount: true },
    }),
    prisma.campaignSubmission.count({
      where: {
        clipperId,
        status: { in: ["JOINED", "SUBMITTED", "IN_REVIEW"] },
        NOT: { id: submission.id },
      },
    }),
  ]);

  const totalSubmissions = submissionCounts.reduce((sum, g) => sum + g._count, 0);
  const approvedCount = submissionCounts
    .filter((g) => g.status === "APPROVED" || g.status === "PAID")
    .reduce((sum, g) => sum + g._count, 0);

  // Serialize for client
  const data = {
    id: submission.id,
    status: submission.status,
    pitch: submission.pitch,
    proposedPrice: submission.proposedPrice ? Number(submission.proposedPrice) : null,
    clipTitle: submission.clipTitle,
    clipUrl: submission.clipUrl,
    clipFileUrl: submission.clipFileUrl,
    thumbnailUrl: submission.thumbnailUrl,
    targetPlatform: submission.targetPlatform,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    revisionNotes: submission.revisionNotes,
    revisionCount: submission.revisionCount,
    applicationDecisionNotes: submission.applicationDecisionNotes,
    applicationReviewedAt: submission.applicationReviewedAt?.toISOString() ?? null,
    joinedAt: submission.joinedAt?.toISOString() ?? null,
    withdrawnAt: submission.withdrawnAt?.toISOString() ?? null,
    latestViewCount: submission.latestViewCount,
    fixedAmount: submission.fixedAmount ? Number(submission.fixedAmount) : null,
    rewardAmount: submission.rewardAmount ? Number(submission.rewardAmount) : null,
    totalPaid: Number(submission.totalPaid),
    paidAt: submission.paidAt?.toISOString() ?? null,
    createdAt: submission.createdAt.toISOString(),
    campaign: {
      id: submission.campaign.id,
      title: submission.campaign.title,
      type: submission.campaign.type,
      status: submission.campaign.status,
      guidelines: submission.campaign.guidelines,
      fixedPayPerClip: submission.campaign.fixedPayPerClip ? Number(submission.campaign.fixedPayPerClip) : null,
      cprRate: submission.campaign.cprRate ? Number(submission.campaign.cprRate) : null,
      viewBonusRate: submission.campaign.viewBonusRate ? Number(submission.campaign.viewBonusRate) : null,
      totalBudget: submission.campaign.totalBudget ? Number(submission.campaign.totalBudget) : null,
      targetPlatforms: submission.campaign.targetPlatforms,
    },
    clipper: {
      id: submission.clipper.id,
      nickname: submission.clipper.nickname,
      name: submission.clipper.name,
      image: submission.clipper.image,
      bio: submission.clipper.bio,
      clipperProfile: submission.clipper.clipperProfile
        ? {
            ...submission.clipper.clipperProfile,
            averageRating: submission.clipper.clipperProfile.averageRating
              ? Number(submission.clipper.clipperProfile.averageRating)
              : null,
          }
        : null,
    },
    clipperProfile: {
      id: submission.clipper.id,
      nickname: submission.clipper.nickname,
      role: submission.clipper.role,
      bio: submission.clipper.bio,
      image: submission.clipper.image,
      createdAt: submission.clipper.createdAt.toISOString(),
      creatorProfile: submission.clipper.creatorProfile
        ? {
            ...submission.clipper.creatorProfile,
            averageRating: submission.clipper.creatorProfile.averageRating
              ? Number(submission.clipper.creatorProfile.averageRating)
              : null,
          }
        : null,
      clipperProfile: submission.clipper.clipperProfile
        ? {
            ...submission.clipper.clipperProfile,
            averageRating: submission.clipper.clipperProfile.averageRating
              ? Number(submission.clipper.clipperProfile.averageRating)
              : null,
          }
        : null,
      socialConnections: submission.clipper.socialConnections,
      _count: submission.clipper._count,
    },
    snapshots: submission.snapshots.map((s) => ({
      viewCount: s.viewCount,
      capturedAt: s.capturedAt.toISOString(),
    })),
    analytics: buildSubmissionAnalyticsPayload(submission as any),
    clipperStats: {
      totalSubmissions,
      approvedCount,
      approvalRate: totalSubmissions > 0 ? Math.round((approvedCount / totalSubmissions) * 100) : null,
      totalViewsGenerated: viewsAggregate._sum.latestViewCount ?? 0,
      activeCampaigns: activeCampaignCount,
    },
    isCreator,
    isClipper,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/campaigns/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            캠페인으로 돌아가기
          </Button>
        </Link>
      </div>

      <SubmissionDetailClient submission={data} />
    </div>
  );
}
