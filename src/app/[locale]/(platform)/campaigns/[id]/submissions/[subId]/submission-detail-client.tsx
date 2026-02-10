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
} from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { ProfileSummary, ProfileFull, type ProfileData } from "@/components/profile/profile-content";
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

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  APPLIED: "outline",
  JOINED: "secondary",
  SUBMITTED: "default",
  IN_REVIEW: "secondary",
  APPROVED: "default",
  REVISION_REQ: "destructive",
  REJECTED: "destructive",
  PAID: "outline",
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
      {/* Profile Sheet */}
      <Sheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title={`${clipperName}의 프로필`}
      >
        <ProfileFull profile={sub.clipperProfile} />
      </Sheet>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">
            {sub.isCreator ? (
              <>
                <button
                  onClick={() => setProfileOpen(true)}
                  className="hover:underline hover:text-primary transition-colors"
                >
                  {clipperName}
                </button>
                의 지원서
              </>
            ) : "내 지원 현황"}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">{sub.campaign.title}</p>
            <Badge
              variant="outline"
              className={`text-xs ${CAMPAIGN_TYPE_COLORS[campaignType] ?? ""}`}
            >
              {CAMPAIGN_TYPE_LABELS[campaignType] ?? campaignType}
            </Badge>
          </div>
        </div>
        <Badge variant={STATUS_COLORS[sub.status]} className="text-sm">
          {STATUS_LABELS[sub.status]}
        </Badge>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ═══ Main content ═══ */}
        <div className="lg:col-span-2 space-y-6">

          {/* ─── 지원 정보 ─── */}
          <Card>
            <CardHeader>
              <CardTitle>지원 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sub.pitch && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">지원 메시지</p>
                  <p className="whitespace-pre-wrap text-sm">{sub.pitch}</p>
                </div>
              )}
              {sub.proposedPrice != null && sub.proposedPrice > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">제안 금액</p>
                  <p className="text-sm font-medium">{formatKRW(sub.proposedPrice)}</p>
                </div>
              )}
              <div className="flex gap-4 text-sm text-muted-foreground">
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
            </CardContent>
          </Card>

          {/* ─── 제출된 클립 ─── */}
          {sub.clipUrl && (
            <Card>
              <CardHeader>
                <CardTitle>제출된 클립</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sub.clipTitle && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">클립 제목</p>
                    <p className="text-sm">{sub.clipTitle}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">클립 URL</p>
                  <a
                    href={sub.clipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {sub.clipUrl}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                {sub.targetPlatform && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">게시 플랫폼</p>
                    <Badge variant="outline">{sub.targetPlatform.replace("_", " ")}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── 성과 분석 ─── */}
          {hasClip && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {sub.isCreator ? "클립 성과 분석" : "내 클립 성과"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Chart */}
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">조회수 추이</p>
                  <ViewChart data={chartData} height={200} />
                </div>

                {/* Stats */}
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
                    {/* Progress bar */}
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
              <CardHeader>
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
              <CardHeader>
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
            <Card>
              <CardHeader>
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

        {/* ═══ Sidebar ═══ */}
        <div className="space-y-6">

          {/* ─── Clipper profile ─── */}
          <ProfileSummary
            profile={sub.clipperProfile}
            onExpand={() => setProfileOpen(true)}
          />

          {/* ─── 보상 구조 ─── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
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
              {/* Rate formula */}
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

              {/* Target platforms */}
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5" />
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
            <CardHeader>
              <CardTitle>타임라인</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <TimelineItem label="지원" date={sub.createdAt} active />
                {sub.submittedAt && (
                  <TimelineItem label="클립 제출" date={sub.submittedAt} active />
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
                    active
                  />
                )}
                {sub.paidAt && (
                  <TimelineItem label="정산 완료" date={sub.paidAt} active />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// ─── Timeline helper ─────────────────────────────────────────

function TimelineItem({ label, date, active }: { label: string; date: string; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-2.5 w-2.5 rounded-full ${active ? "bg-primary" : "bg-muted"}`} />
      <div className="flex flex-1 justify-between">
        <span className={active ? "font-medium" : "text-muted-foreground"}>{label}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(date).toLocaleDateString("ko-KR")}
        </span>
      </div>
    </div>
  );
}
