import { prisma } from "@/lib/db";
import { refreshAccessToken, type SocialProviderType } from "@/lib/social/providers";
import { getYouTubeScopeStatus } from "@/lib/social/youtube-permissions";

const YOUTUBE_DATA_API = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_ANALYTICS_API = "https://youtubeanalytics.googleapis.com/v2/reports";
const FACEBOOK_GRAPH_API = "https://graph.facebook.com/v21.0";

export type AnalyticsProviderEnum = "YOUTUBE" | "INSTAGRAM";

type SubmissionSyncResult = {
  ok: boolean;
  reason?: string;
  analytics?: SubmissionAnalyticsPayload;
};

type ParsedClipUrl = {
  provider: SocialProviderType;
  providerEnum: AnalyticsProviderEnum;
  platformVideoId: string;
  canonicalUrl: string;
};

type CurrentMetrics = {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount?: number;
  reachCount?: number;
  impressionCount?: number;
  saveCount?: number;
  estimatedMinutesWatched?: number;
  averageViewDurationSec?: number;
  averageViewPercentage?: number;
  trafficExternalViews?: number;
  trafficSearchViews?: number;
  trafficSuggestedViews?: number;
  trafficDirectViews?: number;
  postedAt?: Date;
  rawPayload?: unknown;
};

export type SubmissionAnalyticsPayload = {
  provider: AnalyticsProviderEnum | null;
  current: {
    views: number;
    likes: number;
    comments: number;
    shares: number | null;
    reach: number | null;
    impressions: number | null;
    saves: number | null;
  };
  deltaSinceSubmission: {
    views: number;
    likes: number;
    comments: number;
  };
  creatorBreakdown:
    | {
        platform: "YOUTUBE";
        averageViewDurationSec: number | null;
        averageViewPercentage: number | null;
        estimatedMinutesWatched: number | null;
        trafficExternalViews: number | null;
        trafficSearchViews: number | null;
        trafficSuggestedViews: number | null;
        trafficDirectViews: number | null;
        likeToViewRatio: number | null;
        commentToViewRatio: number | null;
      }
    | {
        platform: "INSTAGRAM";
        playsOrViews: number;
        reach: number | null;
        impressions: number | null;
        shares: number | null;
        saves: number | null;
        likeToReachRatio: number | null;
        commentToReachRatio: number | null;
      }
    | null;
  syncStatus: string;
  lastSyncedAt: string | null;
  baselineCapturedAt: string | null;
  freshnessNote: string;
  reconnectRequired: boolean;
};

export function deriveAnalyticsProvider(targetPlatform?: string | null): AnalyticsProviderEnum | null {
  if (!targetPlatform) return null;
  const normalized = targetPlatform.trim().toUpperCase();
  if (normalized.includes("YOUTUBE")) return "YOUTUBE";
  if (normalized.includes("INSTAGRAM")) return "INSTAGRAM";
  return null;
}

