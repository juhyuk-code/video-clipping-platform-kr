import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth } from "@/lib/api/helpers";

const PROVIDER_MAP: Record<string, "YOUTUBE" | "INSTAGRAM" | "TIKTOK"> = {
  youtube: "YOUTUBE",
  instagram: "INSTAGRAM",
  tiktok: "TIKTOK",
};

// DELETE /api/v1/social/connections/:provider — Disconnect a social account
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const providerEnum = PROVIDER_MAP[provider.toLowerCase()];
  if (!providerEnum) {
    return apiError("Invalid provider. Must be youtube, instagram, or tiktok", 400);
  }

  const connection = await prisma.socialConnection.findUnique({
    where: { userId_provider: { userId: user.id, provider: providerEnum } },
  });

  if (!connection) {
    return apiError("Connection not found", 404);
  }

  // Delete connection (cascades to SocialVideo)
  await prisma.socialConnection.delete({
    where: { id: connection.id },
  });

  // If YouTube, clear denormalized fields on CreatorProfile
  if (providerEnum === "YOUTUBE") {
    await prisma.creatorProfile.updateMany({
      where: { userId: user.id },
      data: {
        youtubeChannelId: null,
        youtubeChannelName: null,
        subscriberCount: null,
      },
    });
  }

  return apiResponse({ success: true });
}
