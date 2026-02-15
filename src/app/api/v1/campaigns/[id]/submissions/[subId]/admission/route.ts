import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { admissionDecisionSchema } from "@/lib/validations";

// PATCH /api/v1/campaigns/[id]/submissions/[subId]/admission
// Creator accepts/rejects an application (APPLIED -> JOINED / APPLICATION_REJECTED)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { id, subId } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: subId },
    include: { campaign: true, clipper: { select: { id: true, name: true, nickname: true } } },
  });
  if (!submission) return apiError("Submission not found", 404);
  if (submission.campaignId !== id) return apiError("Submission does not belong to this campaign", 400);

  if (submission.campaign.creatorId !== user.id) return apiError("Forbidden", 403);
  if (submission.status !== "APPLIED") {
    return apiError("지원서 심사는 APPLIED 상태에서만 가능합니다.", 409);
  }

  const body = await request.json();
  const parsed = parseBody(admissionDecisionSchema, body);
  if ("error" in parsed) return apiError(parsed.error);

  const { decision } = parsed.data;
  const reason = parsed.data.reason?.trim();

  if (decision === "ACCEPT") {
    try {
      const updated = await prisma.$transaction(async (tx) => {
        const campaign = await tx.campaign.findUnique({ where: { id } });
        if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
        if (campaign.status !== "ACTIVE") throw new Error("CAMPAIGN_NOT_ACTIVE");
        if (campaign.deadline <= new Date()) throw new Error("CAMPAIGN_DEADLINE_PASSED");
        if (campaign.maxParticipants && campaign.participantCount >= campaign.maxParticipants) {
          throw new Error("MAX_PARTICIPANTS_REACHED");
        }

        const result = await tx.campaignSubmission.updateMany({
          where: { id: subId, status: "APPLIED" },
          data: {
            status: "JOINED",
            joinedAt: new Date(),
            applicationReviewedAt: new Date(),
            applicationDecisionNotes: reason ?? null,
          },
        });
        if (result.count !== 1) throw new Error("APPLICATION_NOT_PENDING");

        const sub = await tx.campaignSubmission.findUnique({ where: { id: subId } });
        if (!sub) throw new Error("SUBMISSION_NOT_FOUND");

        await tx.campaign.update({
          where: { id },
          data: { participantCount: { increment: 1 } },
        });

        return sub;
      });

      await prisma.notification.create({
        data: {
          userId: submission.clipperId,
          type: "SYSTEM",
          title: "캠페인 지원이 승인되었습니다",
          body: `"${submission.campaign.title}" 캠페인에 참여가 승인되었습니다. 이제 클립을 제출할 수 있습니다.`,
          linkUrl: `/campaigns/${id}`,
        },
      });

      return apiResponse(updated);
    } catch (error) {
      if (!(error instanceof Error)) return apiError("지원 승인 처리 중 오류가 발생했습니다.", 500);
      if (error.message === "CAMPAIGN_NOT_FOUND") return apiError("Campaign not found", 404);
      if (error.message === "SUBMISSION_NOT_FOUND") return apiError("Submission not found", 404);
      if (error.message === "CAMPAIGN_NOT_ACTIVE") return apiError("캠페인이 활성 상태가 아닙니다.", 409);
      if (error.message === "CAMPAIGN_DEADLINE_PASSED") return apiError("마감된 캠페인은 승인할 수 없습니다.", 409);
      if (error.message === "MAX_PARTICIPANTS_REACHED") return apiError("캠페인 최대 참여 인원에 도달했습니다.", 409);
      if (error.message === "APPLICATION_NOT_PENDING") return apiError("이미 처리된 지원서입니다.", 409);
      return apiError("지원 승인 처리 중 오류가 발생했습니다.", 500);
    }
  }

  const rejectResult = await prisma.campaignSubmission.updateMany({
    where: { id: subId, status: "APPLIED" },
    data: {
      status: "APPLICATION_REJECTED",
      applicationReviewedAt: new Date(),
      applicationDecisionNotes: reason,
    },
  });
  if (rejectResult.count !== 1) {
    return apiError("이미 처리된 지원서입니다.", 409);
  }

  const updated = await prisma.campaignSubmission.findUnique({ where: { id: subId } });
  if (!updated) return apiError("Submission not found", 404);

  await prisma.notification.create({
    data: {
      userId: submission.clipperId,
      type: "SYSTEM",
      title: "캠페인 지원이 반려되었습니다",
      body: `"${submission.campaign.title}" 캠페인 지원이 반려되었습니다. 사유: ${reason}`,
      linkUrl: `/campaigns/${id}`,
    },
  });

  return apiResponse(updated);
}
