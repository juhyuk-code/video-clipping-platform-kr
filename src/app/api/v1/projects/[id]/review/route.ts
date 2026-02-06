import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { createReviewSchema } from "@/lib/validations";

// POST /api/v1/projects/:id/review — submit a review after project completion
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;
  const body = await req.json();
  const result = parseBody(createReviewSchema, body);
  if ("error" in result) return apiError(result.error);

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return apiError("Project not found", 404);
  if (project.status !== "COMPLETED") return apiError("Can only review completed projects");

  // Verify user is part of this project
  if (project.creatorId !== user.id && project.assignedClipperId !== user.id) {
    return apiError("Forbidden", 403);
  }

  const data = result.data;

  // Check for existing review from this user
  const existing = await prisma.review.findUnique({
    where: { projectId_reviewerId: { projectId: id, reviewerId: user.id } },
  });
  if (existing) return apiError("Already reviewed this project");

  const review = await prisma.review.create({
    data: {
      projectId: id,
      reviewerId: user.id,
      revieweeId: data.revieweeId,
      rating: data.rating,
      comment: data.comment,
    },
  });

  // Update reviewee's average rating
  const allReviews = await prisma.review.findMany({
    where: { revieweeId: data.revieweeId },
    select: { rating: true },
  });
  const avgRating =
    allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  // Update the appropriate profile
  const revieweeUser = await prisma.user.findUnique({
    where: { id: data.revieweeId },
    select: { role: true },
  });

  if (revieweeUser?.role === "CLIPPER" || revieweeUser?.role === "BOTH") {
    await prisma.clipperProfile.updateMany({
      where: { userId: data.revieweeId },
      data: { averageRating: avgRating },
    });
  }

  // Notify reviewee
  await prisma.notification.create({
    data: {
      userId: data.revieweeId,
      type: "REVIEW_RECEIVED",
      title: "새 리뷰",
      body: `프로젝트 "${project.title}"에 대한 리뷰를 받았습니다.`,
      linkUrl: `/projects/${id}`,
    },
  });

  return apiResponse(review, 201);
}
