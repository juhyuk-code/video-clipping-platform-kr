import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { updateCampaignSchema } from "@/lib/validations";

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

  // Handle status transitions
  if (data.status === "ACTIVE" && campaign.status === "DRAFT") {
    // When activating, hold budget in escrow
    if (campaign.totalBudget && Number(campaign.totalBudget) > 0) {
      const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
      if (!wallet || Number(wallet.balance) < Number(campaign.totalBudget)) {
        return apiError("지갑 잔액이 부족합니다. 캠페인 예산만큼 충전해주세요.");
      }

      const balanceBefore = Number(wallet.balance);
      const newBalance = balanceBefore - Number(campaign.totalBudget);
      const newEscrow = Number(wallet.escrowHeld) + Number(campaign.totalBudget);

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
            amount: Number(campaign.totalBudget),
            balanceBefore,
            balanceAfter: newBalance,
            description: `캠페인 예산 에스크로: ${campaign.title}`,
            referenceId: campaign.id,
            referenceType: "campaign",
          },
        }),
      ]);
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
  if (data.contentCategory !== undefined) updateData.contentCategory = data.contentCategory;
  if (data.sourceVideoUrl !== undefined) updateData.sourceVideoUrl = data.sourceVideoUrl;
  if (data.targetPlatforms !== undefined) updateData.targetPlatforms = data.targetPlatforms;
  if (data.totalBudget !== undefined) updateData.totalBudget = data.totalBudget;
  if (data.fixedPayPerClip !== undefined) updateData.fixedPayPerClip = data.fixedPayPerClip;
  if (data.cprRate !== undefined) updateData.cprRate = data.cprRate;
  if (data.viewBonusRate !== undefined) updateData.viewBonusRate = data.viewBonusRate;
  if (data.maxParticipants !== undefined) updateData.maxParticipants = data.maxParticipants;
  if (data.maxClipsPerUser !== undefined) updateData.maxClipsPerUser = data.maxClipsPerUser;
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
