import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { walletDepositSchema } from "@/lib/validations";

// POST /api/v1/wallet/deposit — Deposit funds (simulated for now)
export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const body = await request.json();
  const parsed = parseBody(walletDepositSchema, body);
  if ("error" in parsed) return apiError(parsed.error);

  const { amount } = parsed.data;

  // Get or create wallet
  let wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { userId: user.id } });
  }

  const balanceBefore = Number(wallet.balance);
  const balanceAfter = balanceBefore + amount;

  const [updatedWallet, transaction] = await prisma.$transaction([
    prisma.wallet.update({
      where: { userId: user.id },
      data: {
        balance: balanceAfter,
        totalDeposited: { increment: amount },
      },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEPOSIT",
        status: "COMPLETED",
        amount,
        balanceBefore,
        balanceAfter,
        description: `지갑 충전: ${amount.toLocaleString()}원`,
      },
    }),
  ]);

  return apiResponse({ wallet: updatedWallet, transaction });
}
