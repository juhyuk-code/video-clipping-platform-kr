import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { submitToCampaignSchema, reviewSubmissionSchema } from "@/lib/validations";
import { calculateFees } from "@/lib/payments/toss";

// GET /api/v1/campaigns/[id]/submissions/[subId]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { subId } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: subId },
    include: {
      campaign: {
        include: {
          creator: { select: { id: true, nickname: true, name: true, image: true } },
        },
      },
      clipper: {
        select: {
          id: true,
          nickname: true,
          name: true,
          image: true,
          bio: true,
          clipperProfile: {
            select: {
              editingTools: true,
              specializations: true,
              languages: true,
              tier: true,
              averageRating: true,
              totalProjectsCompleted: true,
            },
          },
        },
      },
      snapshots: { orderBy: { capturedAt: "desc" }, take: 10 },
      fraudCheck: true,
    },
  });

  if (!submission) return apiError("Submission not found", 404);
  if (submission.clipperId !== user.id && submission.campaign.creatorId !== user.id) {
    return apiError("Forbidden", 403);
  }

  return apiResponse(submission);
}

// PUT /api/v1/campaigns/[id]/submissions/[subId] — Submit clip OR review submission
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { id, subId } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: subId },
    include: { campaign: true },
  });
  if (!submission) return apiError("Submission not found", 404);
  if (submission.campaignId !== id) return apiError("Submission does not belong to this campaign", 400);

  const body = await request.json();
  const isCreator = submission.campaign.creatorId === user.id;
  const isClipper = submission.clipperId === user.id;

  // ── Clipper submitting a clip ──
  if (isClipper && !isCreator) {
    if (!["APPLIED", "JOINED", "REVISION_REQ"].includes(submission.status)) {
      // Also allow re-submission if previously submitted
      if (submission.status !== "SUBMITTED") {
        return apiError("현재 상태에서는 클립을 제출할 수 없습니다");
      }
    }

    const parsed = parseBody(submitToCampaignSchema, body);
    if ("error" in parsed) return apiError(parsed.error);

    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.campaignSubmission.update({
        where: { id: subId },
        data: {
          clipTitle: parsed.data.clipTitle,
          clipUrl: parsed.data.clipUrl,
          clipFileUrl: parsed.data.clipFileUrl,
          thumbnailUrl: parsed.data.thumbnailUrl,
          targetPlatform: parsed.data.targetPlatform,
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });
      await tx.campaign.update({
        where: { id },
        data: { submissionCount: { increment: 1 } },
      });
      return sub;
    });

    // Notify creator
    await prisma.notification.create({
      data: {
        userId: submission.campaign.creatorId,
        type: "CLIP_SUBMITTED",
        title: "클립이 제출되었습니다",
        body: `"${submission.campaign.title}" 캠페인에 새 클립이 제출되었습니다.`,
        linkUrl: `/campaigns/${id}`,
      },
    });

    return apiResponse(updated);
  }

  // ── Creator reviewing a submission ──
  if (isCreator) {
    if (!["SUBMITTED", "IN_REVIEW"].includes(submission.status)) {
      return apiError("리뷰할 수 있는 상태가 아닙니다");
    }

    const parsed = parseBody(reviewSubmissionSchema, body);
    if ("error" in parsed) return apiError(parsed.error);

    const { status, revisionNotes } = parsed.data;

    if (status === "APPROVED") {
      // Process payment for PROJECT/HYBRID types
      const campaign = submission.campaign;
      let payAmount = 0;

      if (campaign.type === "PROJECT" || campaign.type === "HYBRID") {
        payAmount = Number(campaign.fixedPayPerClip ?? 0);
      }

      if (payAmount > 0) {
        const { platformFee, netPayeeAmount } = calculateFees(payAmount);

        await prisma.$transaction(async (tx) => {
          // Update submission
          await tx.campaignSubmission.update({
            where: { id: subId },
            data: {
              status: "APPROVED",
              reviewedAt: new Date(),
              fixedAmount: netPayeeAmount,
              totalPaid: netPayeeAmount,
              paidAt: new Date(),
            },
          });

          // Update campaign counters
          await tx.campaign.update({
            where: { id },
            data: {
              approvedCount: { increment: 1 },
              totalSpent: { increment: payAmount },
            },
          });

          // Release from escrow to clipper wallet
          const creatorWallet = await tx.wallet.findUnique({ where: { userId: campaign.creatorId } });
          if (creatorWallet) {
            await tx.wallet.update({
              where: { userId: campaign.creatorId },
              data: { escrowHeld: { decrement: payAmount } },
            });
            await tx.walletTransaction.create({
              data: {
                walletId: creatorWallet.id,
                type: "ESCROW_RELEASE",
                status: "COMPLETED",
                amount: payAmount,
                balanceBefore: Number(creatorWallet.balance),
                balanceAfter: Number(creatorWallet.balance),
                description: `에스크로 릴리스: ${campaign.title}`,
                referenceId: subId,
                referenceType: "submission",
              },
            });
          }

          // Credit clipper wallet
          let clipperWallet = await tx.wallet.findUnique({ where: { userId: submission.clipperId } });
          if (!clipperWallet) {
            clipperWallet = await tx.wallet.create({
              data: { userId: submission.clipperId },
            });
          }
          const clipperBalanceBefore = Number(clipperWallet.balance);
          await tx.wallet.update({
            where: { userId: submission.clipperId },
            data: {
              balance: { increment: netPayeeAmount },
              totalEarned: { increment: netPayeeAmount },
            },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: clipperWallet.id,
              type: "ESCROW_RELEASE",
              status: "COMPLETED",
              amount: netPayeeAmount,
              balanceBefore: clipperBalanceBefore,
              balanceAfter: clipperBalanceBefore + netPayeeAmount,
              description: `클립 승인 수익: ${campaign.title}`,
              referenceId: subId,
              referenceType: "submission",
            },
          });
        });
      } else {
        await prisma.$transaction([
          prisma.campaignSubmission.update({
            where: { id: subId },
            data: { status: "APPROVED", reviewedAt: new Date() },
          }),
          prisma.campaign.update({
            where: { id },
            data: { approvedCount: { increment: 1 } },
          }),
        ]);
      }

      await prisma.notification.create({
        data: {
          userId: submission.clipperId,
          type: "CAMPAIGN_APPROVED",
          title: "클립이 승인되었습니다!",
          body: `"${submission.campaign.title}" 캠페인의 클립이 승인되었습니다.`,
          linkUrl: `/campaigns/${id}`,
        },
      });

      const updated = await prisma.campaignSubmission.findUnique({ where: { id: subId } });
      return apiResponse(updated);
    }

    if (status === "REVISION_REQ") {
      const updated = await prisma.campaignSubmission.update({
        where: { id: subId },
        data: {
          status: "REVISION_REQ",
          revisionNotes,
          revisionCount: { increment: 1 },
          reviewedAt: new Date(),
        },
      });

      await prisma.notification.create({
        data: {
          userId: submission.clipperId,
          type: "REVISION_REQUESTED",
          title: "수정이 요청되었습니다",
          body: `"${submission.campaign.title}" 캠페인 클립에 수정 요청이 있습니다.`,
          linkUrl: `/campaigns/${id}`,
        },
      });

      return apiResponse(updated);
    }

    if (status === "REJECTED") {
      const updated = await prisma.campaignSubmission.update({
        where: { id: subId },
        data: { status: "REJECTED", revisionNotes, reviewedAt: new Date() },
      });

      await prisma.notification.create({
        data: {
          userId: submission.clipperId,
          type: "CAMPAIGN_REJECTED",
          title: "클립이 반려되었습니다",
          body: `"${submission.campaign.title}" 캠페인 클립이 반려되었습니다.`,
          linkUrl: `/campaigns/${id}`,
        },
      });

      return apiResponse(updated);
    }
  }

  return apiError("Forbidden", 403);
}
