import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { createApplicationSchema } from "@/lib/validations";

// GET /api/v1/projects/:id/applications
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const applications = await prisma.application.findMany({
    where: { projectId: id },
    include: {
      clipper: {
        select: {
          id: true,
          name: true,
          nickname: true,
          image: true,
          clipperProfile: {
            select: { tier: true, isVerified: true, averageRating: true, specializations: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiResponse(applications);
}

// POST /api/v1/projects/:id/applications — clipper applies to a project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;
  const body = await req.json();
  const result = parseBody(createApplicationSchema, body);
  if ("error" in result) return apiError(result.error);

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return apiError("Project not found", 404);
  if (project.status !== "OPEN") return apiError("Project is not accepting applications");
  if (project.creatorId === user.id) return apiError("Cannot apply to your own project");

  // Check for existing application
  const existing = await prisma.application.findUnique({
    where: { projectId_clipperId: { projectId: id, clipperId: user.id } },
  });
  if (existing) return apiError("Already applied to this project");

  const data = result.data;

  const application = await prisma.application.create({
    data: {
      projectId: id,
      clipperId: user.id,
      pitch: data.pitch,
      proposedPrice: data.proposedPrice,
      estimatedDeliveryDays: data.estimatedDeliveryDays,
      portfolioSamples: data.portfolioSamples ?? [],
    },
  });

  // Create notification for creator
  await prisma.notification.create({
    data: {
      userId: project.creatorId,
      type: "PROJECT_APPLICATION",
      title: "새로운 지원서",
      body: `${user.name ?? "클리퍼"}님이 "${project.title}" 프로젝트에 지원했습니다.`,
      linkUrl: `/projects/${id}`,
    },
  });

  return apiResponse(application, 201);
}
