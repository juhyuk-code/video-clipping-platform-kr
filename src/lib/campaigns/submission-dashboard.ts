import { calculateEstimatedEarnings } from "@/lib/earnings";

export type CreatorQueueKey = "applied" | "joined" | "review" | "closed";
export type CreatorSortKey = "latest" | "views" | "payout";
export type CreatorPlatformFilterKey = "all" | "youtube" | "instagram" | "tiktok";
export type CreatorSubmissionPlatformKey = "youtube" | "instagram" | "tiktok" | "unknown";

export type CreatorSubmissionStatus =
  | "APPLIED"
  | "APPLICATION_REJECTED"
  | "JOINED"
  | "WITHDRAWN"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "APPROVED"
  | "REVISION_REQ"
  | "REJECTED"
  | "PAID";

export type CreatorSubmissionInput = {
  id: string;
  status: string;
  clipTitle: string | null;
  clipUrl: string | null;
  thumbnailUrl: string | null;
  targetPlatform: string | null;
  latestViewCount: number;
  baselineViewCount: number | null;
  totalPaid: number;
  proposedPrice: number | null;
  revisionNotes: string | null;
  applicationDecisionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  lastMetricsSyncedAt: string | null;
  metricsSyncStatus: string | null;
  metricsLastError: string | null;
  latestLikeCount: number | null;
  latestCommentCount: number | null;
  latestSnapshotCapturedAt: string | null;
  clipper: {
    id: string;
    nickname: string | null;
    name: string | null;
    image: string | null;
  };
};

export type CreatorSubmissionCardVM = CreatorSubmissionInput & {
  queue: CreatorQueueKey;
  platformKey: CreatorSubmissionPlatformKey;
  resolvedThumbnailUrl: string | null;
  estimatedPayout: number;
  deltaSinceSubmission: number | null;
};

export type TopPerformingVideoVM = CreatorSubmissionCardVM & {
  rank: number;
};

export const DEFAULT_CREATOR_VIEW = "submissions";
export const DEFAULT_CREATOR_QUEUE: CreatorQueueKey = "review";
export const DEFAULT_CREATOR_SORT: CreatorSortKey = "latest";
export const DEFAULT_CREATOR_PLATFORM: CreatorPlatformFilterKey = "all";

const CLOSED_STATUSES = new Set([
  "APPROVED",
  "PAID",
  "REJECTED",
  "APPLICATION_REJECTED",
  "WITHDRAWN",
]);

const REVIEW_STATUSES = new Set(["SUBMITTED", "IN_REVIEW", "REVISION_REQ"]);

export function parseCreatorQueueKey(value: string | null | undefined): CreatorQueueKey {
  if (value === "applied" || value === "joined" || value === "review" || value === "closed") {
    return value;
  }
  return DEFAULT_CREATOR_QUEUE;
}

export function parseCreatorSortKey(value: string | null | undefined): CreatorSortKey {
  if (value === "latest" || value === "views" || value === "payout") {
    return value;
  }
  return DEFAULT_CREATOR_SORT;
}

export function parseCreatorPlatformFilterKey(value: string | null | undefined): CreatorPlatformFilterKey {
  if (value === "all" || value === "youtube" || value === "instagram" || value === "tiktok") {
    return value;
  }
  return DEFAULT_CREATOR_PLATFORM;
}

export function getSubmissionQueueKey(status: string): CreatorQueueKey {
  if (status === "APPLIED") return "applied";
  if (status === "JOINED") return "joined";
  if (REVIEW_STATUSES.has(status)) return "review";
  if (CLOSED_STATUSES.has(status)) return "closed";
  return "review";
}

export function getSubmissionPlatformKey(
  targetPlatform: string | null | undefined,
  clipUrl: string | null | undefined
): CreatorSubmissionPlatformKey {
  const normalizedPlatform = targetPlatform?.toUpperCase() ?? "";
  if (normalizedPlatform.includes("YOUTUBE")) return "youtube";
  if (normalizedPlatform.includes("INSTAGRAM")) return "instagram";
  if (normalizedPlatform.includes("TIKTOK")) return "tiktok";

  if (!clipUrl) return "unknown";

  try {
    const url = new URL(clipUrl);
    const host = url.hostname.toLowerCase();

    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("tiktok.com")) return "tiktok";
  } catch {
    // ignore invalid clip URL.
  }

  return "unknown";
}

