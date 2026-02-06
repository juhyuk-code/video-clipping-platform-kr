import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth } from "@/lib/api/helpers";
import { confirmPayment } from "@/lib/payments/toss";
import { z } from "zod";

const confirmSchema = z.object({
  paymentKey: z.string(),
  orderId: z.string(),
  amount: z.number(),
});

// POST /api/v1/payments/confirm — confirm payment after Toss checkout
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const result = confirmSchema.safeParse(body);
  if (!result.success) return apiError("paymentKey, orderId, and amount are required");

  const { paymentKey, orderId, amount } = result.data;

  const payment = await prisma.payment.findUnique({
    where: { tossOrderId: orderId },
  });
  if (!payment) return apiError("Payment not found", 404);
  if (payment.payerId !== user.id) return apiError("Forbidden", 403);
  if (payment.status !== "PENDING") return apiError("Payment is not pending");
  if (Number(payment.amount) !== amount) return apiError("Amount mismatch");

  try {
    // Confirm with Toss Payments API
    const tossResult = await confirmPayment({ paymentKey, orderId, amount });

    // Update payment record
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "ESCROWED",
        tossPaymentKey: paymentKey,
        paidAt: new Date(),
      },
    });

    // Move project to IN_PROGRESS
    await prisma.project.update({
      where: { id: payment.projectId },
      data: { status: "IN_PROGRESS" },
    });

    // Notify clipper
    await prisma.notification.create({
      data: {
        userId: payment.payeeId,
        type: "PAYMENT_RECEIVED",
        title: "결제 완료",
        body: `에스크로 결제가 완료되었습니다. 작업을 시작해주세요.`,
        linkUrl: `/projects/${payment.projectId}`,
      },
    });

    return apiResponse({ success: true, paymentKey });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Payment confirmation failed",
      500
    );
  }
}
