import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth } from "@/lib/api/helpers";

// GET /api/v1/social/connections — List user's social connections
export async function GET() {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const connections = await prisma.socialConnection.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      provider: true,
      username: true,
      displayName: true,
      profileUrl: true,
      followerCount: true,
      channelName: true,
      connectedAt: true,
      lastSyncedAt: true,
      _count: { select: { videos: true } },
    },
    orderBy: { connectedAt: "asc" },
  });

  // Also get login provider connections from Auth.js Account table
  const loginAccounts = await prisma.account.findMany({
    where: { userId: user.id },
    select: { provider: true },
  });

  return apiResponse({
    socialConnections: connections,
    loginProviders: loginAccounts.map((a) => a.provider),
  });
}