function extractYouTubeVideoId(clipUrl: string): string | null {
  try {
    const url = new URL(clipUrl);
    const host = url.hostname.toLowerCase();

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
      const pathParts = url.pathname.split("/").filter(Boolean);
      return (
        url.searchParams.get("v") ??
        (pathParts[0] === "shorts" ? pathParts[1] : null) ??
        (pathParts[0] === "embed" ? pathParts[1] : null) ??
        (pathParts[0] === "live" ? pathParts[1] : null)
      );
    }

    return null;
  } catch {
    return null;
  }
}

export function resolveSubmissionThumbnail(
  thumbnailUrl: string | null | undefined,
  clipUrl: string | null | undefined
): string | null {
  if (thumbnailUrl) return thumbnailUrl;
  if (!clipUrl) return null;

  const youtubeId = extractYouTubeVideoId(clipUrl);
  if (youtubeId) {
    return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  return null;
}

export function buildCreatorSubmissionCardVM(
  submission: CreatorSubmissionInput,
  campaignPricing: {
    campaignType: string;
    fixedPayPerClip: number | null;
    cprRate: number | null;
    viewBonusRate: number | null;
  }
): CreatorSubmissionCardVM {
  const queue = getSubmissionQueueKey(submission.status);
  const platformKey = getSubmissionPlatformKey(submission.targetPlatform, submission.clipUrl);
  const resolvedThumbnailUrl = resolveSubmissionThumbnail(submission.thumbnailUrl, submission.clipUrl);

  const estimatedPayout = calculateEstimatedEarnings(
    campaignPricing.campaignType,
    submission.latestViewCount,
    campaignPricing.fixedPayPerClip,
    campaignPricing.cprRate,
    campaignPricing.viewBonusRate
  ).total;

  const deltaSinceSubmission =
    submission.baselineViewCount == null
      ? null
      : submission.latestViewCount - submission.baselineViewCount;

  return {
    ...submission,
    queue,
    platformKey,
    resolvedThumbnailUrl,
    estimatedPayout,
    deltaSinceSubmission,
  };
}

export function sortCreatorSubmissions(
  submissions: CreatorSubmissionCardVM[],
  sortKey: CreatorSortKey
): CreatorSubmissionCardVM[] {
  const sorted = [...submissions];

  if (sortKey === "views") {
    return sorted.sort((a, b) => {
      if (b.latestViewCount !== a.latestViewCount) {
        return b.latestViewCount - a.latestViewCount;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  if (sortKey === "payout") {
    return sorted.sort((a, b) => {
      if (b.estimatedPayout !== a.estimatedPayout) {
        return b.estimatedPayout - a.estimatedPayout;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  return sorted.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function applyCreatorSubmissionFilters(
  submissions: CreatorSubmissionCardVM[],
  options: {
    queue: CreatorQueueKey;
    sort: CreatorSortKey;
    platform: CreatorPlatformFilterKey;
  }
): CreatorSubmissionCardVM[] {
  const filteredByPlatform =
    options.platform === "all"
      ? submissions
      : submissions.filter((submission) => submission.platformKey === options.platform);

  const queueFiltered = filteredByPlatform.filter(
    (submission) => submission.queue === options.queue
  );

  return sortCreatorSubmissions(queueFiltered, options.sort);
}

export function deriveTopPerformingVideos(
  submissions: CreatorSubmissionCardVM[],
  options?: {
    platform?: CreatorPlatformFilterKey;
    limit?: number;
  }
): TopPerformingVideoVM[] {
  const limit = options?.limit ?? 10;
  const platform = options?.platform ?? "all";

  const candidates = submissions.filter((submission) => {
    if (!submission.clipUrl) return false;
    if (submission.queue === "applied" || submission.queue === "joined") return false;
    if (platform !== "all" && submission.platformKey !== platform) return false;
    return true;
  });

  return candidates
    .sort((a, b) => {
      if (b.latestViewCount !== a.latestViewCount) {
        return b.latestViewCount - a.latestViewCount;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .slice(0, limit)
    .map((submission, index) => ({
      ...submission,
      rank: index + 1,
    }));
}

export function buildQueueCounts(
  submissions: CreatorSubmissionCardVM[],
  platform: CreatorPlatformFilterKey
): Record<CreatorQueueKey, number> {
  const filteredByPlatform =
    platform === "all"
      ? submissions
      : submissions.filter((submission) => submission.platformKey === platform);

  return {
    applied: filteredByPlatform.filter((submission) => submission.queue === "applied").length,
    joined: filteredByPlatform.filter((submission) => submission.queue === "joined").length,
    review: filteredByPlatform.filter((submission) => submission.queue === "review").length,
    closed: filteredByPlatform.filter((submission) => submission.queue === "closed").length,
  };
}
