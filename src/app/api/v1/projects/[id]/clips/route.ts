import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { createClipSchema, reviewClipSchema } from "@/lib/validations";

// GET /api/v1/projects/:id/clips
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const clips = await prisma.clip.findMany({
    where: { projectId: id },
    include: {
      clipper: { select: { id: true, name: true, nickname: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiResponse(clips);
}

// POST /api/v1/projects/:id/clips — clipper submits a clip
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;
  const body = await req.json();
  const result = parseBody(createClipSchema, body);
  if ("error" in result) return apiError(result.error);

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return apiError("Project not found", 404);
  if (project.assignedClipperId !== user.id) {
    return apiError("Only the assigned clipper can submit clips", 403);
  }
  if (!["IN_PROGRESS", "REVISION_REQUESTED"].includes(project.status)) {
    return apiError("Project is not in a state that accepts clip submissions");
  }

  const data = result.data;

  const clip = await prisma.clip.create({
    data: {
      projectId: id,
      clipperId: user.id,
      title: data.title,
      description: data.description,
      videoFileUrl: data.videoFileUrl,
      thumbnailUrl: data.thumbnailUrl,
      durationSeconds: data.durationSeconds,
      targetPlatform: data.targetPlatform,
      status: "SUBMITTED",
    },
  });

  // Move project to IN_REVIEW
  await prisma.project.update({
    where: { id },
    data: { status: "IN_REVIEW" },
  });

  // Notify creator
  await prisma.notification.create({
    data: {
      userId: project.creatorId,
      type: "CLIP_SUBMITTED",
      title: "새 클립 제출",
      body: `"${project.title}" 프로젝트에 새 클립이 제출되었습니다.`,
      linkUrl: `/projects/${id}`,
    },
  });

  return apiResponse(clip, 201);
}
