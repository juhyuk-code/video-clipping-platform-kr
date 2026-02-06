import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { createProjectSchema } from "@/lib/validations";

// GET /api/v1/projects — list current user's projects
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const role = searchParams.get("role"); // "creator" or "clipper"

  const where: Record<string, unknown> = {};

  if (role === "clipper") {
    where.assignedClipperId = user.id;
  } else {
    where.creatorId = user.id;
  }

  if (status) {
    where.status = status;
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { id: true, name: true, nickname: true, image: true } },
      assignedClipper: { select: { id: true, name: true, nickname: true, image: true } },
      _count: { select: { applications: true, clips: true, messages: true } },
    },
  });

  return apiResponse(projects);
}

// POST /api/v1/projects — create a new project
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const result = parseBody(createProjectSchema, body);
  if ("error" in result) return apiError(result.error);

  const data = result.data;

  const project = await prisma.project.create({
    data: {
      creatorId: user.id,
      title: data.title,
      description: data.description,
      brief: data.brief,
      sourceVideoUrl: data.sourceVideoUrl,
      targetPlatforms: data.targetPlatforms,
      pricingModel: data.pricingModel,
      budgetAmount: data.budgetAmount,
      revenueSharePercentage: data.revenueSharePercentage,
      maxClipsRequested: data.maxClipsRequested,
      maxRevisionRounds: data.maxRevisionRounds,
      deadline: new Date(data.deadline),
      contentCategory: data.contentCategory,
      type: data.type,
      requiredTier: data.requiredTier,
      status: "DRAFT",
    },
  });

  return apiResponse(project, 201);
}
