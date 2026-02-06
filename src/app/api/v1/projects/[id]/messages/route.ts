import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { createMessageSchema } from "@/lib/validations";

// GET /api/v1/projects/:id/messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return apiError("Project not found", 404);

  // Only creator and assigned clipper can see messages
  if (project.creatorId !== user.id && project.assignedClipperId !== user.id) {
    return apiError("Forbidden", 403);
  }

  const messages = await prisma.message.findMany({
    where: { projectId: id },
    include: {
      sender: { select: { id: true, name: true, nickname: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Mark unread messages as read
  await prisma.message.updateMany({
    where: { projectId: id, senderId: { not: user.id }, isRead: false },
    data: { isRead: true },
  });

  return apiResponse(messages);
}

// POST /api/v1/projects/:id/messages
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;
  const body = await req.json();
  const result = parseBody(createMessageSchema, body);
  if ("error" in result) return apiError(result.error);

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return apiError("Project not found", 404);

  if (project.creatorId !== user.id && project.assignedClipperId !== user.id) {
    return apiError("Forbidden", 403);
  }

  const data = result.data;

  const message = await prisma.message.create({
    data: {
      projectId: id,
      senderId: user.id,
      content: data.content,
      attachmentUrls: data.attachmentUrls ?? [],
    },
    include: {
      sender: { select: { id: true, name: true, nickname: true, image: true } },
    },
  });

  // Notify the other party
  const recipientId =
    project.creatorId === user.id
      ? project.assignedClipperId
      : project.creatorId;

  if (recipientId) {
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: "MESSAGE_RECEIVED",
        title: "새 메시지",
        body: `"${project.title}" 프로젝트에 새 메시지가 있습니다.`,
        linkUrl: `/projects/${id}`,
      },
    });
  }

  return apiResponse(message, 201);
}
