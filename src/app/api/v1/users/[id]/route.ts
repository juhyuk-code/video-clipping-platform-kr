import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError } from "@/lib/api/helpers";

// GET /api/v1/users/:id — public profile
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      nickname: true,
      image: true,
      role: true,
      bio: true,
      createdAt: true,
      creatorProfile: {
        select: {
          youtubeChannelName: true,
          subscriberCount: true,
          contentCategories: true,
          averageVideoViews: true,
          preferredClipStyle: true,
          twitchUrl: true,
          afreecaTvUrl: true,
          chzzkUrl: true,
          averageRating: true,
          totalProjectsPosted: true,
        },
      },
      clipperProfile: {
        select: {
          specializations: true,
          editingTools: true,
          languages: true,
          tier: true,
          isVerified: true,
          averageRating: true,
          totalProjectsCompleted: true,
          portfolioItems: {
            select: {
              id: true,
              title: true,
              description: true,
              videoUrl: true,
              thumbnailUrl: true,
              platform: true,
              viewCount: true,
            },
            take: 12,
            orderBy: { createdAt: "desc" },
          },
        },
      },
      socialConnections: {
        select: {
          provider: true,
          username: true,
          displayName: true,
          profileUrl: true,
          followerCount: true,
          channelName: true,
          connectedAt: true,
        },
      },
      _count: {
        select: {
          reviewsReceived: true,
          campaignsCreated: true,
          submissions: true,
        },
      },
    },
  });

  if (!user) return apiError("User not found", 404);

  return apiResponse(user);
}
