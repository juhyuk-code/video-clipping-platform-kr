import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { DashboardClient } from "./dashboard-client";

async function getDashboardData(userId: string) {
  const [
    activeCampaigns,
    completedCampaigns,
    mySubmissions,
    approvedSubmissions,
    wallet,
    recentCreatorCampaigns,
    recentClipperSubmissions,
  ] = await Promise.all([
    prisma.campaign.count({
      where: { creatorId: userId, status: { in: ["ACTIVE", "PAUSED"] } },
    }),
    prisma.campaign.count({
      where: { creatorId: userId, status: "COMPLETED" },
    }),
    prisma.campaignSubmission.count({ where: { clipperId: userId } }),
    prisma.campaignSubmission.count({
      where: { clipperId: userId, status: { in: ["APPROVED", "PAID"] } },
    }),
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.campaign.findMany({
      where: { creatorId: userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { _count: { select: { submissions: true } } },
    }),
    prisma.campaignSubmission.findMany({
      where: { clipperId: userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        campaign: {
          select: { id: true, title: true, type: true, status: true, deadline: true },
        },
      },
    }),
  ]);

  return {
    activeCampaigns,
    completedCampaigns,
    mySubmissions,
    approvedSubmissions,
    walletBalance: Number(wallet?.balance ?? 0),
    totalEarned: Number(wallet?.totalEarned ?? 0),
    escrowHeld: Number(wallet?.escrowHeld ?? 0),
    recentCreatorCampaigns: recentCreatorCampaigns.map((c) => ({
      id: c.id,
      title: c.title,
      type: c.type,
      status: c.status,
      deadline: c.deadline.toISOString(),
      totalBudget: c.totalBudget ? Number(c.totalBudget) : null,
      submissionCount: c._count.submissions,
    })),
    recentClipperSubmissions: recentClipperSubmissions.map((s) => ({
      id: s.id,
      status: s.status,
      clipTitle: s.clipTitle,
      totalPaid: Number(s.totalPaid),
      latestViewCount: s.latestViewCount,
      campaign: {
        id: s.campaign.id,
        title: s.campaign.title,
        type: s.campaign.type,
        deadline: s.campaign.deadline.toISOString(),
      },
    })),
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const userName = session?.user?.name ?? "User";

  let data: Awaited<ReturnType<typeof getDashboardData>> = {
    activeCampaigns: 0,
    completedCampaigns: 0,
    mySubmissions: 0,
    approvedSubmissions: 0,
    walletBalance: 0,
    totalEarned: 0,
    escrowHeld: 0,
    recentCreatorCampaigns: [],
    recentClipperSubmissions: [],
  };

  if (userId) {
    try {
      data = await getDashboardData(userId);
    } catch (e) {
      console.error("Dashboard data fetch error:", e);
    }
  }

  return <DashboardClient userName={userName} data={data} />;
}
