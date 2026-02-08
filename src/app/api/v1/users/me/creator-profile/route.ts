import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { updateCreatorProfileSchema } from "@/lib/validations";

// PUT /api/v1/users/me/creator-profile — update creator-specific fields
export async function PUT(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const result = parseBody(updateCreatorProfileSchema, body);
  if ("error" in result) return apiError(result.error);

  const data = result.data;

  // Normalize empty strings to null for URL fields
  const updateData: Record<string, unknown> = {};
  if (data.contentCategories !== undefined) updateData.contentCategories = data.contentCategories;
  if (data.preferredClipStyle !== undefined) updateData.preferredClipStyle = data.preferredClipStyle || null;
  if (data.defaultClipGuidelines !== undefined) updateData.defaultClipGuidelines = data.defaultClipGuidelines || null;
  if (data.twitchUrl !== undefined) updateData.twitchUrl = data.twitchUrl || null;
  if (data.afreecaTvUrl !== undefined) updateData.afreecaTvUrl = data.afreecaTvUrl || null;
  if (data.chzzkUrl !== undefined) updateData.chzzkUrl = data.chzzkUrl || null;

  const updated = await prisma.creatorProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...updateData },
    update: updateData,
  });

  return apiResponse(updated);
}
