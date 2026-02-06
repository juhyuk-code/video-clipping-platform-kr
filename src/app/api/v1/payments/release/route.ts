import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth } from "@/lib/api/helpers";
import { z } from "zod";

const releaseSchema = z.object({
  projectId: z.string(),
});

// POST /api/v1/payments/release — release escrow after project completion
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const result = releaseSchema.safeParse(body);
  if (!result.success) return apiError("projectId is required");

  const { projectId } = result.data;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return apiError("Project not found", 404);
  if (project.creatorId !== user.id) return apiError("Forbidden", 403);
  if (project.status !== "COMPLETED") return apiError("Project must be completed first");

  const payment = await prisma.payment.findFirst({
    where: { projectId, status: "ESCROWED" },
  });
  if (!payment) return apiError("No escrowed payment found");

  // In production: call Toss Payments payout API to transfer funds to clipper
  // For now, just update the status
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "RELEASED", releasedAt: new Date() },
  });

  // Update clipper's total earnings
  await prisma.clipperProfile.updateMany({
    where: { userId: payment.payeeId },
    data: { totalEarnings: { increment: Number(payment.netPayeeAmount) } },
  });

  // Update creator's total projects posted
  await prisma.creatorProfile.updateMany({
    where: { userId: user.id },
    data: { totalProjectsPosted: { increment: 1 } },
  });

  // Update clipper's completed count
  await prisma.clipperProfile.updateMany({
    where: { userId: payment.payeeId },
    data: { totalProjectsCompleted: { increment: 1 } },
  });

  // Notify clipper
  await prisma.notification.create({
    data: {
      userId: payment.payeeId,
      type: "PAYMENT_RECEIVED",
      title: "정산 완료",
      body: `₩${Number(payment.netPayeeAmount).toLocaleString()} 정산이 완료되었습니다.`,
      linkUrl: `/projects/${projectId}`,
    },
  });

  return apiResponse({ success: true, released: Number(payment.netPayeeAmount) });
}
