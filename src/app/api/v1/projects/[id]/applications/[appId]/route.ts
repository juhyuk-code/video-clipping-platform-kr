import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { updateApplicationSchema } from "@/lib/validations";

// PUT /api/v1/projects/:id/applications/:appId — accept/reject application
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const { id, appId } = await params;
  const body = await req.json();
  const result = parseBody(updateApplicationSchema, body);
  if ("error" in result) return apiError(result.error);

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return apiError("Project not found", 404);

  const application = await prisma.application.findUnique({
    where: { id: appId },
  });
  if (!application) return apiError("Application not found", 404);
  if (application.projectId !== id) return apiError("Application does not belong to this project", 400);

  const { status } = result.data;

  // Only creator can accept/reject, clipper can withdraw
  if (status === "WITHDRAWN") {
    if (application.clipperId !== user.id) return apiError("Forbidden", 403);
  } else {
    if (project.creatorId !== user.id) return apiError("Forbidden", 403);
  }

  if (application.status !== "PENDING") {
    return apiError(`Application is already ${application.status.toLowerCase()}`);
  }

  const updated = await prisma.application.update({
    where: { id: appId },
    data: { status },
  });

  // If accepted, assign clipper to project and reject other applications
  if (status === "ACCEPTED") {
    await prisma.$transaction([
      prisma.project.update({
        where: { id },
        data: {
          assignedClipperId: application.clipperId,
          status: "ASSIGNED",
        },
      }),
      prisma.application.updateMany({
        where: { projectId: id, id: { not: appId }, status: "PENDING" },
        data: { status: "REJECTED" },
      }),
    ]);

    // Notify clipper of acceptance
    await prisma.notification.create({
      data: {
        userId: application.clipperId,
        type: "PROJECT_ASSIGNED",
        title: "지원 승인됨",
        body: `"${project.title}" 프로젝트에 배정되었습니다.`,
        linkUrl: `/projects/${id}`,
      },
    });
  }

  return apiResponse(updated);
}
