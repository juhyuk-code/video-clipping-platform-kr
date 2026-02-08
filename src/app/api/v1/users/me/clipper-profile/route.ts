import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { updateClipperProfileSchema } from "@/lib/validations";

// PUT /api/v1/users/me/clipper-profile — update clipper-specific fields
export async function PUT(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const result = parseBody(updateClipperProfileSchema, body);
  if ("error" in result) return apiError(result.error);

  const data = result.data;

  const updated = await prisma.clipperProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  return apiResponse(updated);
}
