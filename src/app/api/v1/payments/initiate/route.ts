import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth } from "@/lib/api/helpers";
import { generateOrderId, calculateFees } from "@/lib/payments/toss";
import { z } from "zod";

const initiateSchema = z.object({
  projectId: z.string(),
});

// POST /api/v1/payments/initiate — creator initiates escrow payment
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const result = initiateSchema.safeParse(body);
  if (!result.success) return apiError("projectId is required");

  const { projectId } = result.data;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return apiError("Project not found", 404);
  if (project.creatorId !== user.id) return apiError("Forbidden", 403);
  if (!project.assignedClipperId) return apiError("No clipper assigned");
  if (!project.budgetAmount) return apiError("No budget set for this project");

  // Check for existing pending/escrowed payment
  const existing = await prisma.payment.findFirst({
    where: { projectId, status: { in: ["PENDING", "ESCROWED"] } },
  });
  if (existing) return apiError("Payment already exists for this project");

  const amount = Number(project.budgetAmount);
  const { platformFee, netPayeeAmount } = calculateFees(amount);
  const orderId = generateOrderId(projectId);

  const payment = await prisma.payment.create({
    data: {
      projectId,
      payerId: user.id,
      payeeId: project.assignedClipperId,
      amount,
      platformFee,
      netPayeeAmount,
      status: "PENDING",
      tossOrderId: orderId,
    },
  });

  // Return data needed for Toss Payments Widget
  return apiResponse({
    paymentId: payment.id,
    orderId,
    amount,
    orderName: project.title,
    clientKey: process.env.TOSS_CLIENT_KEY,
  });
}
