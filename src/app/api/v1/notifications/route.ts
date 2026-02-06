import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth } from "@/lib/api/helpers";

// GET /api/v1/notifications
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const { searchParams } = req.nextUrl;
  const unreadOnly = searchParams.get("unread") === "true";

  const where: Record<string, unknown> = { userId: user.id };
  if (unreadOnly) where.isRead = false;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return apiResponse({ notifications, unreadCount });
}
