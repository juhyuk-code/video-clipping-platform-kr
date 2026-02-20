"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Eye,
  Calendar,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Film,
  Wallet,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Coins,
  Star,
  Shield,
  MessageSquare,
  Wrench,
  Globe,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Youtube,
  Instagram,
} from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { type ProfileData } from "@/components/profile/profile-content";
import { ViewChart } from "@/components/charts/view-chart";
import { StatsGrid } from "@/components/charts/stats-grid";
import { ClipEmbed, getClipEmbedInfo } from "@/components/ui/clip-embed";
import {
  calculateEstimatedEarnings,
  calculateRangeGrowth,
} from "@/lib/earnings";
import type { SubmissionAnalyticsPayload } from "@/lib/social/submission-analytics";
import {
  buildFullBucketedSeries,
  clampWindowStart,
  type ChartRangePreset,
  getDefaultWindowStart,
  getPresetWindowSize,
  getRangeBucketUnitLabel,
} from "@/lib/analytics/chart-intervals";

// ─── Constants ───────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  APPLIED: "지원 중",
  APPLICATION_REJECTED: "지원 반려",
  JOINED: "참여 중",
  WITHDRAWN: "철회됨",
  SUBMITTED: "제출됨",
  IN_REVIEW: "검토 중",
  APPROVED: "승인됨",
  REVISION_REQ: "수정 요청",
  REJECTED: "반려됨",
  PAID: "지급 완료",
};

const STATUS_COLORS: Record<string, string> = {
  APPLIED: "bg-blue-50 text-blue-700 border-blue-200",
  APPLICATION_REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  JOINED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  WITHDRAWN: "bg-zinc-50 text-zinc-700 border-zinc-200",
  SUBMITTED: "bg-purple-50 text-purple-700 border-purple-200",
  IN_REVIEW: "bg-orange-50 text-orange-700 border-orange-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  REVISION_REQ: "bg-yellow-50 text-yellow-700 border-yellow-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  PROJECT: "프로젝트형",
  REWARD: "리워드형",
  HYBRID: "하이브리드형",
};

const CAMPAIGN_TYPE_COLORS: Record<string, string> = {
  PROJECT: "bg-violet-100 text-violet-700 border-violet-200",
  REWARD: "bg-emerald-100 text-emerald-700 border-emerald-200",
  HYBRID: "bg-amber-100 text-amber-700 border-amber-200",
};

const RANGE_PRESETS: Array<{ key: ChartRangePreset; label: string }> = [
  { key: "2H", label: "2h" },
  { key: "24H", label: "24h" },
  { key: "7D", label: "7d" },
  { key: "ALL", label: "전체" },
];

const MIN_REVIEW_REASON_LENGTH = 5;

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  BRONZE: { label: "브론즈", color: "bg-orange-100 text-orange-700 border-orange-200" },
  SILVER: { label: "실버", color: "bg-gray-100 text-gray-600 border-gray-200" },
  GOLD: { label: "골드", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  PLATINUM: { label: "플래티넘", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  DIAMOND: { label: "다이아", color: "bg-blue-100 text-blue-700 border-blue-200" },
};

// ─── Icons ───────────────────────────────────────────────────

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.72a8.27 8.27 0 0 0 4.85 1.56V6.83a4.82 4.82 0 0 1-1.09-.14Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SOCIAL_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  YOUTUBE: { icon: Youtube, label: "YouTube", color: "text-red-600" },
  INSTAGRAM: { icon: Instagram, label: "Instagram", color: "text-pink-600" },
  TIKTOK: { icon: TikTokIcon, label: "TikTok", color: "text-foreground" },
  TWITTER: { icon: XIcon, label: "X", color: "text-foreground" },
};

// ─── Types ───────────────────────────────────────────────────

