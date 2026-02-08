import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth } from "@/lib/api/helpers";
import { fetchSocialProfile, fetchSocialVideos, type SocialProviderType } from "@/lib/social/providers";

const PROVIDER_MAP: Record<string, { enum: "YOUTUBE" | "INSTAGRAM" | "TIKTOK"; type: SocialProviderType }> = {
  youtube: { enum: "YOUTUBE", type: "youtube" },
  instagram: { enum: "INSTAGRAM", type: "instagram" },
  tiktok: { enum: "TIKTOK", type: "tiktok" },
};

// POST /api/v1/social/sync/:provider — Refresh profile + video data
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const mapping = PROVIDER_MAP[provider.toLowerCase()];
  if (!mapping) return apiError("Invalid provider", 400);

  const connection = await prisma.socialConnection.findUnique({
    where: { userId_provider: { userId: user.id, provider: mapping.enum } },
  });
  if (!connection) return apiError("Not connected to this provider", 404);

  // Refresh profile data
  const profile = await fetchSocialProfile(mapping.type, connection.accessToken);
  if (!profile) {
    return apiError("Failed to fetch profile. Token may be expired — try reconnecting.", 400);
  }

  await prisma.socialConnection.update({
    where: { id: connection.id },
    data: {
      username: profile.username,
      displayName: profile.displayName,
      profileUrl: profile.profileUrl,
      followerCount: profile.followerCount,
      channelName: profile.channelName,
      lastSyncedAt: new Date(),
    },
  });

  // Sync to CreatorProfile if YouTube
  if (mapping.type === "youtube" && profile.channelName) {
    await prisma.creatorProfile.updateMany({
      where: { userId: user.id },
      data: {
        youtubeChannelId: profile.providerAccountId,
        youtubeChannelName: profile.channelName,
        subscriberCount: profile.followerCount,
      },
    });
  }

  // Refresh video data
  const videos = await fetchSocialVideos(mapping.type, connection.accessToken, connection.providerAccountId);
  let syncedCount = 0;

  for (const video of videos) {
    await prisma.socialVideo.upsert({
      where: {
        socialConnectionId_platformVideoId: {
          socialConnectionId: connection.id,
          platformVideoId: video.platformVideoId,
        },
      },
      create: {
        socialConnectionId: connection.id,
        platformVideoId: video.platformVideoId,
        url: video.url,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        shareCount: video.shareCount,
        publishedAt: video.publishedAt,
        lastSyncedAt: new Date(),
      },
      update: {
        url: video.url,
        title: video.title,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        shareCount: video.shareCount,
        lastSyncedAt: new Date(),
      },
    });
    syncedCount++;
  }

  return apiResponse({
    profile: {
      username: profile.username,
      displayName: profile.displayName,
      followerCount: profile.followerCount,
    },
    videosSynced: syncedCount,
  });
}