function mapProviderEnumToType(provider: string): SocialProviderType | null {
  if (provider === "YOUTUBE") return "youtube";
  if (provider === "INSTAGRAM") return "instagram";
  if (provider === "TIKTOK") return "tiktok";
  return null;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function withTimeOffset(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function toInt(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? Math.floor(n) : fallback;
  }
  return fallback;
}

function toFloat(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeUrl(url: URL): string {
  const normalized = new URL(url.toString());
  normalized.hash = "";
  normalized.search = "";
  if (normalized.pathname !== "/") {
    normalized.pathname = normalized.pathname.replace(/\/+$/, "");
  }
  return normalized.toString();
}

function parseYouTubeVideoId(url: URL): string | null {
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
}

function parseInstagramCode(url: URL): string | null {
  if (!url.hostname.toLowerCase().includes("instagram.com")) return null;
  const match = url.pathname.match(/\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

function buildYouTubeCanonicalUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function ratio(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (!numerator || !denominator || denominator <= 0) return null;
  return Number((numerator / denominator).toFixed(4));
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let parsed: unknown;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    const message =
      typeof parsed === "object" && parsed && "error" in parsed
        ? JSON.stringify((parsed as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new Error(message);
  }

  return parsed as T;
}

async function ensureFreshConnectionToken(connection: {
  id: string;
  provider: string;
  providerAccountId: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  scope?: string | null;
}) {
  const providerType = mapProviderEnumToType(connection.provider);
  if (!providerType) return { ok: false as const, reason: "Unsupported provider for analytics" };

  const expiresAt = connection.tokenExpiresAt;
  const shouldRefresh = expiresAt ? expiresAt.getTime() <= Date.now() + 60 * 1000 : false;

  if (!shouldRefresh) {
    return {
      ok: true as const,
      accessToken: connection.accessToken,
      connection,
    };
  }

  const refreshed = await refreshAccessToken(providerType, {
    refreshToken: connection.refreshToken,
    accessToken: connection.accessToken,
  });

  if (!refreshed?.accessToken) {
    return { ok: false as const, reason: "Failed to refresh provider token" };
  }

  const updated = await prisma.socialConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? connection.refreshToken,
      tokenExpiresAt: refreshed.expiresAt,
      scope: refreshed.scope,
      lastSyncedAt: new Date(),
    },
  });

  return {
    ok: true as const,
    accessToken: updated.accessToken,
    connection: {
      id: updated.id,
      provider: updated.provider,
      providerAccountId: updated.providerAccountId,
      accessToken: updated.accessToken,
      refreshToken: updated.refreshToken,
      tokenExpiresAt: updated.tokenExpiresAt,
      scope: updated.scope,
    },
  };
}

async function queryYouTubeAnalytics(
  accessToken: string,
  params: Record<string, string>
): Promise<{
  rows?: unknown[][];
  columnHeaders?: Array<{ name?: string }>;
}> {
  const search = new URLSearchParams(params);
  const url = `${YOUTUBE_ANALYTICS_API}?${search.toString()}`;
  return fetchJson(url, { headers: { Authorization: `Bearer ${accessToken}` } });
}

async function fetchYouTubeMetrics(accessToken: string, videoId: string, startDate: Date): Promise<CurrentMetrics & {
  channelId: string;
  platformVideoId: string;
  canonicalUrl: string;
}> {
  const videoResponse = await fetchJson<{
    items?: Array<{
      id: string;
      snippet?: { channelId?: string; publishedAt?: string };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
    }>;
  }>(`${YOUTUBE_DATA_API}/videos?part=snippet,statistics&id=${encodeURIComponent(videoId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const video = videoResponse.items?.[0];
  if (!video?.id || !video.snippet?.channelId) {
    throw new Error("Could not find YouTube video from submitted URL");
  }

  const now = new Date();
  const start = toDateOnly(startDate);
  const end = toDateOnly(now);

  let totals: CurrentMetrics = {
    viewCount: toInt(video.statistics?.viewCount),
    likeCount: toInt(video.statistics?.likeCount),
    commentCount: toInt(video.statistics?.commentCount),
    postedAt: video.snippet.publishedAt ? new Date(video.snippet.publishedAt) : undefined,
  };

  let analyticsRaw: unknown = null;
  try {
    const totalsReport = await queryYouTubeAnalytics(accessToken, {
      ids: "channel==MINE",
      startDate: start,
      endDate: end,
      metrics: "views,likes,comments,estimatedMinutesWatched,averageViewDuration,averageViewPercentage",
      filters: `video==${videoId}`,
    });

    analyticsRaw = totalsReport;
    const row = totalsReport.rows?.[0] ?? [];
    totals = {
      ...totals,
      viewCount: Math.max(totals.viewCount, toInt(row[0], totals.viewCount)),
      likeCount: Math.max(totals.likeCount, toInt(row[1], totals.likeCount)),
      commentCount: Math.max(totals.commentCount, toInt(row[2], totals.commentCount)),
      estimatedMinutesWatched: toInt(row[3], 0),
      averageViewDurationSec: toFloat(row[4]),
      averageViewPercentage: toFloat(row[5]),
    };
  } catch {
    // Data API still gives baseline counters even if analytics query is unavailable.
  }

  try {
    const trafficReport = await queryYouTubeAnalytics(accessToken, {
      ids: "channel==MINE",
      startDate: start,
      endDate: end,
      metrics: "views",
      dimensions: "insightTrafficSourceType",
      filters: `video==${videoId}`,
    });

    let external = 0;
    let search = 0;
    let suggested = 0;
    let direct = 0;

    for (const row of trafficReport.rows ?? []) {
      const source = typeof row[0] === "string" ? row[0] : "";
      const views = toInt(row[1], 0);

      if (source === "EXTERNAL") external += views;
      else if (source === "YT_SEARCH") search += views;
      else if (source === "SUGGESTED_VIDEO") suggested += views;
      else if (source === "DIRECT_OR_UNKNOWN" || source === "NO_LINK_OTHER") direct += views;
    }

    totals.trafficExternalViews = external;
    totals.trafficSearchViews = search;
    totals.trafficSuggestedViews = suggested;
    totals.trafficDirectViews = direct;

    totals.rawPayload = {
      videos: videoResponse,
      analytics: analyticsRaw,
      traffic: trafficReport,
    };
  } catch {
    totals.rawPayload = {
      videos: videoResponse,
      analytics: analyticsRaw,
    };
  }

  return {
    ...totals,
    channelId: video.snippet.channelId,
    platformVideoId: video.id,
    canonicalUrl: buildYouTubeCanonicalUrl(video.id),
  };
}

function extractInstagramCodeFromPermalink(permalink: string | undefined): string | null {
  if (!permalink) return null;
  try {
    return parseInstagramCode(new URL(permalink));
  } catch {
    return null;
  }
}

async function findInstagramMediaByCode(
  accessToken: string,
  igAccountId: string,
  code: string
): Promise<{
  id: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  media_type?: string;
  media_product_type?: string;
}> {
  let after: string | undefined;

  for (let i = 0; i < 8; i++) {
    const params = new URLSearchParams({
      fields: "id,permalink,timestamp,like_count,comments_count,media_type,media_product_type",
      limit: "50",
      access_token: accessToken,
    });
    if (after) params.set("after", after);

    const page = await fetchJson<{
      data?: Array<{
        id: string;
        permalink?: string;
        timestamp?: string;
        like_count?: number;
        comments_count?: number;
        media_type?: string;
        media_product_type?: string;
      }>;
      paging?: { cursors?: { after?: string } };
    }>(`${FACEBOOK_GRAPH_API}/${igAccountId}/media?${params.toString()}`);

    const match = (page.data ?? []).find((item) => extractInstagramCodeFromPermalink(item.permalink) === code);
    if (match) return match;

    after = page.paging?.cursors?.after;
    if (!after) break;
  }

  throw new Error("Submitted Instagram URL is not found in the connected account media");
}

async function fetchInstagramMediaById(accessToken: string, mediaId: string) {
  const params = new URLSearchParams({
    fields: "id,permalink,timestamp,like_count,comments_count,media_type,media_product_type,owner{id}",
    access_token: accessToken,
  });
  return fetchJson<{
    id: string;
    permalink?: string;
    timestamp?: string;
    like_count?: number;
    comments_count?: number;
    media_type?: string;
    media_product_type?: string;
    owner?: { id?: string };
  }>(`${FACEBOOK_GRAPH_API}/${mediaId}?${params.toString()}`);
}

async function fetchInstagramInsightsWithFallback(accessToken: string, mediaId: string) {
  const desiredMetrics = ["plays", "views", "reach", "impressions", "saved", "shares"];

  async function query(metrics: string[]) {
    const params = new URLSearchParams({
      metric: metrics.join(","),
      access_token: accessToken,
    });
    return fetchJson<{
      data?: Array<{ name?: string; values?: Array<{ value?: number | string | Record<string, unknown> }> }>;
    }>(`${FACEBOOK_GRAPH_API}/${mediaId}/insights?${params.toString()}`);
  }

  const metricValues: Record<string, number> = {};
  const raw: Record<string, unknown> = {};

  try {
    const combined = await query(desiredMetrics);
    raw.combined = combined;
    for (const item of combined.data ?? []) {
      const name = item.name;
      const value = item.values?.[0]?.value;
      if (!name) continue;
      if (typeof value === "number") metricValues[name] = value;
      else if (typeof value === "string" && !Number.isNaN(Number(value))) metricValues[name] = Number(value);
    }
  } catch {
    for (const metric of desiredMetrics) {
      try {
        const single = await query([metric]);
        raw[metric] = single;
        const item = single.data?.[0];
        const value = item?.values?.[0]?.value;
        if (typeof value === "number") metricValues[metric] = value;
        else if (typeof value === "string" && !Number.isNaN(Number(value))) metricValues[metric] = Number(value);
      } catch {
        // Ignore unavailable metrics per media type/version.
      }
    }
  }

  return { metricValues, raw };
}

async function fetchInstagramMetrics(
  accessToken: string,
  igAccountId: string,
  platformVideoIdOrCode: string
): Promise<CurrentMetrics & { platformVideoId: string; canonicalUrl: string }> {
  const looksLikeMediaId = /^\d+$/.test(platformVideoIdOrCode);

  const media = looksLikeMediaId
    ? await fetchInstagramMediaById(accessToken, platformVideoIdOrCode)
    : await findInstagramMediaByCode(accessToken, igAccountId, platformVideoIdOrCode);

  const mediaId = media.id;
  if (!mediaId) throw new Error("Could not resolve Instagram media id");

  const permalink = media.permalink;
  const insight = await fetchInstagramInsightsWithFallback(accessToken, mediaId);

  const playsOrViews = toInt(insight.metricValues.views ?? insight.metricValues.plays, 0);

  return {
    viewCount: playsOrViews,
    likeCount: toInt(media.like_count, 0),
    commentCount: toInt(media.comments_count, 0),
    shareCount: toInt(insight.metricValues.shares, 0),
    reachCount: toInt(insight.metricValues.reach, 0),
    impressionCount: toInt(insight.metricValues.impressions, 0),
    saveCount: toInt(insight.metricValues.saved, 0),
    postedAt: media.timestamp ? new Date(media.timestamp) : undefined,
    platformVideoId: mediaId,
    canonicalUrl: permalink ?? `https://www.instagram.com/reel/${platformVideoIdOrCode}/`,
    rawPayload: {
      media,
      insights: insight.raw,
    },
  };
}

export function parseSubmissionClipUrl(clipUrl: string): ParsedClipUrl | null {
  try {
    const url = new URL(clipUrl);

    const ytId = parseYouTubeVideoId(url);
    if (ytId) {
      return {
        provider: "youtube",
        providerEnum: "YOUTUBE",
        platformVideoId: ytId,
        canonicalUrl: buildYouTubeCanonicalUrl(ytId),
      };
    }

    const igCode = parseInstagramCode(url);
    if (igCode) {
      return {
        provider: "instagram",
        providerEnum: "INSTAGRAM",
        platformVideoId: igCode,
        canonicalUrl: normalizeUrl(url),
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function computeNextMetricsSyncAt(submittedAt: Date | null, now = new Date()): Date {
  const submitted = submittedAt ?? now;
  const elapsedMs = Math.max(0, now.getTime() - submitted.getTime());

  if (elapsedMs < 2 * 60 * 60 * 1000) {
    return withTimeOffset(now, 5);
  }

  if (elapsedMs < 24 * 60 * 60 * 1000) {
    return withTimeOffset(now, 30);
  }

  return withTimeOffset(now, 60);
}

function shouldStopSync(submission: {
  status: string;
  campaign: { status: string; deadline: Date; endDate: Date | null };
}, now: Date): boolean {
  if (["WITHDRAWN", "REJECTED", "APPLICATION_REJECTED"].includes(submission.status)) {
    return true;
  }

  if (!["COMPLETED", "CANCELLED"].includes(submission.campaign.status)) {
    return false;
  }

  const endedAt = submission.campaign.endDate ?? submission.campaign.deadline;
  const graceEnd = new Date(endedAt.getTime() + 48 * 60 * 60 * 1000);
  return now > graceEnd;
}

function isReconnectRequiredError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("token") ||
    lower.includes("토큰") ||
    lower.includes("만료") ||
    lower.includes("expired") ||
    lower.includes("unauthorized") ||
    lower.includes("access_denied") ||
    lower.includes("invalid_grant") ||
    lower.includes("refresh") ||
    lower.includes("insufficientpermissions") ||
    lower.includes("insufficient permission") ||
    lower.includes("scope") ||
    lower.includes("권한")
  );
}

export async function prepareVerifiedSubmissionContext(params: {
  clipperId: string;
  clipUrl: string;
  targetPlatform?: string | null;
}): Promise<{
  providerEnum: AnalyticsProviderEnum;
  platformVideoId: string;
  canonicalUrl: string;
  linkedSocialConnectionId: string;
  postedAt: Date | null;
  ownershipVerifiedAt: Date;
  current: CurrentMetrics;
}> {
  const parsed = parseSubmissionClipUrl(params.clipUrl);
  if (!parsed) {
    throw new Error("지원되는 YouTube/Instagram 클립 URL만 제출할 수 있습니다.");
  }

  const expectedProvider = deriveAnalyticsProvider(params.targetPlatform);
  if (expectedProvider && expectedProvider !== parsed.providerEnum) {
    throw new Error("선택한 타겟 플랫폼과 클립 URL 플랫폼이 일치하지 않습니다.");
  }

  const connection = await prisma.socialConnection.findUnique({
    where: {
      userId_provider: {
        userId: params.clipperId,
        provider: parsed.providerEnum,
      },
    },
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
      scope: true,
    },
  });

  if (!connection) {
    const providerLabel = parsed.providerEnum === "YOUTUBE" ? "YouTube" : "Instagram";
    throw new Error(`${providerLabel} 계정을 먼저 연결해야 제출할 수 있습니다.`);
  }

  if (parsed.providerEnum === "YOUTUBE") {
    const scopeStatus = getYouTubeScopeStatus(connection.scope);
    if (!scopeStatus.ready) {
      throw new Error("YouTube 필수 권한이 누락되었습니다. 설정에서 계정을 재연결하고 두 권한을 모두 허용해주세요.");
    }
  }

  const tokenResult = await ensureFreshConnectionToken(connection);
  if (!tokenResult.ok) {
    throw new Error("소셜 계정 토큰이 만료되었습니다. 설정에서 다시 연결해주세요.");
  }

  if (parsed.providerEnum === "YOUTUBE") {
    const metrics = await fetchYouTubeMetrics(tokenResult.accessToken, parsed.platformVideoId, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    if (metrics.channelId !== connection.providerAccountId) {
      throw new Error("제출한 YouTube 영상은 연결된 계정의 채널 소유 영상이 아닙니다.");
    }

    return {
      providerEnum: "YOUTUBE",
      platformVideoId: metrics.platformVideoId,
      canonicalUrl: metrics.canonicalUrl,
      linkedSocialConnectionId: connection.id,
      postedAt: metrics.postedAt ?? null,
      ownershipVerifiedAt: new Date(),
      current: metrics,
    };
  }

  const metrics = await fetchInstagramMetrics(
    tokenResult.accessToken,
    connection.providerAccountId,
    parsed.platformVideoId
  );

  return {
    providerEnum: "INSTAGRAM",
    platformVideoId: metrics.platformVideoId,
    canonicalUrl: metrics.canonicalUrl,
    linkedSocialConnectionId: connection.id,
    postedAt: metrics.postedAt ?? null,
    ownershipVerifiedAt: new Date(),
    current: metrics,
  };
}

async function upsertSocialVideo(params: {
  socialConnectionId: string;
  platformVideoId: string;
  submissionId: string;
  url: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  publishedAt?: Date;
}) {
  await prisma.socialVideo.upsert({
    where: {
      socialConnectionId_platformVideoId: {
        socialConnectionId: params.socialConnectionId,
        platformVideoId: params.platformVideoId,
      },
    },
    create: {
      socialConnectionId: params.socialConnectionId,
      platformVideoId: params.platformVideoId,
      submissionId: params.submissionId,
      url: params.url,
      viewCount: params.viewCount,
      likeCount: params.likeCount,
      commentCount: params.commentCount,
      shareCount: params.shareCount,
      publishedAt: params.publishedAt,
      lastSyncedAt: new Date(),
    },
    update: {
      submissionId: params.submissionId,
      url: params.url,
      viewCount: params.viewCount,
      likeCount: params.likeCount,
      commentCount: params.commentCount,
      shareCount: params.shareCount,
      publishedAt: params.publishedAt,
      lastSyncedAt: new Date(),
    },
  });
}

export async function syncSubmissionMetrics(submissionId: string): Promise<SubmissionSyncResult> {
  const now = new Date();

  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: submissionId },
    include: {
      campaign: {
        select: {
          status: true,
          deadline: true,
          endDate: true,
        },
      },
      linkedSocialConnection: {
        select: {
          id: true,
          provider: true,
          providerAccountId: true,
          accessToken: true,
          refreshToken: true,
          tokenExpiresAt: true,
          scope: true,
        },
      },
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!submission) {
    return { ok: false, reason: "Submission not found" };
  }

  if (shouldStopSync(submission, now)) {
    await prisma.campaignSubmission.update({
      where: { id: submission.id },
      data: {
        metricsSyncStatus: "IDLE",
        nextMetricsSyncAt: null,
      } as any,
    });
    return { ok: true, reason: "sync_stopped" };
  }

  const providerFromTarget = deriveAnalyticsProvider(submission.targetPlatform);
  let providerEnum: AnalyticsProviderEnum | null = submission.analyticsProvider ?? providerFromTarget;
  if (!providerEnum && !submission.targetPlatform && submission.clipUrl) {
    providerEnum = parseSubmissionClipUrl(submission.clipUrl)?.providerEnum ?? null;
  }

  if (!providerEnum || !submission.clipUrl) {
    return { ok: false, reason: "Submission has no analytics-linked URL" };
  }

  let connection = submission.linkedSocialConnection;
  let platformVideoId = submission.platformVideoId;
  let canonicalUrl = submission.clipUrl;
  let current: CurrentMetrics | null = null;

  const needsLegacyLinking =
    !submission.analyticsProvider ||
    !submission.linkedSocialConnectionId ||
    !connection ||
    !platformVideoId;

  if (needsLegacyLinking) {
    try {
      const verified = await prepareVerifiedSubmissionContext({
        clipperId: submission.clipperId,
        clipUrl: submission.clipUrl,
        targetPlatform: submission.targetPlatform,
      });

      providerEnum = verified.providerEnum;
      platformVideoId = verified.platformVideoId;
      canonicalUrl = verified.canonicalUrl;
      current = verified.current;

      connection = await prisma.socialConnection.findUnique({
        where: { id: verified.linkedSocialConnectionId },
        select: {
          id: true,
          provider: true,
          providerAccountId: true,
          accessToken: true,
          refreshToken: true,
          tokenExpiresAt: true,
          scope: true,
        },
      });

      await prisma.campaignSubmission.update({
        where: { id: submission.id },
        data: {
          analyticsProvider: verified.providerEnum,
          platformVideoId: verified.platformVideoId,
          linkedSocialConnectionId: verified.linkedSocialConnectionId,
          postedAt: submission.postedAt ?? verified.postedAt ?? null,
          ownershipVerifiedAt: verified.ownershipVerifiedAt,
          metricsSyncStatus: "ACTIVE",
          metricsLastError: null,
          nextMetricsSyncAt: computeNextMetricsSyncAt(submission.submittedAt, now),
        } as any,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "submission_linking_failed";
      const reconnectRequired = isReconnectRequiredError(message);
      await prisma.campaignSubmission.update({
        where: { id: submission.id },
        data: {
          metricsSyncStatus: reconnectRequired ? "DISCONNECTED" : "ERROR",
          metricsLastError: message,
          nextMetricsSyncAt: reconnectRequired
            ? null
            : computeNextMetricsSyncAt(submission.submittedAt, now),
          ...(reconnectRequired ? { metricsAuthErrorCount: { increment: 1 } } : {}),
        } as any,
      });
      return { ok: false, reason: message };
    }
  }

  if (!connection) {
    await prisma.campaignSubmission.update({
      where: { id: submission.id },
      data: {
        metricsSyncStatus: "DISCONNECTED",
        nextMetricsSyncAt: null,
        metricsLastError: "Linked social connection not found",
      } as any,
    });
    return { ok: false, reason: "Linked social connection missing" };
  }

  const tokenResult = await ensureFreshConnectionToken(connection);
  if (!tokenResult.ok) {
    await prisma.campaignSubmission.update({
      where: { id: submission.id },
      data: {
        metricsSyncStatus: "DISCONNECTED",
        nextMetricsSyncAt: null,
        metricsLastError: tokenResult.reason,
        metricsAuthErrorCount: { increment: 1 },
      } as any,
    });
    return { ok: false, reason: tokenResult.reason };
  }

  if (providerEnum === "YOUTUBE") {
    const scopeStatus = getYouTubeScopeStatus(tokenResult.connection.scope);
    if (!scopeStatus.ready) {
      const reason = "YouTube 필수 권한이 누락되었습니다. 설정에서 계정을 재연결하고 두 권한을 모두 허용해주세요.";
      await prisma.campaignSubmission.update({
        where: { id: submission.id },
        data: {
          metricsSyncStatus: "DISCONNECTED",
          nextMetricsSyncAt: null,
          metricsLastError: reason,
          metricsAuthErrorCount: { increment: 1 },
        } as any,
      });
      return { ok: false, reason };
    }
  }

  try {
    if (!current) {
      if (providerEnum === "YOUTUBE") {
        const parsed = parseSubmissionClipUrl(submission.clipUrl);
        const videoId = platformVideoId ?? parsed?.platformVideoId;
        if (!videoId) throw new Error("YouTube video id could not be resolved");

        const metrics = await fetchYouTubeMetrics(
          tokenResult.accessToken,
          videoId,
          submission.postedAt ?? submission.submittedAt ?? submission.createdAt
        );
        if (metrics.channelId !== connection.providerAccountId) {
          throw new Error("Submitted YouTube video is not owned by connected account");
        }

        current = metrics;
        canonicalUrl = metrics.canonicalUrl;
        platformVideoId = metrics.platformVideoId;
      } else {
        const videoRef = platformVideoId ?? parseSubmissionClipUrl(submission.clipUrl)?.platformVideoId;
        if (!videoRef) throw new Error("Instagram media id/code could not be resolved");

        const metrics = await fetchInstagramMetrics(
          tokenResult.accessToken,
          connection.providerAccountId,
          videoRef
        );

        current = metrics;
        canonicalUrl = metrics.canonicalUrl;
        platformVideoId = metrics.platformVideoId;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "metrics_fetch_failed";
    const reconnectRequired = isReconnectRequiredError(message);
    await prisma.campaignSubmission.update({
      where: { id: submission.id },
      data: {
        metricsSyncStatus: reconnectRequired ? "DISCONNECTED" : "ERROR",
        metricsLastError: message,
        nextMetricsSyncAt: reconnectRequired
          ? null
          : computeNextMetricsSyncAt(submission.submittedAt, now),
        ...(reconnectRequired ? { metricsAuthErrorCount: { increment: 1 } } : {}),
      } as any,
    });
    return { ok: false, reason: message };
  }

  if (!current) {
    return { ok: false, reason: "Metrics payload missing" };
  }

  const previousViews = submission.latestViewCount ?? 0;
  const delta = current.viewCount - previousViews;
  const capturedAt = now;

  await prisma.$transaction(async (tx) => {
    await tx.viewSnapshot.create({
      data: {
        submissionId: submission.id,
        viewCount: current.viewCount,
        likeCount: current.likeCount,
        commentCount: current.commentCount,
        shareCount: current.shareCount,
        reachCount: current.reachCount,
        impressionCount: current.impressionCount,
        saveCount: current.saveCount,
        estimatedMinutesWatched: current.estimatedMinutesWatched,
        averageViewDurationSec: current.averageViewDurationSec,
        averageViewPercentage: current.averageViewPercentage,
        trafficExternalViews: current.trafficExternalViews,
        trafficSearchViews: current.trafficSearchViews,
        trafficSuggestedViews: current.trafficSuggestedViews,
        trafficDirectViews: current.trafficDirectViews,
        delta,
        source: providerEnum === "YOUTUBE" ? "YOUTUBE_API" : "INSTAGRAM_API",
        rawPayload: current.rawPayload as any,
        capturedAt,
      } as any,
    });

    const firstCapture = submission.baselineCapturedAt == null;

    await tx.campaignSubmission.update({
      where: { id: submission.id },
      data: {
        clipUrl: canonicalUrl,
        analyticsProvider: providerEnum,
        platformVideoId,
        linkedSocialConnectionId: connection.id,
        latestViewCount: current.viewCount,
        lastSnapshotAt: capturedAt,
        lastMetricsSyncedAt: capturedAt,
        nextMetricsSyncAt: computeNextMetricsSyncAt(submission.submittedAt, capturedAt),
        metricsSyncStatus: "ACTIVE",
        metricsLastError: null,
        metricsAuthErrorCount: 0,
        postedAt: submission.postedAt ?? current.postedAt ?? null,
        ownershipVerifiedAt: submission.ownershipVerifiedAt ?? capturedAt,
        ...(firstCapture
          ? {
              baselineCapturedAt: capturedAt,
              baselineViewCount: current.viewCount,
              baselineLikeCount: current.likeCount,
              baselineCommentCount: current.commentCount,
            }
          : {}),
      } as any,
    });
  });

  if (platformVideoId) {
    await upsertSocialVideo({
      socialConnectionId: connection.id,
      platformVideoId,
      submissionId: submission.id,
      url: canonicalUrl,
      viewCount: current.viewCount,
      likeCount: current.likeCount,
      commentCount: current.commentCount,
      shareCount: current.shareCount ?? 0,
      publishedAt: current.postedAt,
    });
  }

  const refreshedSubmission = await prisma.campaignSubmission.findUnique({
    where: { id: submission.id },
    include: {
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1,
      },
    },
  });

  return {
    ok: true,
    analytics: buildSubmissionAnalyticsPayload(refreshedSubmission),
  };
}

export function buildSubmissionAnalyticsPayload(submission: (Record<string, unknown> & {
  latestViewCount?: number;
  baselineViewCount?: number | null;
  baselineLikeCount?: number | null;
  baselineCommentCount?: number | null;
  analyticsProvider?: AnalyticsProviderEnum | null;
  metricsSyncStatus?: string | null;
  lastMetricsSyncedAt?: Date | null;
  baselineCapturedAt?: Date | null;
  snapshots?: Array<Record<string, unknown>>;
}) | null): SubmissionAnalyticsPayload {
  const latestSnapshot = submission?.snapshots?.[0] as Record<string, unknown> | undefined;

  const latestViews = toInt(submission?.latestViewCount, 0);
  const latestLikes = toInt(latestSnapshot?.likeCount, toInt(submission?.baselineLikeCount, 0));
  const latestComments = toInt(latestSnapshot?.commentCount, toInt(submission?.baselineCommentCount, 0));

  const baselineViews = toInt(submission?.baselineViewCount, latestViews);
  const baselineLikes = toInt(submission?.baselineLikeCount, latestLikes);
  const baselineComments = toInt(submission?.baselineCommentCount, latestComments);

  const provider = (submission?.analyticsProvider as AnalyticsProviderEnum | null) ?? null;

  const payload: SubmissionAnalyticsPayload = {
    provider,
    current: {
      views: latestViews,
      likes: latestLikes,
      comments: latestComments,
      shares: latestSnapshot ? toInt(latestSnapshot.shareCount, 0) : null,
      reach: latestSnapshot ? toInt(latestSnapshot.reachCount, 0) : null,
      impressions: latestSnapshot ? toInt(latestSnapshot.impressionCount, 0) : null,
      saves: latestSnapshot ? toInt(latestSnapshot.saveCount, 0) : null,
    },
    deltaSinceSubmission: {
      views: latestViews - baselineViews,
      likes: latestLikes - baselineLikes,
      comments: latestComments - baselineComments,
    },
    creatorBreakdown: null,
    syncStatus: (submission?.metricsSyncStatus as string) || "IDLE",
    lastSyncedAt: submission?.lastMetricsSyncedAt instanceof Date ? submission.lastMetricsSyncedAt.toISOString() : null,
    baselineCapturedAt: submission?.baselineCapturedAt instanceof Date ? submission.baselineCapturedAt.toISOString() : null,
    freshnessNote: "Raw counters update faster than retention/source analytics.",
    reconnectRequired: (submission?.metricsSyncStatus as string) === "DISCONNECTED",
  };

  if (provider === "YOUTUBE") {
    payload.creatorBreakdown = {
      platform: "YOUTUBE",
      averageViewDurationSec: latestSnapshot ? toFloat(latestSnapshot.averageViewDurationSec) ?? null : null,
      averageViewPercentage: latestSnapshot ? toFloat(latestSnapshot.averageViewPercentage) ?? null : null,
      estimatedMinutesWatched: latestSnapshot ? toInt(latestSnapshot.estimatedMinutesWatched, 0) : null,
      trafficExternalViews: latestSnapshot ? toInt(latestSnapshot.trafficExternalViews, 0) : null,
      trafficSearchViews: latestSnapshot ? toInt(latestSnapshot.trafficSearchViews, 0) : null,
      trafficSuggestedViews: latestSnapshot ? toInt(latestSnapshot.trafficSuggestedViews, 0) : null,
      trafficDirectViews: latestSnapshot ? toInt(latestSnapshot.trafficDirectViews, 0) : null,
      likeToViewRatio: ratio(latestLikes, latestViews),
      commentToViewRatio: ratio(latestComments, latestViews),
    };
  } else if (provider === "INSTAGRAM") {
    const reach = latestSnapshot ? toInt(latestSnapshot.reachCount, 0) : 0;
    payload.creatorBreakdown = {
      platform: "INSTAGRAM",
      playsOrViews: latestViews,
      reach,
      impressions: latestSnapshot ? toInt(latestSnapshot.impressionCount, 0) : null,
      shares: latestSnapshot ? toInt(latestSnapshot.shareCount, 0) : null,
      saves: latestSnapshot ? toInt(latestSnapshot.saveCount, 0) : null,
      likeToReachRatio: ratio(latestLikes, reach),
      commentToReachRatio: ratio(latestComments, reach),
    };
  }

  return payload;
}
