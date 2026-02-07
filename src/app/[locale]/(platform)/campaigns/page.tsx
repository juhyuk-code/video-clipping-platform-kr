import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CampaignsClient } from "./campaigns-client";

async function getCampaignsData(userId: string | undefined, type?: string, category?: string) {
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (type) where.type = type;
  if (category) where.contentCategory = category;

  const [activeCampaigns, myCampaigns] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        creator: {
          select: {
            id: true, nickname: true, name: true, image: true,
            creatorProfile: { select: { youtubeChannelName: true, subscriberCount: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
    }),
    userId
      ? prisma.campaign.findMany({
          where: { creatorId: userId },
          orderBy: { updatedAt: "desc" },
          take: 20,
          include: { _count: { select: { submissions: true } } },
        })
      : [],
  ]);

  return {
    activeCampaigns: activeCampaigns.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      type: c.type,
      status: c.status,
      contentCategory: c.contentCategory,
      targetPlatforms: c.targetPlatforms,
      totalBudget: c.totalBudget ? Number(c.totalBudget) : null,
      fixedPayPerClip: c.fixedPayPerClip ? Number(c.fixedPayPerClip) : null,
      cprRate: c.cprRate ? Number(c.cprRate) : null,
      deadline: c.deadline.toISOString(),
      participantCount: c.participantCount,
      submissionCount: c._count.submissions,
      creator: c.creator,
    })),
    myCampaigns: myCampaigns.map((c) => ({
      id: c.id,
      title: c.title,
      type: c.type,
      status: c.status,
      totalBudget: c.totalBudget ? Number(c.totalBudget) : null,
      deadline: c.deadline.toISOString(),
      participantCount: c.participantCount,
      submissionCount: c._count.submissions,
      totalSpent: Number(c.totalSpent),
    })),
  };
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string }>;
}) {
  const { type, category } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;

  let data = { activeCampaigns: [] as any[], myCampaigns: [] as any[] };
  try {
    data = await getCampaignsData(userId, type, category);
  } catch (e) {
    console.error("Campaign fetch error:", e);
  }

  return (
    <CampaignsClient
      activeCampaigns={data.activeCampaigns}
      myCampaigns={data.myCampaigns}
      currentType={type}
      currentCategory={category}
    />
  );
}
