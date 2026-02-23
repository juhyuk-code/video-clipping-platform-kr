import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { applyToCampaignSchema } from "@/lib/validations";
import { getYouTubeScopeStatus } from "@/lib/social/youtube-permissions";

// GET /api/v1/campaigns/[id]/submissions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return apiError("Campaign not found", 404);

  // Creator sees all submissions. Participating editors can view shared analytics board.
  const isCreator = campaign.creatorId === user.id;
  let isParticipant = false;
  if (!isCreator) {
    const participant = await prisma.campaignSubmission.findUnique({
      where: {
        campaignId_clipperId: {
          campaignId: id,
          clipperId: user.id,
        },
      },
      select: { status: true },
    });
    isParticipant = Boolean(
      participant && !["APPLICATION_REJECTED", "WITHDRAWN"].includes(participant.status)
    );
  }

  const where: Record<string, unknown> = { campaignId: id };
  if (!isCreator && !isParticipant) where.clipperId = user.id;

  const submissions = await prisma.campaignSubmission.findMany({
    where,
    include: {
      clipper: {
        select: { id: true, nickname: true, name: true, image: true },
      },
      fraudCheck: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (isCreator || !isParticipant) {
    return apiResponse(submissions);
  }

  const redacted = submissions.map((submission) => ({
    id: submission.id,
    campaignId: submission.campaignId,
    clipperId: submission.clipperId,
    status: submission.status,
    clipTitle: submission.clipTitle,
    clipUrl: submission.clipUrl,
    thumbnailUrl: submission.thumbnailUrl,
    targetPlatform: submission.targetPlatform,
    submittedAt: submission.submittedAt,
    latestViewCount: submission.latestViewCount,
    lastMetricsSyncedAt: submission.lastMetricsSyncedAt,
    metricsSyncStatus: submission.metricsSyncStatus,
    metricsLastError: submission.metricsLastError,
    baselineViewCount: submission.baselineViewCount,
    totalPaid: submission.totalPaid,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
    clipper: submission.clipper,
    fraudCheck: null,
  }));

  return apiResponse(redacted);
}

// POST /api/v1/campaigns/[id]/submissions — Apply/Join a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return apiError("Campaign not found", 404);
  if (campaign.status !== "ACTIVE") return apiError("이 캠페인은 현재 참여할 수 없습니다");
  if (campaign.creatorId === user.id) return apiError("자신의 캠페인에는 참여할 수 없습니다");
  if (campaign.deadline <= new Date()) {
    return apiError("마감된 캠페인에는 참여할 수 없습니다");
  }

  // Check duplicate
  const existing = await prisma.campaignSubmission.findUnique({
    where: { campaignId_clipperId: { campaignId: id, clipperId: user.id } },
  });
  if (existing) return apiError("이미 이 캠페인에 참여했습니다");

  const isCreatorPublishWorkflow = campaign.workflow === "CREATOR_PUBLISH";
  if (!isCreatorPublishWorkflow) {
    const requiresYouTubeScope = campaign.targetPlatforms.includes("YOUTUBE_SHORTS");
    if (requiresYouTubeScope) {
      const youtubeConnection = await prisma.socialConnection.findUnique({
        where: {
          userId_provider: {
            userId: user.id,
            provider: "YOUTUBE",
          },
        },
        select: { scope: true },
      });

      if (!youtubeConnection) {
        return apiError("YouTube 계정을 먼저 연결하고 필수 권한을 허용해야 참여할 수 있습니다.", 403);
      }

      const scopeStatus = getYouTubeScopeStatus(youtubeConnection.scope);
      if (!scopeStatus.ready) {
        return apiError("YouTube 필수 권한(youtube.readonly, yt-analytics.readonly)이 누락되었습니다. 재연결 후 모두 허용해주세요.", 403);
      }
    }
  }

  const body = await request.json();

  if (!isCreatorPublishWorkflow && campaign.type === "REWARD") {
    // REWARD type: auto-join, no application needed
    if (campaign.maxParticipants && campaign.participantCount >= campaign.maxParticipants) {
      return apiError("캠페인 최대 참여 인원에 도달했습니다");
    }

    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.campaignSubmission.create({
        data: {
          campaignId: id,
          clipperId: user.id,
          status: "JOINED",
          joinedAt: new Date(),
        },
      });
      await tx.campaign.update({
        where: { id },
        data: { participantCount: { increment: 1 } },
      });
      return sub;
    });
    return apiResponse(submission, 201);
  }

  // CREATOR_PUBLISH is always application-first. Legacy PROJECT/HYBRID also use application-first.
  const parsed = parseBody(applyToCampaignSchema, body);
  if ("error" in parsed) return apiError(parsed.error);

  const submission = await prisma.$transaction(async (tx) => {
    const sub = await tx.campaignSubmission.create({
      data: {
        campaignId: id,
        clipperId: user.id,
        status: "APPLIED",
        pitch: parsed.data.pitch,
        proposedPrice: parsed.data.proposedPrice,
      },
    });
    return sub;
  });

  // Notify creator
  await prisma.notification.create({
    data: {
      userId: campaign.creatorId,
      type: "CAMPAIGN_SUBMISSION",
      title: "새 캠페인 지원",
      body: `${user.name ?? "에디터"}님이 "${campaign.title}" 캠페인에 지원했습니다.`,
      linkUrl: `/campaigns/${id}`,
    },
  });

  return apiResponse(submission, 201);
}
