import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, parseQuery } from "@/lib/api/helpers";
import { marketplaceQuerySchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

// GET /api/v1/marketplace — browse open projects
export async function GET(req: NextRequest) {
  const result = parseQuery(marketplaceQuerySchema, req.nextUrl.searchParams);
  if ("error" in result) return apiError(result.error);

  const { page, limit, category, platform, minBudget, maxBudget, sort, search } = result.data;
  const skip = (page - 1) * limit;

  const where: Prisma.ProjectWhereInput = {
    status: "OPEN",
  };

  if (category) {
    where.contentCategory = category;
  }

  if (platform) {
    where.targetPlatforms = { has: platform };
  }

  if (minBudget || maxBudget) {
    where.budgetAmount = {};
    if (minBudget) (where.budgetAmount as Prisma.DecimalNullableFilter).gte = minBudget;
    if (maxBudget) (where.budgetAmount as Prisma.DecimalNullableFilter).lte = maxBudget;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  let orderBy: Prisma.ProjectOrderByWithRelationInput;
  switch (sort) {
    case "budget_high":
      orderBy = { budgetAmount: "desc" };
      break;
    case "deadline_soon":
      orderBy = { deadline: "asc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            nickname: true,
            image: true,
            creatorProfile: {
              select: { youtubeChannelName: true, subscriberCount: true },
            },
          },
        },
        _count: { select: { applications: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return apiResponse({
    projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
