import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { applyToCampaignSchema, submitToCampaignSchema } from "@/lib/validations";

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

  // Creator sees all submissions; clipper sees only their own
  const isCreator = campaign.creatorId === user.id;
  const where: Record<string, unknown> = { campaignId: id };
  if (!isCreator) where.clipperId = user.id;

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

  return apiResponse(submissions);
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

  // Check max participants
  if (campaign.maxParticipants && campaign.participantCount >= campaign.maxParticipants) {
    return apiError("캠페인 최대 참여 인원에 도달했습니다");
  }

  // Check duplicate
  const existing = await prisma.campaignSubmission.findUnique({
    where: { campaignId_clipperId: { campaignId: id, clipperId: user.id } },
  });
  if (existing) return apiError("이미 이 캠페인에 참여했습니다");

  const body = await request.json();

  if (campaign.type === "REWARD") {
    // REWARD type: auto-join, no application needed
    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.campaignSubmission.create({
        data: {
          campaignId: id,
          clipperId: user.id,
          status: "JOINED",
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

  // PROJECT or HYBRID: require application with pitch
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
    await tx.campaign.update({
      where: { id },
      data: { participantCount: { increment: 1 } },
    });
    return sub;
  });

  // Notify creator
  await prisma.notification.create({
    data: {
      userId: campaign.creatorId,
      type: "CAMPAIGN_SUBMISSION",
      title: "새 캠페인 지원",
      body: `${user.name ?? "클리퍼"}님이 "${campaign.title}" 캠페인에 지원했습니다.`,
      linkUrl: `/campaigns/${id}`,
    },
  });

  return apiResponse(submission, 201);
}
