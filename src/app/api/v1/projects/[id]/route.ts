import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { updateProjectSchema } from "@/lib/validations";
import { canTransition } from "@/lib/projects/state-machine";
import { ProjectStatus } from "@prisma/client";

// GET /api/v1/projects/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      creator: {
        select: { id: true, name: true, nickname: true, image: true, role: true },
      },
      assignedClipper: {
        select: { id: true, name: true, nickname: true, image: true, role: true },
      },
      applications: {
        include: {
          clipper: { select: { id: true, name: true, nickname: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      clips: {
        include: {
          clipper: { select: { id: true, name: true, nickname: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { applications: true, clips: true, messages: true } },
    },
  });

  if (!project) return apiError("Project not found", 404);

  return apiResponse(project);
}

// PUT /api/v1/projects/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;
  const body = await req.json();
  const result = parseBody(updateProjectSchema, body);
  if ("error" in result) return apiError(result.error);

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return apiError("Project not found", 404);
  if (project.creatorId !== user.id) return apiError("Forbidden", 403);

  const data = result.data;

  // Validate status transition if status is being changed
  if (data.status && data.status !== project.status) {
    if (!canTransition(project.status, data.status as ProjectStatus)) {
      return apiError(
        `Cannot transition from ${project.status} to ${data.status}`
      );
    }
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...data,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
    },
  });

  return apiResponse(updated);
}

// DELETE /api/v1/projects/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return apiError("Project not found", 404);
  if (project.creatorId !== user.id) return apiError("Forbidden", 403);

  if (!["DRAFT", "CANCELLED"].includes(project.status)) {
    return apiError("Can only delete draft or cancelled projects");
  }

  await prisma.project.delete({ where: { id } });

  return apiResponse({ deleted: true });
}
