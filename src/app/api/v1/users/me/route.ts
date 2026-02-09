import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { updateUserProfileSchema } from "@/lib/validations";

// GET /api/v1/users/me — get current user profile (full, private)
export async function GET() {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  // Try the full query first; if new tables (SocialConnection etc.) haven't been
  // migrated yet, fall back to a basic query so the page still works.
  let fullUser;
  try {
    fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        creatorProfile: true,
        clipperProfile: { include: { portfolioItems: true } },
        accounts: { select: { provider: true } },
        socialConnections: {
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
        },
        _count: {
          select: {
            projectsAsCreator: true,
            projectsAsClipper: true,
            reviewsReceived: true,
            campaignsCreated: true,
            submissions: true,
          },
        },
      },
    });
  } catch {
    // Fallback: query without relations whose tables/columns may not exist yet.
    // Only include accounts (from Auth.js, always exists).
    try {
      fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          accounts: { select: { provider: true } },
        },
      });
    } catch {
      // Last resort: bare user query
      fullUser = await prisma.user.findUnique({ where: { id: user.id } });
    }
    if (fullUser) {
      // Attach empty defaults so the client shape stays consistent
      if (!(fullUser as any).socialConnections) (fullUser as any).socialConnections = [];
      if (!(fullUser as any).creatorProfile) (fullUser as any).creatorProfile = null;
      if (!(fullUser as any).clipperProfile) (fullUser as any).clipperProfile = null;
      if (!(fullUser as any).accounts) (fullUser as any).accounts = [];
      if (!(fullUser as any)._count) {
        (fullUser as any)._count = {
          projectsAsCreator: 0,
          projectsAsClipper: 0,
          reviewsReceived: 0,
          campaignsCreated: 0,
          submissions: 0,
        };
      }
    }
  }

  if (!fullUser) return apiError("User not found", 404);

  return apiResponse(fullUser);
}

// PUT /api/v1/users/me — update current user base profile
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