interface SubmissionData {
  id: string;
  status: string;
  pitch: string | null;
  proposedPrice: number | null;
  clipTitle: string | null;
  clipUrl: string | null;
  clipFileUrl: string | null;
  thumbnailUrl: string | null;
  targetPlatform: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  revisionNotes: string | null;
  revisionCount: number;
  applicationDecisionNotes: string | null;
  applicationReviewedAt: string | null;
  joinedAt: string | null;
  withdrawnAt: string | null;
  latestViewCount: number;
  fixedAmount: number | null;
  rewardAmount: number | null;
  totalPaid: number;
  paidAt: string | null;
  createdAt: string;
  campaign: {
    id: string;
    title: string;
    type: string;
    status: string;
    guidelines: string;
    fixedPayPerClip: number | null;
    cprRate: number | null;
    viewBonusRate: number | null;
    totalBudget: number | null;
    targetPlatforms: string[];
  };
  clipper: {
    id: string;
    nickname: string | null;
    name: string | null;
    image: string | null;
    bio: string | null;
    clipperProfile: {
      editingTools: string[];
      specializations: string[];
      languages: string[];
      tier: string;
      isVerified: boolean;
      averageRating: number | null;
      totalProjectsCompleted: number;
    } | null;
  };
  clipperProfile: ProfileData;
  clipperStats: {
    totalSubmissions: number;
    approvedCount: number;
    approvalRate: number | null;
    totalViewsGenerated: number;
    activeCampaigns: number;
  };
  snapshots: {
    viewCount: number;
    likeCount: number | null;
    commentCount: number | null;
    capturedAt: string;
  }[];
  snapshotTotalCount: number;
  snapshotLoadedCount: number;
  historyTruncated: boolean;
  analytics: SubmissionAnalyticsPayload;
  isCreator: boolean;
  isClipper: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatViewsCompact(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

function formatDelta(value: number, suffix = "회"): string {
  if (value > 0) return `+${value.toLocaleString()}${suffix}`;
  if (value < 0) return `${value.toLocaleString()}${suffix}`;
  return `0${suffix}`;
}

function getDeltaColor(value: number): string {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-red-600";
  return "text-foreground";
}

function getRelativeDuration(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days}일`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월`;
  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  return remainMonths > 0 ? `${years}년 ${remainMonths}개월` : `${years}년`;
}

// ─── Component ───────────────────────────────────────────────

export function SubmissionDetailClient({ submission: sub }: { submission: SubmissionData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refreshingMetrics, setRefreshingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<"REVISION_REQ" | "REJECTED" | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showAdmissionRejectForm, setShowAdmissionRejectForm] = useState(false);
  const [admissionRejectReason, setAdmissionRejectReason] = useState("");
  const [selectedRange, setSelectedRange] = useState<ChartRangePreset>("24H");
  const [windowStartIndex, setWindowStartIndex] = useState(0);
  const [showAdvancedBreakdown, setShowAdvancedBreakdown] = useState(false);
  const previousPresetRef = useRef<ChartRangePreset | null>(null);
  const canAdmit = sub.isCreator && sub.status === "APPLIED";
  const canReview = sub.isCreator && ["SUBMITTED", "IN_REVIEW"].includes(sub.status);
  const clipperName = sub.clipper.nickname ?? sub.clipper.name ?? "사용자";
  const hasClip = !!sub.clipUrl || !!sub.clipFileUrl;
  const clipEmbedInfo = sub.clipUrl ? getClipEmbedInfo(sub.clipUrl) : null;
  const campaignType = sub.campaign.type;

  const kp = sub.clipper.clipperProfile;
  const profileData = sub.clipperProfile;
  const portfolioItems = profileData?.clipperProfile?.portfolioItems ?? [];
  const socialConnections = profileData?.socialConnections ?? [];

  // Derived data
  const bucketedSeries = useMemo(
    () => buildFullBucketedSeries(sub.snapshots, selectedRange, "ko"),
    [sub.snapshots, selectedRange]
  );
  const windowSize = useMemo(
    () => getPresetWindowSize(selectedRange, bucketedSeries.length),
    [selectedRange, bucketedSeries.length]
  );

  useEffect(() => {
    if (bucketedSeries.length <= 0 || windowSize <= 0) {
      setWindowStartIndex(0);
      previousPresetRef.current = selectedRange;
      return;
    }

    setWindowStartIndex((current) => {
      if (selectedRange === "ALL") {
        previousPresetRef.current = selectedRange;
        return 0;
      }

      if (previousPresetRef.current !== selectedRange) {
        previousPresetRef.current = selectedRange;
        return getDefaultWindowStart(bucketedSeries.length, windowSize);
      }

      return clampWindowStart(current, bucketedSeries.length, windowSize);
    });
  }, [selectedRange, bucketedSeries.length, windowSize]);

  const visibleStartIndex = selectedRange === "ALL"
    ? 0
    : clampWindowStart(windowStartIndex, bucketedSeries.length, windowSize);
  const visibleEndIndex = bucketedSeries.length > 0
    ? Math.min(bucketedSeries.length - 1, visibleStartIndex + Math.max(0, windowSize - 1))
    : -1;

  const visibleSeries = useMemo(() => {
    if (bucketedSeries.length === 0 || visibleEndIndex < visibleStartIndex) return [];
    return bucketedSeries.slice(visibleStartIndex, visibleEndIndex + 1);
  }, [bucketedSeries, visibleStartIndex, visibleEndIndex]);

  const chartData = useMemo(
    () => bucketedSeries.map((point) => ({
      date: point.bucketStart,
      label: point.label,
      fullLabel: point.fullLabel,
      views: point.views,
    })),
    [bucketedSeries]
  );

  const rangeGrowth = calculateRangeGrowth(visibleSeries);
  const selectedRangeDelta = rangeGrowth.delta;
  const averagePerBucketDelta = rangeGrowth.averagePerBucket;
  const bucketUnitLabel = getRangeBucketUnitLabel(selectedRange, "ko");
  const analytics = sub.analytics;
  const currentViews = analytics.current.views;
  const currentLikes = analytics.current.likes;
  const currentComments = analytics.current.comments;
  const submissionDelta = analytics.deltaSinceSubmission.views;
  const earnings = calculateEstimatedEarnings(
    campaignType,
    currentViews,
    sub.campaign.fixedPayPerClip,
    sub.campaign.cprRate,
    sub.campaign.viewBonusRate
  );
  const syncBadge =
    analytics.reconnectRequired
      ? { label: "재연결 필요", className: "border-amber-300 bg-amber-50 text-amber-700" }
      : analytics.syncStatus === "ERROR"
        ? { label: "동기화 오류", className: "border-red-300 bg-red-50 text-red-700" }
        : analytics.syncStatus === "ACTIVE"
          ? { label: "동기화 활성", className: "border-emerald-300 bg-emerald-50 text-emerald-700" }
          : { label: "동기화 대기", className: "border-zinc-300 bg-zinc-50 text-zinc-700" };

  // ─── Handlers ────────────────────────────────────────────

  async function handleAdmission(decision: "ACCEPT" | "REJECT") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/campaigns/${sub.campaign.id}/submissions/${sub.id}/admission`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            reason: decision === "REJECT" ? admissionRejectReason : undefined,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "오류가 발생했습니다");
      }
      router.refresh();
      setShowAdmissionRejectForm(false);
      setAdmissionRejectReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(status: "APPROVED" | "REVISION_REQ" | "REJECTED") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/campaigns/${sub.campaign.id}/submissions/${sub.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            revisionNotes: status !== "APPROVED" ? revisionNotes : undefined,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "오류가 발생했습니다");
      }
      router.refresh();
      setPendingDecision(null);
      setRevisionNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshMetrics() {
    setRefreshingMetrics(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/campaigns/${sub.campaign.id}/submissions/${sub.id}/metrics/refresh`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "메트릭 갱신에 실패했습니다.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "메트릭 갱신에 실패했습니다.");
    } finally {
      setRefreshingMetrics(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          HEADER: Campaign context + Status
          ══════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground">{sub.campaign.title}</p>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">
              {sub.isCreator ? `${clipperName}의 지원서` : "내 지원 현황"}
            </h1>
            <Badge
              variant="outline"
              className={`text-xs ${CAMPAIGN_TYPE_COLORS[campaignType] ?? ""}`}
            >
              {CAMPAIGN_TYPE_LABELS[campaignType] ?? campaignType}
            </Badge>
          </div>
        </div>
        <div
          className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${STATUS_COLORS[sub.status] ?? ""}`}
        >
          {STATUS_LABELS[sub.status]}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          CLIPPER HERO SECTION (Creator view only)
          Full-width, prominent — the first thing creators see
          ══════════════════════════════════════════════════════ */}
      {sub.isCreator && (
        <div className="rounded-xl border bg-card shadow-sm">
          {/* Top: Identity + Stats */}
          <div className="p-5 pb-4">
            <div className="flex gap-4">
              {/* Avatar */}
              <Link
                href={`/profile/${sub.clipper.id}`}
                className="shrink-0 transition-transform hover:scale-105"
              >
                {sub.clipper.image ? (
                  <img
                    src={sub.clipper.image}
                    alt={clipperName}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground ring-2 ring-primary/20">
                    {getInitials(clipperName)}
                  </div>
                )}
              </Link>

              {/* Name + Bio + Badges */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/profile/${sub.clipper.id}`}
                    className="text-lg font-bold hover:text-primary transition-colors"
                  >
                    {clipperName}
                  </Link>
                  {kp?.tier && kp.tier !== "BRONZE" && (
                    <Badge variant="outline" className={`text-xs ${TIER_LABELS[kp.tier]?.color ?? ""}`}>
                      {TIER_LABELS[kp.tier]?.label ?? kp.tier}
                    </Badge>
                  )}
                  {kp?.isVerified && (
                    <Badge className="gap-1 bg-blue-500 text-xs text-white">
                      <Shield className="h-3 w-3" /> 인증
                    </Badge>
                  )}
                </div>
                {sub.clipper.bio && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {sub.clipper.bio}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  <Calendar className="mr-1 inline h-3 w-3" />
                  {new Date(profileData.createdAt).toLocaleDateString("ko")} 가입
                </p>
              </div>
            </div>

            {/* Stats — Row 1: Trust signals */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                <p className="flex items-center justify-center gap-1 text-base font-bold">
                  {kp?.averageRating ? (
                    <>
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      {kp.averageRating.toFixed(1)}
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">평균 평점</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                <p className={`text-base font-bold ${sub.clipperStats.approvalRate !== null && sub.clipperStats.approvalRate >= 70 ? "text-green-600" : ""}`}>
                  {sub.clipperStats.approvalRate !== null ? `${sub.clipperStats.approvalRate}%` : "-"}
                </p>
                <p className="text-[11px] text-muted-foreground">승인율</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                <p className="text-base font-bold">{kp?.totalProjectsCompleted ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">완료 캠페인</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                <p className="text-base font-bold">{profileData._count?.reviewsReceived ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">받은 리뷰</p>
              </div>
            </div>

            {/* Stats — Row 2: Capability signals */}
            <div className="mt-2 grid grid-cols-4 gap-2">
              <div className="rounded-lg border p-2.5 text-center">
                <p className="text-base font-bold">
                  {sub.clipperStats.totalViewsGenerated > 0
                    ? `${formatViewsCompact(sub.clipperStats.totalViewsGenerated)}회`
                    : "-"}
                </p>
                <p className="text-[11px] text-muted-foreground">총 조회수</p>
              </div>
              <div className="rounded-lg border p-2.5 text-center">
                <p className="text-base font-bold">
                  {portfolioItems.length > 0
                    ? `${formatViewsCompact(Math.round(portfolioItems.reduce((s, p) => s + (p.viewCount ?? 0), 0) / portfolioItems.length))}회`
                    : "-"}
                </p>
                <p className="text-[11px] text-muted-foreground">클립 평균 조회</p>
              </div>
              <div className="rounded-lg border p-2.5 text-center">
                <p className="text-base font-bold">
                  {getRelativeDuration(profileData.createdAt)}
                </p>
                <p className="text-[11px] text-muted-foreground">활동 기간</p>
              </div>
              <div className="rounded-lg border p-2.5 text-center">
                <p className={`text-base font-bold ${sub.clipperStats.activeCampaigns >= 3 ? "text-orange-600" : ""}`}>
                  {sub.clipperStats.activeCampaigns}개
                </p>
                <p className="text-[11px] text-muted-foreground">진행 중</p>
              </div>
            </div>
          </div>

          {/* Skills tags */}
          {kp && (kp.specializations.length > 0 || kp.editingTools.length > 0 || kp.languages.length > 0) && (
            <div className="border-t px-5 py-3">
              <div className="flex flex-wrap gap-1.5">
                {kp.specializations.map((s) => (
                  <Badge key={`spec-${s}`} variant="secondary" className="text-xs">
                    <Sparkles className="mr-1 h-3 w-3" />{s}
                  </Badge>
                ))}
                {kp.editingTools.map((t) => (
                  <Badge key={`tool-${t}`} variant="outline" className="text-xs">
                    <Wrench className="mr-1 h-3 w-3" />{t}
                  </Badge>
                ))}
                {kp.languages.map((l) => (
                  <Badge key={`lang-${l}`} variant="outline" className="text-xs">
                    <Globe className="mr-1 h-3 w-3" />{l}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Social connections */}
          {socialConnections.length > 0 && (
            <div className="border-t px-5 py-3">
              <div className="flex flex-wrap gap-2">
                {socialConnections.map((sc) => {
                  const info = SOCIAL_ICONS[sc.provider];
                  const Icon = info?.icon || Globe;
                  return (
                    <a
                      key={sc.provider}
                      href={sc.profileUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                    >
                      <Icon className={`h-3.5 w-3.5 ${info?.color ?? ""}`} />
                      {sc.displayName || sc.username || info?.label}
                      {sc.followerCount != null && (
                        <span className="text-muted-foreground">
                          {sc.followerCount.toLocaleString()}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Portfolio preview */}
          {portfolioItems.length > 0 && (
            <div className="border-t px-5 py-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                포트폴리오
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {portfolioItems.slice(0, 3).map((item) => (
                  <a
                    key={item.id}
                    href={item.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-accent"
                  >
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="h-12 w-16 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-muted">
                        <Film className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-primary">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.platform}</span>
                        {item.viewCount != null && (
                          <span className="flex items-center gap-0.5">
                            <Eye className="h-3 w-3" />
                            {item.viewCount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              {portfolioItems.length > 3 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  +{portfolioItems.length - 3}개 더
                </p>
              )}
            </div>
          )}

          {/* Full profile link */}
          <div className="border-t px-5 py-3">
            <Link
              href={`/profile/${sub.clipper.id}`}
              className="flex w-full items-center justify-center gap-1 rounded-lg border bg-background py-2 text-sm font-medium text-primary transition-colors hover:bg-accent"
            >
              전체 프로필 보기
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MAIN CONTENT: Two-column grid
          ══════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ═══ Left column (2/3) ═══ */}
        <div className="lg:col-span-2 space-y-6">

          {/* ─── 지원 내용 ─── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                지원 내용
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pitch message — the clipper's "sales pitch" */}
              {sub.pitch && (
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{sub.pitch}</p>
                </div>
              )}
              {!sub.pitch && (
                <p className="text-sm text-muted-foreground italic">지원 메시지가 없습니다</p>
              )}

              {/* Price + dates row */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                {sub.proposedPrice != null && sub.proposedPrice > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border bg-primary/5 px-4 py-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">제안 금액</p>
                      <p className="text-sm font-bold text-primary">{formatKRW(sub.proposedPrice)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    지원일: {new Date(sub.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                  {sub.submittedAt && (
                    <span className="flex items-center gap-1">
                      <Film className="h-3.5 w-3.5" />
                      제출일: {new Date(sub.submittedAt).toLocaleDateString("ko-KR")}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ─── 제출된 클립 ─── */}
          {sub.clipUrl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5" />
                  제출된 클립
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sub.clipTitle && (
                  <p className="font-medium">{sub.clipTitle}</p>
                )}
                {clipEmbedInfo ? (
                  <ClipEmbed clipUrl={sub.clipUrl} title={sub.clipTitle ?? "Submitted Clip"} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    이 링크는 임베드를 지원하지 않아 외부 링크로 열어야 합니다.
                  </p>
                )}
                <a
                  href={sub.clipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  원본 링크 열기
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {sub.targetPlatform && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">게시 플랫폼:</span>
                    <Badge variant="outline" className="text-xs">
                      {sub.targetPlatform.replace("_", " ")}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── 성과 분석 ─── */}
          {hasClip && (
            <Card>
              <CardHeader className="space-y-3 pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      {sub.isCreator ? "클립 성과 분석" : "내 클립 성과"}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={syncBadge.className}>
                        {syncBadge.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {analytics.lastSyncedAt
                          ? `마지막 동기화: ${new Date(analytics.lastSyncedAt).toLocaleString("ko-KR")}`
                          : "아직 동기화된 분석 데이터가 없습니다."}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={handleRefreshMetrics}
                    disabled={refreshingMetrics || analytics.reconnectRequired}
                  >
                    <RotateCcw className={`h-3.5 w-3.5 ${refreshingMetrics ? "animate-spin" : ""}`} />
                    {refreshingMetrics ? "갱신 중..." : "메트릭 갱신"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{analytics.freshnessNote}</p>
                {analytics.reconnectRequired && (
                  <div className="rounded-md border border-amber-400/70 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    소셜 계정 토큰이 만료되었습니다.{" "}
                    <Link href="/settings" className="underline underline-offset-2">
                      설정
                    </Link>
                    에서 계정을 다시 연결해주세요.
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {RANGE_PRESETS.map((preset) => (
                    <Button
                      key={preset.key}
                      type="button"
                      size="sm"
                      variant={selectedRange === preset.key ? "secondary" : "outline"}
                      onClick={() => setSelectedRange(preset.key)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                {sub.isCreator ? (
                  <StatsGrid
                    columns={4}
                    stats={[
                      {
                        label: "현재 조회수",
                        value: `${currentViews.toLocaleString()}회`,
                      },
                      {
                        label: "제출 후 증가",
                        value: formatDelta(submissionDelta),
                        color: getDeltaColor(submissionDelta),
                        sub: `선택 구간 ${formatDelta(selectedRangeDelta)}`,
                      },
                      analytics.provider === "YOUTUBE" && analytics.creatorBreakdown?.platform === "YOUTUBE"
                        ? {
                            label: "좋아요/조회 비율",
                            value: analytics.creatorBreakdown.likeToViewRatio != null
                              ? `${(analytics.creatorBreakdown.likeToViewRatio * 100).toFixed(2)}%`
                              : "-",
                          }
                        : {
                            label: "좋아요/도달 비율",
                            value: analytics.provider === "INSTAGRAM" && analytics.creatorBreakdown?.platform === "INSTAGRAM" && analytics.creatorBreakdown.likeToReachRatio != null
                              ? `${(analytics.creatorBreakdown.likeToReachRatio * 100).toFixed(2)}%`
                              : "-",
                          },
                      analytics.provider === "YOUTUBE" && analytics.creatorBreakdown?.platform === "YOUTUBE"
                        ? {
                            label: "댓글/조회 비율",
                            value: analytics.creatorBreakdown.commentToViewRatio != null
                              ? `${(analytics.creatorBreakdown.commentToViewRatio * 100).toFixed(2)}%`
                              : "-",
                          }
                        : {
                            label: "댓글/도달 비율",
                            value: analytics.provider === "INSTAGRAM" && analytics.creatorBreakdown?.platform === "INSTAGRAM" && analytics.creatorBreakdown.commentToReachRatio != null
                              ? `${(analytics.creatorBreakdown.commentToReachRatio * 100).toFixed(2)}%`
                              : "-",
                          },
                    ]}
                  />
                ) : (
                  <StatsGrid
                    columns={4}
                    stats={[
                      {
                        label: "현재 조회수",
                        value: `${currentViews.toLocaleString()}회`,
                      },
                      {
                        label: "제출 후 증가 (선택 구간)",
                        value: formatDelta(selectedRangeDelta),
                        color: getDeltaColor(selectedRangeDelta),
                        sub: `누적 ${formatDelta(submissionDelta)}`,
                      },
                      {
                        label: "좋아요",
                        value: currentLikes.toLocaleString(),
                      },
                      {
                        label: "댓글",
                        value: currentComments.toLocaleString(),
                      },
                    ]}
                  />
                )}

                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">조회수 추이</p>
                    <p className="text-xs text-muted-foreground">
                      버킷 간격: {bucketUnitLabel}
                    </p>
                  </div>
                  <ViewChart
                    data={chartData}
                    visibleStartIndex={visibleStartIndex}
                    visibleEndIndex={visibleEndIndex}
                    onVisibleRangeChange={setWindowStartIndex}
                    bucketUnitLabel={bucketUnitLabel}
                    hideSlider={selectedRange === "ALL"}
                    height={184}
                  />
                  {selectedRange === "ALL" && sub.historyTruncated && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      전체 구간은 최근 {sub.snapshotLoadedCount.toLocaleString()}개 스냅샷 기준입니다.
                      (총 {sub.snapshotTotalCount.toLocaleString()}개)
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/20 p-3.5">
                    <p className="text-xs text-muted-foreground">선택 구간 증가</p>
                    <p className={`mt-1 text-xl font-semibold ${getDeltaColor(selectedRangeDelta)}`}>
                      {formatDelta(selectedRangeDelta)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3.5">
                    <p className="text-xs text-muted-foreground">구간 평균 증가</p>
                    <p className={`mt-1 text-xl font-semibold ${getDeltaColor(averagePerBucketDelta)}`}>
                      {averagePerBucketDelta > 0 ? "+" : ""}{averagePerBucketDelta.toLocaleString()} / {bucketUnitLabel}
                    </p>
                  </div>
                </div>

                {sub.isCreator && (
                  <div className="rounded-lg border bg-muted/20">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                      onClick={() => setShowAdvancedBreakdown((prev) => !prev)}
                    >
                      <p className="text-sm font-medium">고급 플랫폼 분석</p>
                      {showAdvancedBreakdown ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    {showAdvancedBreakdown && (
                      <div className="space-y-4 border-t px-4 py-3 text-sm">
                        {analytics.provider === "YOUTUBE" && analytics.creatorBreakdown?.platform === "YOUTUBE" && (
                          <div className="space-y-3">
                            <p className="font-medium">YouTube 상세 분석</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">평균 시청 시간</span>
                                <span>{analytics.creatorBreakdown.averageViewDurationSec != null ? `${Math.round(analytics.creatorBreakdown.averageViewDurationSec)}초` : "-"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">평균 유지율</span>
                                <span>{analytics.creatorBreakdown.averageViewPercentage != null ? `${analytics.creatorBreakdown.averageViewPercentage.toFixed(2)}%` : "-"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">총 시청 시간</span>
                                <span>{analytics.creatorBreakdown.estimatedMinutesWatched != null ? `${analytics.creatorBreakdown.estimatedMinutesWatched.toLocaleString()}분` : "-"}</span>
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">유입: 외부</span>
                                <span>{analytics.creatorBreakdown.trafficExternalViews?.toLocaleString() ?? "-"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">유입: 검색</span>
                                <span>{analytics.creatorBreakdown.trafficSearchViews?.toLocaleString() ?? "-"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">유입: 추천</span>
                                <span>{analytics.creatorBreakdown.trafficSuggestedViews?.toLocaleString() ?? "-"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">유입: 직접/기타</span>
                                <span>{analytics.creatorBreakdown.trafficDirectViews?.toLocaleString() ?? "-"}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {analytics.provider === "INSTAGRAM" && analytics.creatorBreakdown?.platform === "INSTAGRAM" && (
                          <div className="space-y-3">
                            <p className="font-medium">Instagram 상세 분석</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">플레이/조회</span>
                                <span>{analytics.creatorBreakdown.playsOrViews.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">도달</span>
                                <span>{analytics.creatorBreakdown.reach?.toLocaleString() ?? "-"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">노출</span>
                                <span>{analytics.creatorBreakdown.impressions?.toLocaleString() ?? "-"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">공유 + 저장</span>
                                <span>{((analytics.creatorBreakdown.shares ?? 0) + (analytics.creatorBreakdown.saves ?? 0)).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Earnings breakdown — REWARD */}
                {campaignType === "REWARD" && (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <p className="text-sm font-medium">
                      {sub.isCreator ? "지급 예정 금액" : "예상 수익 금액"}
                    </p>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-mono">
                        {currentViews.toLocaleString()} ÷ 1,000 × {formatKRW(sub.campaign.cprRate ?? 0)}
                      </span>
                      <span className="mx-2">=</span>
                      <span className="font-bold text-foreground">{formatKRW(earnings.viewBased)}</span>
                    </div>
                    {sub.campaign.totalBudget && sub.campaign.totalBudget > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{sub.isCreator ? "예산 소진율" : "수익 달성율"}</span>
                          <span>
                            {formatKRW(earnings.total)} / {formatKRW(sub.campaign.totalBudget)}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{
                              width: `${Math.min(100, (earnings.total / sub.campaign.totalBudget) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Earnings breakdown — HYBRID */}
                {campaignType === "HYBRID" && (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <p className="text-sm font-medium">
                      {sub.isCreator ? "예상 지급 내역" : "예상 수익 내역"}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">고정 금액</span>
                        <span className="font-medium">{formatKRW(earnings.fixed)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">뷰 보너스</span>
                        <span className="font-medium">{formatKRW(earnings.viewBased)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono">
                          {currentViews.toLocaleString()} ÷ 1,000 × {formatKRW(sub.campaign.viewBonusRate ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">예상 합계</span>
                        <span className="font-bold text-primary">{formatKRW(earnings.total)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── 수정 요청 사항 ─── */}
          {sub.revisionNotes && (
            <Card className="border-yellow-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <AlertCircle className="h-5 w-5" />
                  {sub.status === "REJECTED" ? "반려 사유" : "수정 요청 사항"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{sub.revisionNotes}</p>
                {sub.revisionCount > 1 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    수정 요청 횟수: {sub.revisionCount}회
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {sub.applicationDecisionNotes && sub.status === "APPLICATION_REJECTED" && (
            <Card className="border-red-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertCircle className="h-5 w-5" />
                  지원 반려 사유
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{sub.applicationDecisionNotes}</p>
              </CardContent>
            </Card>
          )}

          {/* ─── 정산 정보 ─── */}
          {sub.totalPaid > 0 && (
            <Card className="border-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Wallet className="h-5 w-5" />
                  {sub.isCreator ? "지급 완료" : "수령 완료"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {sub.fixedAmount != null && sub.fixedAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">고정 금액</span>
                    <span className="font-medium">{formatKRW(sub.fixedAmount)}</span>
                  </div>
                )}
                {sub.rewardAmount != null && sub.rewardAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">리워드 금액</span>
                    <span className="font-medium">{formatKRW(sub.rewardAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">{sub.isCreator ? "총 지급액" : "총 수령액"}</span>
                  <span className="font-bold text-green-600">{formatKRW(sub.totalPaid)}</span>
                </div>
                {sub.paidAt && (
                  <p className="text-xs text-muted-foreground">
                    {sub.isCreator ? "지급일" : "수령일"}: {new Date(sub.paidAt).toLocaleDateString("ko-KR")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── 지원 심사 (creator only) ─── */}
          {canAdmit && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle>지원 심사</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showAdmissionRejectForm ? (
                  <div className="flex gap-3">
                    <Button
                      className="gap-2"
                      onClick={() => handleAdmission("ACCEPT")}
                      disabled={loading}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      지원 승인
                    </Button>
                    <Button
                      variant="destructive"
                      className="gap-2"
                      onClick={() => setShowAdmissionRejectForm(true)}
                      disabled={loading}
                    >
                      <ThumbsDown className="h-4 w-4" />
                      지원 반려
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      value={admissionRejectReason}
                      onChange={(e) => setAdmissionRejectReason(e.target.value)}
                      placeholder="지원 반려 사유를 입력해주세요 (최소 5자)"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">사유는 최소 5자 이상 입력해야 합니다.</p>
                    <div className="flex gap-3">
                      <Button
                        variant="destructive"
                        className="gap-2"
                        onClick={() => handleAdmission("REJECT")}
                        disabled={loading || admissionRejectReason.trim().length < MIN_REVIEW_REASON_LENGTH}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        반려 확정
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => { setShowAdmissionRejectForm(false); setAdmissionRejectReason(""); }}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── 리뷰 (creator only) ─── */}
          {canReview && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle>리뷰</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!pendingDecision ? (
                  <div className="flex gap-3">
                    <Button
                      className="gap-2"
                      onClick={() => handleReview("APPROVED")}
                      disabled={loading}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      승인
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => setPendingDecision("REVISION_REQ")}
                      disabled={loading}
                    >
                      <RotateCcw className="h-4 w-4" />
                      수정 요청
                    </Button>
                    <Button
                      variant="destructive"
                      className="gap-2"
                      onClick={() => setPendingDecision("REJECTED")}
                      disabled={loading}
                    >
                      <ThumbsDown className="h-4 w-4" />
                      반려
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      placeholder={
                        pendingDecision === "REJECTED"
                          ? "반려 사유를 입력해주세요 (최소 5자)"
                          : "수정 요청 사항을 입력해주세요 (최소 5자)"
                      }
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">사유는 최소 5자 이상 입력해야 합니다.</p>
                    <div className="flex gap-3">
                      <Button
                        variant={pendingDecision === "REJECTED" ? "destructive" : "outline"}
                        className="gap-2"
                        onClick={() => pendingDecision && handleReview(pendingDecision)}
                        disabled={loading || revisionNotes.trim().length < MIN_REVIEW_REASON_LENGTH}
                      >
                        {pendingDecision === "REJECTED" ? <ThumbsDown className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                        {pendingDecision === "REJECTED" ? "반려 확정" : "수정 요청 보내기"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => { setPendingDecision(null); setRevisionNotes(""); }}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ═══ Right column (1/3) — Deal details ═══ */}
        <div className="space-y-6">

          {/* ─── 보상 구조 ─── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  보상 구조
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs ${CAMPAIGN_TYPE_COLORS[campaignType] ?? ""}`}
                >
                  {CAMPAIGN_TYPE_LABELS[campaignType] ?? campaignType}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground">보상 공식</p>
                <p className="mt-1 text-sm font-semibold">
                  {campaignType === "PROJECT" && (
                    <>클립당 고정 {formatKRW(sub.campaign.fixedPayPerClip ?? 0)}</>
                  )}
                  {campaignType === "REWARD" && (
                    <>1,000뷰당 {formatKRW(sub.campaign.cprRate ?? 0)}</>
                  )}
                  {campaignType === "HYBRID" && (
                    <>
                      고정 {formatKRW(sub.campaign.fixedPayPerClip ?? 0)} + 1,000뷰당 {formatKRW(sub.campaign.viewBonusRate ?? 0)}
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">타겟 플랫폼</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {sub.campaign.targetPlatforms.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs">
                      {p.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ─── 수익 요약 (REWARD & HYBRID only) ─── */}
          {(campaignType === "REWARD" || campaignType === "HYBRID") && hasClip && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" />
                  {sub.isCreator ? "지급 요약" : "수익 요약"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">현재 조회수</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Eye className="h-3.5 w-3.5" />
                    {sub.latestViewCount.toLocaleString()}회
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {sub.isCreator ? "예상 지급액" : "예상 수익"}
                  </span>
                  <span className="font-bold text-primary">{formatKRW(earnings.total)}</span>
                </div>
                {sub.totalPaid > 0 && (
                  <>
                    <div className="border-t" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {sub.isCreator ? "실제 지급액" : "실제 수령액"}
                      </span>
                      <span className="font-bold text-green-600">{formatKRW(sub.totalPaid)}</span>
                    </div>
                    {sub.paidAt && (
                      <p className="text-xs text-muted-foreground">
                        {sub.isCreator ? "지급일" : "수령일"}: {new Date(sub.paidAt).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── 타임라인 ─── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">타임라인</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0">
                <TimelineItem
                  label="지원"
                  date={sub.createdAt}
                  isFirst
                  isLast={
                    !sub.applicationReviewedAt &&
                    !sub.joinedAt &&
                    !sub.withdrawnAt &&
                    !sub.submittedAt &&
                    !sub.reviewedAt &&
                    !sub.paidAt
                  }
                  active
                />
                {sub.applicationReviewedAt && (
                  <TimelineItem
                    label={sub.status === "APPLICATION_REJECTED" ? "지원 반려" : "지원 승인"}
                    date={sub.applicationReviewedAt}
                    isLast={!sub.joinedAt && !sub.withdrawnAt && !sub.submittedAt && !sub.reviewedAt && !sub.paidAt}
                    active
                    variant={sub.status === "APPLICATION_REJECTED" ? "destructive" : "success"}
                  />
                )}
                {sub.joinedAt && !sub.applicationReviewedAt && (
                  <TimelineItem
                    label="참여 확정"
                    date={sub.joinedAt}
                    isLast={!sub.withdrawnAt && !sub.submittedAt && !sub.reviewedAt && !sub.paidAt}
                    active
                    variant="success"
                  />
                )}
                {sub.withdrawnAt && (
                  <TimelineItem
                    label="지원 철회"
                    date={sub.withdrawnAt}
                    isLast={!sub.submittedAt && !sub.reviewedAt && !sub.paidAt}
                    active
                    variant="warning"
                  />
                )}
                {sub.submittedAt && (
                  <TimelineItem
                    label="클립 제출"
                    date={sub.submittedAt}
                    isLast={!sub.reviewedAt && !sub.paidAt}
                    active
                  />
                )}
                {sub.reviewedAt && (
                  <TimelineItem
                    label={
                      sub.status === "APPROVED" || sub.status === "PAID"
                        ? "승인"
                        : sub.status === "REJECTED"
                          ? "반려"
                          : "수정 요청"
                    }
                    date={sub.reviewedAt}
                    isLast={!sub.paidAt}
                    active
                    variant={sub.status === "REJECTED" ? "destructive" : sub.status === "REVISION_REQ" ? "warning" : "default"}
                  />
                )}
                {sub.paidAt && (
                  <TimelineItem
                    label="정산 완료"
                    date={sub.paidAt}
                    isLast
                    active
                    variant="success"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// ─── Improved Timeline ────────────────────────────────────────

function TimelineItem({
  label,
  date,
  active,
  isFirst,
  isLast,
  variant = "default",
}: {
  label: string;
  date: string;
  active: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  variant?: "default" | "destructive" | "warning" | "success";
}) {
  const dotColors = {
    default: "bg-primary",
    destructive: "bg-red-500",
    warning: "bg-yellow-500",
    success: "bg-green-500",
  };

  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-[5px] top-[14px] h-full w-px bg-border" />
      )}
      {/* Dot */}
      <div className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${
        active ? dotColors[variant] : "border-2 border-muted-foreground/30 bg-background"
      }`} />
      {/* Content */}
      <div className="flex flex-1 justify-between pb-1">
        <span className={`text-sm ${active ? "font-medium" : "text-muted-foreground"}`}>
          {label}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(date).toLocaleDateString("ko-KR")}
        </span>
      </div>
    </div>
  );
}
