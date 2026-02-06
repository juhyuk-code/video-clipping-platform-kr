import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { reviewClipSchema } from "@/lib/validations";

// PUT /api/v1/projects/:id/clips/:clipId — creator reviews a clip
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; clipId: string }> }
) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const { id, clipId } = await params;
  const body = await req.json();
  const result = parseBody(reviewClipSchema, body);
  if ("error" in result) return apiError(result.error);

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return apiError("Project not found", 404);
  if (project.creatorId !== user.id) return apiError("Forbidden", 403);

  const clip = await prisma.clip.findUnique({ where: { id: clipId } });
  if (!clip) return apiError("Clip not found", 404);
  if (clip.projectId !== id) return apiError("Clip does not belong to this project", 400);
  if (clip.status !== "SUBMITTED") return apiError("Clip is not pending review");

  const { status, revisionNotes } = result.data;

  const updated = await prisma.clip.update({
    where: { id: clipId },
    data: { status, revisionNotes },
  });

  // Update project status based on clip review
  if (status === "APPROVED") {
    // Check if all clips are approved
    const pendingClips = await prisma.clip.count({
      where: { projectId: id, status: "SUBMITTED" },
    });
    if (pendingClips === 0) {
      await prisma.project.update({
        where: { id },
        data: { status: "COMPLETED" },
      });
    }

    await prisma.notification.create({
      data: {
        userId: clip.clipperId,
        type: "CLIP_APPROVED",
        title: "클립 승인됨",
        body: `"${clip.title}" 클립이 승인되었습니다.`,
        linkUrl: `/projects/${id}`,
      },
    });
  } else if (status === "REVISION_REQUESTED") {
    await prisma.project.update({
      where: { id },
      data: {
        status: "REVISION_REQUESTED",
        currentRevisionRound: { increment: 1 },
      },
    });

    await prisma.notification.create({
      data: {
        userId: clip.clipperId,
        type: "REVISION_REQUESTED",
        title: "수정 요청",
        body: `"${clip.title}" 클립에 수정이 요청되었습니다.`,
        linkUrl: `/projects/${id}`,
      },
    });
  }

  return apiResponse(updated);
}
