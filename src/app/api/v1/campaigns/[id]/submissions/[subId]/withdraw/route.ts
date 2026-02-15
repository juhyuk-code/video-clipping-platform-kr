import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth } from "@/lib/api/helpers";

// PATCH /api/v1/campaigns/[id]/submissions/[subId]/withdraw
// Clipper withdraws application before clip submission.
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { id, subId } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: subId },
    include: { campaign: { select: { id: true, creatorId: true, title: true, participantCount: true } } },
  });
  if (!submission) return apiError("Submission not found", 404);
  if (submission.campaignId !== id) return apiError("Submission does not belong to this campaign", 400);
  if (submission.clipperId !== user.id) return apiError("Forbidden", 403);

  if (!["APPLIED", "JOINED"].includes(submission.status)) {
    return apiError("현재 상태에서는 지원 철회가 불가능합니다.", 409);
  }

  if (submission.submittedAt) {
    return apiError("클립을 제출한 이후에는 지원을 철회할 수 없습니다.", 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const now = new Date();

    // Prefer JOINED -> WITHDRAWN path first so participant count stays in sync.
    const joinedResult = await tx.campaignSubmission.updateMany({
      where: { id: subId, status: "JOINED", submittedAt: null },
      data: { status: "WITHDRAWN", withdrawnAt: now },
    });

    if (joinedResult.count === 1) {
      if (submission.campaign.participantCount > 0) {
        await tx.campaign.update({
          where: { id },
          data: { participantCount: { decrement: 1 } },
        });
      }
      const sub = await tx.campaignSubmission.findUnique({ where: { id: subId } });
      if (!sub) throw new Error("SUBMISSION_NOT_FOUND");
      return sub;
    }

    const appliedResult = await tx.campaignSubmission.updateMany({
      where: { id: subId, status: "APPLIED", submittedAt: null },
      data: { status: "WITHDRAWN", withdrawnAt: now },
    });

    if (appliedResult.count !== 1) throw new Error("WITHDRAW_NOT_ALLOWED");
    const sub = await tx.campaignSubmission.findUnique({ where: { id: subId } });
    if (!sub) throw new Error("SUBMISSION_NOT_FOUND");
    return sub;
  }).catch((error) => {
    if (error instanceof Error && error.message === "WITHDRAW_NOT_ALLOWED") {
      return null;
    }
    throw error;
  });

  if (!updated) {
    return apiError("현재 상태에서는 지원 철회가 불가능합니다.", 409);
  }

  await prisma.notification.create({
    data: {
      userId: submission.campaign.creatorId,
      type: "SYSTEM",
      title: "지원이 철회되었습니다",
      body: `"${submission.campaign.title}" 캠페인에서 클리퍼가 지원을 철회했습니다.`,
      linkUrl: `/campaigns/${id}`,
    },
  });

  return apiResponse(updated);
}
