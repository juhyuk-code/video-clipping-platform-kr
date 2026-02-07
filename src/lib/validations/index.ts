import { z } from "zod";

export const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  brief: z.string().min(1),
  sourceVideoUrl: z.string().url().optional(),
  targetPlatforms: z.array(z.string()).min(1),
  pricingModel: z.enum(["FIXED", "PER_CLIP", "REVENUE_SHARE", "BID"]).default("FIXED"),
  budgetAmount: z.number().int().positive().optional(),
  revenueSharePercentage: z.number().min(0).max(100).optional(),
  maxClipsRequested: z.number().int().positive().optional(),
  maxRevisionRounds: z.number().int().min(0).default(2),
  deadline: z.string().datetime(),
  contentCategory: z.string().optional(),
  type: z.enum(["OPEN_REQUEST", "DIRECT_ASSIGNMENT"]).default("OPEN_REQUEST"),
  requiredTier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z
    .enum([
      "DRAFT",
      "OPEN",
      "ASSIGNED",
      "IN_PROGRESS",
      "IN_REVIEW",
      "REVISION_REQUESTED",
      "COMPLETED",
      "CANCELLED",
      "DISPUTED",
    ])
    .optional(),
  assignedClipperId: z.string().optional(),
});

export const createApplicationSchema = z.object({
  pitch: z.string().min(1),
  proposedPrice: z.number().int().positive().optional(),
  estimatedDeliveryDays: z.number().int().positive(),
  portfolioSamples: z.array(z.string().url()).optional(),
});

export const updateApplicationSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED", "WITHDRAWN"]),
});

export const createClipSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  videoFileUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  durationSeconds: z.number().int().positive().optional(),
  targetPlatform: z.string(),
});

export const reviewClipSchema = z.object({
  status: z.enum(["APPROVED", "REVISION_REQUESTED", "REJECTED"]),
  revisionNotes: z.string().optional(),
});

export const createReviewSchema = z.object({
  revieweeId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export const createMessageSchema = z.object({
  content: z.string().min(1),
  attachmentUrls: z.array(z.string().url()).optional(),
});

export const updateUserProfileSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  role: z.enum(["CREATOR", "CLIPPER", "BOTH"]).optional(),
  preferredLanguage: z.enum(["KO", "EN"]).optional(),
});

export const marketplaceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  category: z.string().optional(),
  platform: z.string().optional(),
  minBudget: z.coerce.number().int().optional(),
  maxBudget: z.coerce.number().int().optional(),
  sort: z.enum(["newest", "budget_high", "deadline_soon"]).default("newest"),
  search: z.string().optional(),
});

// ─── Campaign Schemas ───────────────────────────────────────

export const createCampaignSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  guidelines: z.string().min(1),
  type: z.enum(["PROJECT", "REWARD", "HYBRID"]),
  contentCategory: z.string().optional(),
  sourceVideoUrl: z.string().url().optional(),
  sourceVideoTitle: z.string().optional(),
  targetPlatforms: z.array(z.string()).min(1),

  totalBudget: z.number().int().positive().optional(),
  fixedPayPerClip: z.number().int().positive().optional(),
  cprRate: z.number().positive().optional(),
  viewBonusRate: z.number().positive().optional(),
  maxParticipants: z.number().int().positive().optional(),
  maxClipsPerUser: z.number().int().positive().default(1),
  minViewThreshold: z.number().int().min(0).default(0),

  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  deadline: z.string().datetime(),
});

export const updateCampaignSchema = createCampaignSchema.partial().extend({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
});

export const campaignQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  type: z.enum(["PROJECT", "REWARD", "HYBRID"]).optional(),
  category: z.string().optional(),
  minBudget: z.coerce.number().int().optional(),
  maxBudget: z.coerce.number().int().optional(),
  sort: z.enum(["newest", "budget_high", "deadline_soon", "most_participants"]).default("newest"),
  search: z.string().optional(),
});

export const applyToCampaignSchema = z.object({
  pitch: z.string().min(1).optional(),
  proposedPrice: z.number().int().positive().optional(),
});

export const submitToCampaignSchema = z.object({
  clipTitle: z.string().min(1).max(200),
  clipUrl: z.string().url().optional(),
  clipFileUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  targetPlatform: z.string(),
});

export const reviewSubmissionSchema = z.object({
  status: z.enum(["APPROVED", "REVISION_REQ", "REJECTED"]),
  revisionNotes: z.string().optional(),
});

export const walletDepositSchema = z.object({
  amount: z.number().int().positive().min(1000),
});
