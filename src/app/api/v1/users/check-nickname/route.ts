import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth } from "@/lib/api/helpers";

const RESERVED_NICKNAMES = [
  "admin", "administrator", "관리자", "운영자", "system", "시스템",
  "clipplatform", "클립플랫폼", "support", "고객센터",
];

// GET /api/v1/users/check-nickname?nickname=xxx
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const nickname = req.nextUrl.searchParams.get("nickname")?.trim();
  if (!nickname) return apiError("닉네임을 입력해주세요.");
  if (nickname.length < 2) return apiError("닉네임은 2자 이상이어야 합니다.");
  if (nickname.length > 50) return apiError("닉네임은 50자 이하여야 합니다.");

  // Check reserved words (case-insensitive)
  if (RESERVED_NICKNAMES.includes(nickname.toLowerCase())) {
    return apiResponse({ available: false, reason: "사용할 수 없는 닉네임입니다." });
  }

  // Case-insensitive duplicate check (excluding current user)
  const existing = await prisma.user.findFirst({
    where: {
      nickname: { equals: nickname, mode: "insensitive" },
      id: { not: user.id },
    },
    select: { id: true },
  });

  return apiResponse({
    available: !existing,
    reason: existing ? "이미 사용 중인 닉네임입니다." : null,
  });
}
