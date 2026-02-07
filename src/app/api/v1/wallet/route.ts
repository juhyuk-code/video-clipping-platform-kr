import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth } from "@/lib/api/helpers";

// GET /api/v1/wallet — Get wallet info + recent transactions
export async function GET(_request: NextRequest) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  let wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  // Auto-create wallet if it doesn't exist
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { userId: user.id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
  }

  return apiResponse(wallet);
}
