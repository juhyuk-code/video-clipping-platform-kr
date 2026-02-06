import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError } from "@/lib/api/helpers";

// POST /api/v1/payments/webhooks/toss — handle Toss Payments webhooks
export async function POST(req: NextRequest) {
  const body = await req.json();

  // In production, verify webhook signature using Toss webhook secret
  // const signature = req.headers.get("Toss-Signature");

  const { eventType, data } = body;

  switch (eventType) {
    case "PAYMENT_STATUS_CHANGED": {
      const { paymentKey, status } = data;

      const payment = await prisma.payment.findFirst({
        where: { tossPaymentKey: paymentKey },
      });

      if (payment) {
        if (status === "CANCELED") {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "REFUNDED", refundedAt: new Date() },
          });
        }
      }
      break;
    }
  }

  return apiResponse({ received: true });
}
