import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth } from "@/lib/api/helpers";

// PUT /api/v1/notifications/:id/read
export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;

  if (id === "all") {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return apiResponse({ success: true });
  }

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) return apiError("Notification not found", 404);
  if (notification.userId !== user.id) return apiError("Forbidden", 403);

  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return apiResponse({ success: true });
}
