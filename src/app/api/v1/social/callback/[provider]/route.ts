import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/api/helpers";
import { auth } from "@/lib/auth";
import {
  isValidProvider,
  exchangeCodeForTokens,
  fetchSocialProfile,
  fetchSocialVideos,
  type SocialProviderType,
} from "@/lib/social/providers";

const PROVIDER_ENUM_MAP: Record<SocialProviderType, "YOUTUBE" | "INSTAGRAM" | "TIKTOK"> = {
  youtube: "YOUTUBE",
  instagram: "INSTAGRAM",
  tiktok: "TIKTOK",
};

// GET /api/v1/social/callback/:provider — OAuth callback handler
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!isValidProvider(provider)) {
    return apiError("Invalid provider", 400);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${baseUrl}/settings?social_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/settings?social_error=missing_params`);
  }

  // Verify state & extract userId
  let userId: string;
  try {
    const statePayload = JSON.parse(Buffer.from(state, "base64url").toString());
    userId = statePayload.userId;
    if (!userId) throw new Error("No userId in state");
  } catch {
    return NextResponse.redirect(`${baseUrl}/settings?social_error=invalid_state`);
  }

  // Double-check the user is still authenticated
  const session = await auth();
  if (!session?.user?.id || session.user.id !== userId) {
    return NextResponse.redirect(`${baseUrl}/settings?social_error=session_mismatch`);
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(provider, code);
  if (!tokens) {
    return NextResponse.redirect(`${baseUrl}/settings?social_error=token_exchange_failed`);
  }

  // Fetch profile info
  const profile = await fetchSocialProfile(provider, tokens.accessToken);
  if (!profile) {
    return NextResponse.redirect(`${baseUrl}/settings?social_error=profile_fetch_failed`);
  }

  // Upsert social connection
  const providerEnum = PROVIDER_ENUM_MAP[provider];
  const connection = await prisma.socialConnection.upsert({
    where: { userId_provider: { userId, provider: providerEnum } },
    create: {
      userId,
      provider: providerEnum,
      providerAccountId: profile.providerAccountId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
      scope: tokens.scope,
      username: profile.username,
      displayName: profile.displayName,
      profileUrl: profile.profileUrl,
      followerCount: profile.followerCount,
      channelName: profile.channelName,
      lastSyncedAt: new Date(),
    },
    update: {
      providerAccountId: profile.providerAccountId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? undefined,
      tokenExpiresAt: tokens.expiresAt,
      scope: tokens.scope,
      username: profile.username,
      displayName: profile.displayName,
      profileUrl: profile.profileUrl,
      followerCount: profile.followerCount,
      channelName: profile.channelName,
      lastSyncedAt: new Date(),
    },
  });

  // If YouTube: sync channel info to CreatorProfile for denormalized reads
  if (provider === "youtube" && profile.channelName) {
    await prisma.creatorProfile.updateMany({
      where: { userId },
      data: {
        youtubeChannelId: profile.providerAccountId,
        youtubeChannelName: profile.channelName,
        subscriberCount: profile.followerCount,
      },
    });
  }

  // Fetch and store videos in background (best-effort)
  try {
    const videos = await fetchSocialVideos(provider, tokens.accessToken, profile.providerAccountId);
    if (videos.length > 0) {
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
      }
    }
  } catch {
    // Video sync is best-effort, don't fail the connection
  }

  return NextResponse.redirect(`${baseUrl}/settings?social_connected=${provider}`);
}
