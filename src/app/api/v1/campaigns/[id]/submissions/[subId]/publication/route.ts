import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { assertCreatorYouTubeReady } from "@/lib/social/creator-youtube";
import {
  buildSubmissionAnalyticsPayload,
  computeNextMetricsSyncAt,
  prepareVerifiedSubmissionContext,
} from "@/lib/social/submission-analytics";

const linkPublicationSchema = z.object({
  publishedUrl: z.string().url(),
  clipTitle: z.string().trim().min(1).max(200).optional(),
});

// POST /api/v1/campaigns/[id]/submissions/[subId]/publication
// Creator links published YouTube URL after approving editor submission.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { id, subId } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: subId },
    include: {
      campaign: {
        select: {
          id: true,
          creatorId: true,
          workflow: true,
        },
      },
    },
  });

  if (!submission) return apiError("Submission not found", 404);
  if (submission.campaignId !== id) {
    return apiError("Submission does not belong to this campaign", 400);
  }
  if (submission.campaign.creatorId !== user.id) return apiError("Forbidden", 403);
  if (submission.campaign.workflow !== "CREATOR_PUBLISH") {
    return apiError("이 기능은 크리에이터 게시형 워크플로우에서만 사용할 수 있습니다.", 409);
  }
  if (!["APPROVED", "PAID"].includes(submission.status)) {
    return apiError("승인된 제출물만 게시 URL을 연결할 수 있습니다.", 409);
  }

  try {
    await assertCreatorYouTubeReady(user.id);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "크리에이터 YouTube 권한 확인에 실패했습니다.", 403);
  }

  const body = await request.json();
  const parsed = parseBody(linkPublicationSchema, body);
  if ("error" in parsed) return apiError(parsed.error);

  let verified:
    | Awaited<ReturnType<typeof prepareVerifiedSubmissionContext>>
    | null = null;
  try {
    verified = await prepareVerifiedSubmissionContext({
      ownerUserId: submission.campaign.creatorId,
      clipUrl: parsed.data.publishedUrl,
      targetPlatform: "YOUTUBE_SHORTS",
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "게시 URL 검증에 실패했습니다.");
  }

  if (!verified || verified.providerEnum !== "YOUTUBE") {
    return apiError("YouTube 게시 URL만 연결할 수 있습니다.", 422);
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const nextSyncAt = computeNextMetricsSyncAt(submission.submittedAt ?? now, now);

    const linked = await tx.campaignSubmission.update({
      where: { id: submission.id },
      data: {
        clipTitle: parsed.data.clipTitle ?? submission.clipTitle,
        clipUrl: verified.canonicalUrl,
        targetPlatform: "YOUTUBE_SHORTS",
        analyticsProvider: "YOUTUBE",
        platformVideoId: verified.platformVideoId,
        linkedSocialConnectionId: verified.linkedSocialConnectionId,
        postedAt: verified.postedAt ?? null,
        ownershipVerifiedAt: now,
        baselineCapturedAt: now,
        baselineViewCount: verified.current.viewCount,
        baselineLikeCount: verified.current.likeCount,
        baselineCommentCount: verified.current.commentCount,
        latestViewCount: verified.current.viewCount,
        lastSnapshotAt: now,
        lastMetricsSyncedAt: now,
        nextMetricsSyncAt: nextSyncAt,
        metricsSyncStatus: "ACTIVE",
        metricsLastError: null,
        metricsAuthErrorCount: 0,
      } as any,
    });

    await tx.viewSnapshot.create({
      data: {
        submissionId: submission.id,
        viewCount: verified.current.viewCount,
        likeCount: verified.current.likeCount,
        commentCount: verified.current.commentCount,
        shareCount: verified.current.shareCount,
        reachCount: verified.current.reachCount,
        impressionCount: verified.current.impressionCount,
        saveCount: verified.current.saveCount,
        estimatedMinutesWatched: verified.current.estimatedMinutesWatched,
        averageViewDurationSec: verified.current.averageViewDurationSec,
        averageViewPercentage: verified.current.averageViewPercentage,
        trafficExternalViews: verified.current.trafficExternalViews,
        trafficSearchViews: verified.current.trafficSearchViews,
        trafficSuggestedViews: verified.current.trafficSuggestedViews,
        trafficDirectViews: verified.current.trafficDirectViews,
        delta: 0,
        source: "YOUTUBE_API",
        rawPayload: verified.current.rawPayload as any,
        capturedAt: now,
      } as any,
    });

    await tx.socialVideo.upsert({
      where: {
        socialConnectionId_platformVideoId: {
          socialConnectionId: verified.linkedSocialConnectionId,
          platformVideoId: verified.platformVideoId,
        },
      },
      create: {
        socialConnectionId: verified.linkedSocialConnectionId,
        platformVideoId: verified.platformVideoId,
        submissionId: submission.id,
        url: verified.canonicalUrl,
        title: parsed.data.clipTitle ?? submission.clipTitle,
        thumbnailUrl: submission.thumbnailUrl,
        viewCount: verified.current.viewCount,
        likeCount: verified.current.likeCount,
        commentCount: verified.current.commentCount,
        shareCount: verified.current.shareCount ?? 0,
        publishedAt: verified.postedAt ?? undefined,
        lastSyncedAt: now,
      },
      update: {
        submissionId: submission.id,
        url: verified.canonicalUrl,
        title: parsed.data.clipTitle ?? submission.clipTitle,
        thumbnailUrl: submission.thumbnailUrl,
        viewCount: verified.current.viewCount,
        likeCount: verified.current.likeCount,
        commentCount: verified.current.commentCount,
        shareCount: verified.current.shareCount ?? 0,
        publishedAt: verified.postedAt ?? undefined,
        lastSyncedAt: now,
      },
    });

    return linked;
  });

  return apiResponse({
    ...updated,
    analyticsSyncStarted: true,
    analyticsSummary: buildSubmissionAnalyticsPayload({
      ...updated,
      snapshots: [
        {
          viewCount: verified.current.viewCount,
          likeCount: verified.current.likeCount,
          commentCount: verified.current.commentCount,
          shareCount: verified.current.shareCount ?? 0,
          reachCount: verified.current.reachCount ?? 0,
          impressionCount: verified.current.impressionCount ?? 0,
          saveCount: verified.current.saveCount ?? 0,
          estimatedMinutesWatched: verified.current.estimatedMinutesWatched ?? 0,
          averageViewDurationSec: verified.current.averageViewDurationSec ?? null,
          averageViewPercentage: verified.current.averageViewPercentage ?? null,
          trafficExternalViews: verified.current.trafficExternalViews ?? 0,
          trafficSearchViews: verified.current.trafficSearchViews ?? 0,
          trafficSuggestedViews: verified.current.trafficSuggestedViews ?? 0,
          trafficDirectViews: verified.current.trafficDirectViews ?? 0,
        },
      ],
    }),
  });
}
