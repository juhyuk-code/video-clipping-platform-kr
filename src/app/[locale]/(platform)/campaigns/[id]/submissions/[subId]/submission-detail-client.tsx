"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
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
  Briefcase,
  Shield,
  MessageSquare,
  Wrench,
  Globe,
  Sparkles,
  ChevronRight,
  Youtube,
  Instagram,
} from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { ProfileFull, type ProfileData } from "@/components/profile/profile-content";
import { ViewChart } from "@/components/charts/view-chart";
import { StatsGrid } from "@/components/charts/stats-grid";
import {
  calculateEstimatedEarnings,
  calculateViewVelocity,
  snapshotsToChartData,
} from "@/lib/earnings";

// ─── Constants ───────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  APPLIED: "지원 중",
  JOINED: "참여 중",
  SUBMITTED: "제출됨",
  IN_REVIEW: "검토 중",
  APPROVED: "승인됨",
  REVISION_REQ: "수정 요청",
  REJECTED: "반려됨",
  PAID: "지급 완료",
};

const STATUS_COLORS: Record<string, string> = {
  APPLIED: "bg-blue-50 text-blue-700 border-blue-200",
  JOINED: "bg-indigo-50 text-indigo-700 border-indigo-200",
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
  snapshots: {
    viewCount: number;
    capturedAt: string;
  }[];
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

// ─── Component ───────────────────────────────────────────────

export function SubmissionDetailClient({ submission: sub }: { submission: SubmissionData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const canReview = sub.isCreator && ["SUBMITTED", "IN_REVIEW"].includes(sub.status);
  const clipperName = sub.clipper.nickname ?? sub.clipper.name ?? "사용자";
  const hasClip = !!sub.clipUrl || !!sub.clipFileUrl;
  const campaignType = sub.campaign.type;

  const kp = sub.clipper.clipperProfile;
  const profileData = sub.clipperProfile;
  const portfolioItems = profileData?.clipperProfile?.portfolioItems ?? [];
  const socialConnections = profileData?.socialConnections ?? [];

  // Derived data
  const chartData = snapshotsToChartData(sub.snapshots);
  const velocity = calculateViewVelocity(sub.snapshots);
  const earnings = calculateEstimatedEarnings(
    campaignType,
    sub.latestViewCount,
    sub.campaign.fixedPayPerClip,
    sub.campaign.cprRate,
    sub.campaign.viewBonusRate
  );

  // ─── Handlers ────────────────────────────────────────────

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
      setShowRevisionForm(false);
      setRevisionNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────

  return (
    <>
      {/* Profile Sheet (full profile slide-in) */}
      <Sheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title={`${clipperName}의 프로필`}
      >
        <ProfileFull profile={sub.clipperProfile} />
      </Sheet>

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
              <button
                onClick={() => setProfileOpen(true)}
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
              </button>

              {/* Name + Bio + Badges */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setProfileOpen(true)}
                    className="text-lg font-bold hover:text-primary transition-colors"
                  >
                    {clipperName}
                  </button>
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

            {/* Stats row */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="flex items-center justify-center gap-1 text-lg font-bold">
                  {kp?.averageRating ? (
                    <>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {kp.averageRating.toFixed(1)}
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">평균 평점</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-lg font-bold">{kp?.totalProjectsCompleted ?? 0}</p>
                <p className="text-xs text-muted-foreground">완료 캠페인</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-lg font-bold">{profileData._count?.reviewsReceived ?? 0}</p>
                <p className="text-xs text-muted-foreground">받은 리뷰</p>
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

          {/* Expand CTA */}
          <div className="border-t px-5 py-3">
            <button
              onClick={() => setProfileOpen(true)}
              className="flex w-full items-center justify-center gap-1 rounded-lg border bg-background py-2 text-sm font-medium text-primary transition-colors hover:bg-accent"
            >
              전체 프로필 보기
              <ChevronRight className="h-4 w-4" />
            </button>
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
                <a
                  href={sub.clipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  클립 보기
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
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {sub.isCreator ? "클립 성과 분석" : "내 클립 성과"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">조회수 추이</p>
                  <ViewChart data={chartData} height={200} />
                </div>

                <StatsGrid
                  stats={[
                    {
                      label: "총 조회수",
                      value: `${sub.latestViewCount.toLocaleString()}회`,
                    },
                    {
                      label: "일평균 증가",
                      value: velocity > 0 ? `+${velocity.toLocaleString()}/일` : "-",
                      color: velocity > 0 ? "text-green-600" : undefined,
                    },
                    campaignType === "PROJECT"
                      ? {
                          label: "게시 플랫폼",
                          value: sub.targetPlatform?.replace("_", " ") ?? "-",
                        }
                      : {
                          label: sub.isCreator ? "예상 지급액" : "예상 수익",
                          value: formatKRW(earnings.total),
                          color: "text-primary",
                        },
                  ]}
                />

                {/* Earnings breakdown — REWARD */}
                {campaignType === "REWARD" && (
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm font-medium">
                      {sub.isCreator ? "지급 예정 금액" : "예상 수익 금액"}
                    </p>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-mono">
                        {sub.latestViewCount.toLocaleString()} ÷ 1,000 × {formatKRW(sub.campaign.cprRate ?? 0)}
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
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
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
                          {sub.latestViewCount.toLocaleString()} ÷ 1,000 × {formatKRW(sub.campaign.viewBonusRate ?? 0)}
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

          {/* ─── 리뷰 (creator only) ─── */}
          {canReview && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle>리뷰</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showRevisionForm ? (
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
                      onClick={() => setShowRevisionForm(true)}
                      disabled={loading}
                    >
                      <RotateCcw className="h-4 w-4" />
                      수정 요청
                    </Button>
                    <Button
                      variant="destructive"
                      className="gap-2"
                      onClick={() => setShowRevisionForm(true)}
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
                      placeholder="사유를 입력해주세요..."
                      rows={3}
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleReview("REVISION_REQ")}
                        disabled={loading || !revisionNotes.trim()}
                      >
                        <RotateCcw className="h-4 w-4" />
                        수정 요청
                      </Button>
                      <Button
                        variant="destructive"
                        className="gap-2"
                        onClick={() => handleReview("REJECTED")}
                        disabled={loading || !revisionNotes.trim()}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        반려
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => { setShowRevisionForm(false); setRevisionNotes(""); }}
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
                  isLast={!sub.submittedAt && !sub.reviewedAt && !sub.paidAt}
                  active
                />
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
