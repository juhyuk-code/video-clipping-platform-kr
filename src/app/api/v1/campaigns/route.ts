import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody, parseQuery } from "@/lib/api/helpers";
import { createCampaignSchema, campaignQuerySchema } from "@/lib/validations";

// GET /api/v1/campaigns — List/search campaigns
export async function GET(request: NextRequest) {
  try {
    const parsed = parseQuery(campaignQuerySchema, request.nextUrl.searchParams);
    if ("error" in parsed) return apiError(parsed.error);

    const { page, limit, type, category, minBudget, maxBudget, sort, search } = parsed.data;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { status: "ACTIVE" };
    if (type) where.type = type;
    if (category) where.contentCategory = category;
    if (search) where.title = { contains: search, mode: "insensitive" };
    if (minBudget || maxBudget) {
      where.totalBudget = {};
      if (minBudget) (where.totalBudget as Record<string, number>).gte = minBudget;
      if (maxBudget) (where.totalBudget as Record<string, number>).lte = maxBudget;
    }

    const orderBy: Record<string, string> =
      sort === "budget_high"
        ? { totalBudget: "desc" }
        : sort === "deadline_soon"
          ? { deadline: "asc" }
          : sort === "most_participants"
            ? { participantCount: "desc" }
            : { createdAt: "desc" };

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              nickname: true,
              name: true,
              image: true,
              creatorProfile: {
                select: { youtubeChannelName: true, subscriberCount: true },
              },
            },
          },
          _count: { select: { submissions: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return apiResponse({
      campaigns,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("GET /api/v1/campaigns error:", e);
    return apiError("서버 오류가 발생했습니다", 500);
  }
}

// POST /api/v1/campaigns — Create a campaign
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return apiError("Unauthorized", 401);

    const body = await request.json();
    const parsed = parseBody(createCampaignSchema, body);
    if ("error" in parsed) return apiError(parsed.error);

    const data = parsed.data;

    // Validate type-specific required fields
    if (data.type === "PROJECT" && !data.fixedPayPerClip) {
      return apiError("프로젝트형 캠페인은 클립당 고정 금액이 필요합니다");
    }
    if (data.type === "REWARD" && !data.cprRate) {
      return apiError("리워드형 캠페인은 CPR(1000뷰당 단가)이 필요합니다");
    }
    if (data.type === "HYBRID" && (!data.fixedPayPerClip || !data.viewBonusRate)) {
      return apiError("하이브리드형 캠페인은 고정 금액과 뷰 보너스 단가가 모두 필요합니다");
    }

    const campaign = await prisma.campaign.create({
      data: {
        creatorId: user.id,
        title: data.title,
        description: data.description,
        guidelines: data.guidelines,
        type: data.type,
        contentCategory: data.contentCategory,
        sourceVideoUrl: data.sourceVideoUrl,
        sourceVideoTitle: data.sourceVideoTitle,
        targetPlatforms: data.targetPlatforms,
        totalBudget: data.totalBudget,
        fixedPayPerClip: data.fixedPayPerClip,
        cprRate: data.cprRate,
        viewBonusRate: data.viewBonusRate,
        maxParticipants: data.maxParticipants,
        maxClipsPerUser: data.maxClipsPerUser ?? 1,
        minViewThreshold: data.minViewThreshold ?? 0,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        deadline: new Date(data.deadline),
      },
    });

    return apiResponse(campaign, 201);
  } catch (e) {
    console.error("POST /api/v1/campaigns error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return apiError(`캠페인 생성 오류: ${msg}`, 500);
  }
}
