import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { updateUserProfileSchema } from "@/lib/validations";

// GET /api/v1/users/me — get current user profile
export async function GET() {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      creatorProfile: true,
      clipperProfile: { include: { portfolioItems: true } },
      _count: {
        select: {
          projectsAsCreator: true,
          projectsAsClipper: true,
          reviewsReceived: true,
        },
      },
    },
  });

  if (!fullUser) return apiError("User not found", 404);

  return apiResponse(fullUser);
}

// PUT /api/v1/users/me — update current user profile
export async function PUT(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const result = parseBody(updateUserProfileSchema, body);
  if ("error" in result) return apiError(result.error);

  const data = result.data;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
  });

  // Create both profiles so user can freely switch modes
  if (data.role) {
    await prisma.creatorProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
    await prisma.clipperProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
  }

  return apiResponse(updated);
}
