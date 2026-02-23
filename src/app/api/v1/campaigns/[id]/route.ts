import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { updateCampaignSchema } from "@/lib/validations";
import { assertCreatorYouTubeReady } from "@/lib/social/creator-youtube";

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type BonusSettlementCandidate = {
  id: string;
  clipperId: string;
  status: "APPROVED" | "PAID";
  latestViewCount: number;
  baselineViewCount: number | null;
  rewardAmount: unknown;
};

function computeHybridBonusDue(
  candidate: BonusSettlementCandidate,
  viewBonusRate: number
) {
  const baseline = candidate.baselineViewCount ?? candidate.latestViewCount;
  const growthViews = Math.max(candidate.latestViewCount - baseline, 0);
  const computedBonus = Math.floor((growthViews / 1000) * viewBonusRate);
  const alreadyPaidBonus = Math.max(0, Number(candidate.rewardAmount ?? 0));
  const due = Math.max(0, computedBonus - alreadyPaidBonus);

  return {
    growthViews,
    computedBonus,
    alreadyPaidBonus,
    due,
  };
}

// GET /api/v1/campaigns/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          nickname: true,
          name: true,
          image: true,
          creatorProfile: {
            select: { youtubeChannelName: true, subscriberCount: true },
          },
        },
      },
      submissions: {
        include: {
          clipper: {
            select: { id: true, nickname: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { submissions: true } },
    },
  });

  if (!campaign) return apiError("Campaign not found", 404);
  return apiResponse(campaign);
}

