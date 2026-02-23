import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiResponse, requireAuth } from "@/lib/api/helpers";
import { syncSubmissionMetrics } from "@/lib/social/submission-analytics";

const RATE_LIMIT_WINDOW_MS = 30 * 1000;
const rateLimitStore = new Map<string, number>();

function isRateLimited(key: string) {
  const now = Date.now();
  const last = rateLimitStore.get(key);
  if (last && now - last < RATE_LIMIT_WINDOW_MS) {
    return true;
  }

  rateLimitStore.set(key, now);
  return false;
}

// POST /api/v1/campaigns/[id]/submissions/[subId]/metrics/refresh
export async function POST(
  _request: NextRequest,
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
        },
      },
    },
  });

  if (!submission) return apiError("Submission not found", 404);
  if (submission.campaign.id !== id) return apiError("Submission does not belong to this campaign", 400);

  let canAccess = submission.clipperId === user.id || submission.campaign.creatorId === user.id;
  if (!canAccess) {
    const participant = await prisma.campaignSubmission.findUnique({
      where: {
        campaignId_clipperId: {
          campaignId: submission.campaign.id,
          clipperId: user.id,
        },
      },
      select: { status: true },
    });
    canAccess = Boolean(
      participant && !["APPLICATION_REJECTED", "WITHDRAWN"].includes(participant.status)
    );
  }
  if (!canAccess) return apiError("Forbidden", 403);

  const rateKey = `${user.id}:${subId}`;
  if (isRateLimited(rateKey)) {
    return apiError("잠시 후 다시 시도해주세요. (30초 제한)", 429);
  }

  const syncResult = await syncSubmissionMetrics(subId);
  if (!syncResult.ok) {
    return apiError(syncResult.reason || "메트릭 갱신에 실패했습니다.", 400);
  }

  return apiResponse({
    refreshed: true,
    analytics: syncResult.analytics,
  });
}