// PUT /api/v1/campaigns/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return apiError("Campaign not found", 404);
  if (campaign.creatorId !== user.id) return apiError("Forbidden", 403);

  const body = await request.json();
  const parsed = parseBody(updateCampaignSchema, body);
  if ("error" in parsed) return apiError(parsed.error);

  const data = parsed.data;
  const isActivating = data.status === "ACTIVE" && campaign.status !== "ACTIVE";
  const isCompleting = data.status === "COMPLETED" && campaign.status !== "COMPLETED";

  const effectiveType = data.type ?? campaign.type;
  const effectiveTitle = (data.title ?? campaign.title).trim();
  const effectiveDescription = (data.description ?? campaign.description).trim();
  const effectiveGuidelines = (data.guidelines ?? campaign.guidelines).trim();
  const effectiveSourceVideoUrl = (data.sourceVideoUrl ?? campaign.sourceVideoUrl)?.trim() ?? null;
  const effectiveTargetPlatforms = data.targetPlatforms ?? campaign.targetPlatforms;
  const effectiveTotalBudget = data.totalBudget ?? toNumberOrNull(campaign.totalBudget);
  const effectiveFixedPayPerClip = data.fixedPayPerClip ?? toNumberOrNull(campaign.fixedPayPerClip);
  const effectiveViewBonusRate = data.viewBonusRate ?? toNumberOrNull(campaign.viewBonusRate);
  const effectiveMaxParticipants = data.maxParticipants ?? campaign.maxParticipants;
  const effectiveMaxClipsPerUser = data.maxClipsPerUser ?? campaign.maxClipsPerUser;
  const effectiveStartDate = data.startDate ? new Date(data.startDate) : campaign.startDate;
  const effectiveEndDate = data.endDate ? new Date(data.endDate) : campaign.endDate;
  const effectiveDeadline = data.deadline ? new Date(data.deadline) : campaign.deadline;
  const isCreatorPublishWorkflow = campaign.workflow === "CREATOR_PUBLISH";

  if (isCreatorPublishWorkflow) {
    if (data.type && data.type !== "HYBRID") {
      return apiError("크리에이터 게시형 캠페인은 하이브리드 타입만 허용됩니다.", 422);
    }
    if (data.targetPlatforms) {
      const normalized = [...new Set(data.targetPlatforms)];
      if (normalized.length !== 1 || normalized[0] !== "YOUTUBE_SHORTS") {
        return apiError("크리에이터 게시형 캠페인은 YouTube Shorts 단일 플랫폼만 지원합니다.", 422);
      }
    }
  }

  // Campaign activation guardrails to block invalid drafts from going live.
  if (isActivating) {
    if (!["DRAFT", "PAUSED"].includes(campaign.status)) {
      return apiError("현재 상태에서는 캠페인을 활성화할 수 없습니다.", 409);
    }

    const now = new Date();
    const errors: string[] = [];

    if (!effectiveTitle) errors.push("캠페인 제목이 필요합니다.");
    if (!effectiveDescription) errors.push("캠페인 설명이 필요합니다.");
    if (!effectiveGuidelines) errors.push("가이드라인이 필요합니다.");

    if (!Array.isArray(effectiveTargetPlatforms) || effectiveTargetPlatforms.length === 0) {
      errors.push("타겟 플랫폼을 1개 이상 선택해주세요.");
    } else if (
      isCreatorPublishWorkflow &&
      (effectiveTargetPlatforms.length !== 1 || effectiveTargetPlatforms[0] !== "YOUTUBE_SHORTS")
    ) {
      errors.push("크리에이터 게시형 캠페인은 YouTube Shorts 단일 플랫폼만 허용됩니다.");
    }

    if (!effectiveTotalBudget || effectiveTotalBudget <= 0) {
      errors.push("총 예산(totalBudget)은 0보다 커야 합니다.");
    }

    if (Number.isNaN(effectiveDeadline.getTime())) {
      errors.push("마감일(deadline) 형식이 올바르지 않습니다.");
    } else if (effectiveDeadline.getTime() <= now.getTime()) {
      errors.push("마감일은 현재 시각 이후여야 합니다.");
    }

    if (effectiveStartDate && effectiveStartDate.getTime() >= effectiveDeadline.getTime()) {
      errors.push("시작일(startDate)은 마감일보다 이전이어야 합니다.");
    }
    if (effectiveEndDate && effectiveEndDate.getTime() < effectiveDeadline.getTime()) {
      errors.push("종료일(endDate)은 마감일과 같거나 이후여야 합니다.");
    }
    if (effectiveStartDate && effectiveEndDate && effectiveStartDate.getTime() > effectiveEndDate.getTime()) {
      errors.push("시작일(startDate)은 종료일(endDate)보다 이전이어야 합니다.");
    }

    if (effectiveType !== "HYBRID") {
      errors.push("이 워크플로우에서는 하이브리드 캠페인만 활성화할 수 있습니다.");
    }

    if (!effectiveSourceVideoUrl) {
      errors.push("하이브리드 캠페인은 원본 영상 링크(sourceVideoUrl)가 필요합니다.");
    }

    if (!effectiveFixedPayPerClip || effectiveFixedPayPerClip <= 0) {
      errors.push("하이브리드 캠페인은 클립당 고정 금액(fixedPayPerClip)이 필요합니다.");
    }
    if (!effectiveViewBonusRate || effectiveViewBonusRate <= 0) {
      errors.push("하이브리드 캠페인은 뷰 보너스 단가(viewBonusRate)가 필요합니다.");
    }

    if (isCreatorPublishWorkflow) {
      try {
        await assertCreatorYouTubeReady(user.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "크리에이터 YouTube 권한 확인에 실패했습니다.";
        errors.push(message);
      }
    }

    if (effectiveTotalBudget && effectiveFixedPayPerClip) {
      if (effectiveTotalBudget < effectiveFixedPayPerClip) {
        errors.push("총 예산이 클립당 고정 금액보다 작습니다.");
      }
      if (effectiveMaxParticipants && effectiveMaxParticipants > 0) {
        const minimumFixedReserve = effectiveFixedPayPerClip * effectiveMaxParticipants * effectiveMaxClipsPerUser;
        if (effectiveTotalBudget < minimumFixedReserve) {
          errors.push("총 예산이 참여 인원 기준 최소 고정 지급액보다 작습니다.");
        }
      }
    }

    if (errors.length > 0) {
      const errorMessage = errors.map((msg, idx) => `${idx + 1}) ${msg}`).join(" ");
      return apiError(`캠페인 활성화 조건 미충족: ${errorMessage}`, 422);
    }
  }

  // Handle status transitions
  if (isActivating && campaign.status === "DRAFT") {
    // When activating, hold budget in escrow
    if (effectiveTotalBudget && effectiveTotalBudget > 0) {
      const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
      if (!wallet || Number(wallet.balance) < effectiveTotalBudget) {
        return apiError("지갑 잔액이 부족합니다. 캠페인 예산만큼 충전해주세요.");
      }

      const balanceBefore = Number(wallet.balance);
      const newBalance = balanceBefore - effectiveTotalBudget;
      const newEscrow = Number(wallet.escrowHeld) + effectiveTotalBudget;

      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: newBalance, escrowHeld: newEscrow },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "ESCROW_HOLD",
            status: "COMPLETED",
            amount: effectiveTotalBudget,
            balanceBefore,
            balanceAfter: newBalance,
            description: `캠페인 예산 에스크로: ${effectiveTitle}`,
            referenceId: campaign.id,
            referenceType: "campaign",
          },
        }),
      ]);
    }
  }

  if (isCompleting && isCreatorPublishWorkflow) {
    if (!["ACTIVE", "PAUSED"].includes(campaign.status)) {
      return apiError("완료 처리는 진행 중 또는 일시정지 상태에서만 가능합니다.", 409);
    }

    const viewBonusRate = effectiveViewBonusRate ?? 0;
    if (viewBonusRate > 0) {
      const candidates = await prisma.campaignSubmission.findMany({
        where: {
          campaignId: id,
          status: { in: ["APPROVED", "PAID"] },
        },
        select: {
          id: true,
          clipperId: true,
          status: true,
          latestViewCount: true,
          baselineViewCount: true,
          rewardAmount: true,
        },
      });

      const settlements = candidates.map((candidate) => {
        const calc = computeHybridBonusDue(
          {
            id: candidate.id,
            clipperId: candidate.clipperId,
            status: candidate.status as "APPROVED" | "PAID",
            latestViewCount: candidate.latestViewCount,
            baselineViewCount: candidate.baselineViewCount,
            rewardAmount: candidate.rewardAmount,
          },
          viewBonusRate
        );

        return {
          ...candidate,
          ...calc,
        };
      });

      const totalBonusDue = settlements.reduce((sum, item) => sum + item.due, 0);
      const creatorWallet = await prisma.wallet.findUnique({ where: { userId: user.id } });

      if (totalBonusDue > 0) {
        const escrowHeld = Number(creatorWallet?.escrowHeld ?? 0);
        if (!creatorWallet || escrowHeld < totalBonusDue) {
          return apiError(
            `캠페인 완료를 위해 추가 뷰 보너스 정산금 ${totalBonusDue.toLocaleString("ko-KR")}원이 필요합니다. 예산을 보충한 뒤 다시 완료해주세요.`,
            422
          );
        }
      }

      if (settlements.length > 0) {
        const now = new Date();
        await prisma.$transaction(async (tx) => {
          for (const settlement of settlements) {
            const shouldUpdatePaymentFields = settlement.due > 0 || settlement.status !== "PAID";

            if (shouldUpdatePaymentFields) {
              await tx.campaignSubmission.update({
                where: { id: settlement.id },
                data: {
                  rewardAmount: settlement.computedBonus,
                  totalPaid: settlement.due > 0 ? { increment: settlement.due } : undefined,
                  status: "PAID",
                  paidAt: now,
                },
              });
            }

            if (settlement.due <= 0) continue;

            let clipperWallet = await tx.wallet.findUnique({
              where: { userId: settlement.clipperId },
            });
            if (!clipperWallet) {
              clipperWallet = await tx.wallet.create({
                data: { userId: settlement.clipperId },
              });
            }

            const clipperBalanceBefore = Number(clipperWallet.balance);
            await tx.wallet.update({
              where: { userId: settlement.clipperId },
              data: {
                balance: { increment: settlement.due },
                totalEarned: { increment: settlement.due },
              },
            });
            await tx.walletTransaction.create({
              data: {
                walletId: clipperWallet.id,
                type: "ESCROW_RELEASE",
                status: "COMPLETED",
                amount: settlement.due,
                balanceBefore: clipperBalanceBefore,
                balanceAfter: clipperBalanceBefore + settlement.due,
                description: `캠페인 완료 뷰 보너스 정산: ${campaign.title}`,
                referenceId: settlement.id,
                referenceType: "submission",
              },
            });
          }

          if (totalBonusDue > 0 && creatorWallet) {
            const creatorBalanceBefore = Number(creatorWallet.balance);
            await tx.wallet.update({
              where: { userId: user.id },
              data: { escrowHeld: { decrement: totalBonusDue } },
            });
            await tx.walletTransaction.create({
              data: {
                walletId: creatorWallet.id,
                type: "ESCROW_RELEASE",
                status: "COMPLETED",
                amount: totalBonusDue,
                balanceBefore: creatorBalanceBefore,
                balanceAfter: creatorBalanceBefore,
                description: `캠페인 뷰 보너스 정산 릴리스: ${campaign.title}`,
                referenceId: campaign.id,
                referenceType: "campaign",
              },
            });
          }

          if (totalBonusDue > 0) {
            await tx.campaign.update({
              where: { id: campaign.id },
              data: {
                totalSpent: { increment: totalBonusDue },
              },
            });
          }
        });
      }
    } else {
      await prisma.campaignSubmission.updateMany({
        where: {
          campaignId: id,
          status: "APPROVED",
        },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });
    }
  }

  if (data.status === "CANCELLED" && ["DRAFT", "ACTIVE", "PAUSED"].includes(campaign.status)) {
    // Refund escrow when cancelling
    if (Number(campaign.totalBudget) > 0) {
      const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
      if (wallet) {
        const remaining = Number(campaign.totalBudget) - Number(campaign.totalSpent);
        if (remaining > 0) {
          const balanceBefore = Number(wallet.balance);
          await prisma.$transaction([
            prisma.wallet.update({
              where: { userId: user.id },
              data: {
                balance: { increment: remaining },
                escrowHeld: { decrement: remaining },
              },
            }),
            prisma.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: "REFUND",
                status: "COMPLETED",
                amount: remaining,
                balanceBefore,
                balanceAfter: balanceBefore + remaining,
                description: `캠페인 취소 환불: ${campaign.title}`,
                referenceId: campaign.id,
                referenceType: "campaign",
              },
            }),
          ]);
        }
      }
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.guidelines !== undefined) updateData.guidelines = data.guidelines;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.contentCategory !== undefined) updateData.contentCategory = data.contentCategory;
  if (data.sourceVideoUrl !== undefined) updateData.sourceVideoUrl = data.sourceVideoUrl;
  if (data.sourceVideoTitle !== undefined) updateData.sourceVideoTitle = data.sourceVideoTitle;
  if (data.targetPlatforms !== undefined) updateData.targetPlatforms = data.targetPlatforms;
  if (data.totalBudget !== undefined) updateData.totalBudget = data.totalBudget;
  if (data.fixedPayPerClip !== undefined) updateData.fixedPayPerClip = data.fixedPayPerClip;
  if (data.cprRate !== undefined) updateData.cprRate = data.cprRate;
  if (data.viewBonusRate !== undefined) updateData.viewBonusRate = data.viewBonusRate;
  if (data.maxParticipants !== undefined) updateData.maxParticipants = data.maxParticipants;
  if (data.maxClipsPerUser !== undefined) updateData.maxClipsPerUser = data.maxClipsPerUser;
  if (data.minViewThreshold !== undefined) updateData.minViewThreshold = data.minViewThreshold;
  if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
  if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
  if (data.deadline !== undefined) updateData.deadline = new Date(data.deadline);
  if (data.status !== undefined) updateData.status = data.status;

  const updated = await prisma.campaign.update({ where: { id }, data: updateData });
  return apiResponse(updated);
}

// DELETE /api/v1/campaigns/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return apiError("Campaign not found", 404);
  if (campaign.creatorId !== user.id) return apiError("Forbidden", 403);
  if (campaign.status !== "DRAFT") return apiError("Only draft campaigns can be deleted");

  await prisma.campaign.delete({ where: { id } });
  return apiResponse({ deleted: true });
}
