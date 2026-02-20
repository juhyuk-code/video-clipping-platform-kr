"use client";

import { useState } from "react";
import { cn, formatKRW } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Scissors,
  Megaphone,
  Wallet,
  Search,
  CheckCircle,
  Plus,
  ClipboardList,
  Calendar,
  Eye,
  TrendingUp,
  Clock3,
  ArrowUpRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  MOCK DATA                                                         */
/* ------------------------------------------------------------------ */

const MOCK_CAMPAIGNS = [
  {
    id: "1",
    title: "유튜브 쇼츠 챌린지 캠페인",
    type: "PROJECT",
    status: "ACTIVE",
    deadline: "2026-03-15T00:00:00Z",
    totalBudget: 5000000,
    submissionCount: 23,
  },
  {
    id: "2",
    title: "틱톡 브랜드 리뷰 캠페인",
    type: "REWARD",
    status: "ACTIVE",
    deadline: "2026-04-01T00:00:00Z",
    totalBudget: 2000000,
    submissionCount: 8,
  },
  {
    id: "3",
    title: "인스타 릴스 프로모션",
    type: "HYBRID",
    status: "COMPLETED",
    deadline: "2026-01-20T00:00:00Z",
    totalBudget: 3500000,
    submissionCount: 45,
  },
];

const MOCK_SUBMISSIONS = [
  {
    id: "s1",
    status: "JOINED",
    clipTitle: null,
    totalPaid: 0,
    latestViewCount: 0,
    baselineViewCount: null,
    submittedAt: null,
    updatedAt: "2026-02-20T10:00:00Z",
    lastMetricsSyncedAt: null,
    campaign: {
      id: "1",
      title: "유튜브 쇼츠 챌린지 캠페인",
      type: "PROJECT",
      status: "ACTIVE",
      deadline: "2026-03-15T00:00:00Z",
    },
  },
  {
    id: "s2",
    status: "SUBMITTED",
    clipTitle: "브랜드 리뷰 - 3분 요약",
    totalPaid: 0,
    latestViewCount: 12500,
    baselineViewCount: 8000,
    submittedAt: "2026-02-18T14:30:00Z",
    updatedAt: "2026-02-20T08:00:00Z",
    lastMetricsSyncedAt: "2026-02-20T06:00:00Z",
    campaign: {
      id: "2",
      title: "틱톡 브랜드 리뷰 캠페인",
      type: "REWARD",
      status: "ACTIVE",
      deadline: "2026-04-01T00:00:00Z",
    },
  },
  {
    id: "s3",
    status: "APPROVED",
    clipTitle: "릴스 프로모션 하이라이트",
    totalPaid: 0,
    latestViewCount: 87200,
    baselineViewCount: 15000,
    submittedAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-02-19T12:00:00Z",
    lastMetricsSyncedAt: "2026-02-20T06:00:00Z",
    campaign: {
      id: "3",
      title: "인스타 릴스 프로모션",
      type: "HYBRID",
      status: "ACTIVE",
      deadline: "2026-03-30T00:00:00Z",
    },
  },
  {
    id: "s4",
    status: "PAID",
    clipTitle: "이전 캠페인 클립",
    totalPaid: 350000,
    latestViewCount: 210000,
    baselineViewCount: 5000,
    submittedAt: "2025-12-01T09:00:00Z",
    updatedAt: "2026-01-10T12:00:00Z",
    lastMetricsSyncedAt: "2026-01-10T06:00:00Z",
    campaign: {
      id: "4",
      title: "완료된 브랜드 캠페인",
      type: "REWARD",
      status: "COMPLETED",
      deadline: "2026-01-01T00:00:00Z",
    },
  },
];

/* ------------------------------------------------------------------ */
/*  CONSTANTS (copied from dashboard-client for preview)              */
/* ------------------------------------------------------------------ */

const TYPE_BADGE_CLASSES: Record<string, string> = {
  PROJECT: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  REWARD: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  HYBRID: "border-purple-500/20 bg-purple-500/10 text-purple-400",
};

const TYPE_LABELS: Record<string, string> = {
  PROJECT: "프로젝트형",
  REWARD: "리워드형",
  HYBRID: "하이브리드형",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  DRAFT: "border-border bg-muted text-muted-foreground",
  ACTIVE: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  PAUSED: "border-border bg-muted text-muted-foreground",
  COMPLETED: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  CANCELLED: "border-rose-500/20 bg-rose-500/10 text-rose-400",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "초안",
  ACTIVE: "진행 중",
  PAUSED: "일시정지",
  COMPLETED: "완료",
  CANCELLED: "취소됨",
};

const SUBMISSION_STATUS_BADGE_CLASSES: Record<string, string> = {
  APPLIED: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  APPLICATION_REJECTED: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  JOINED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  WITHDRAWN: "border-border bg-muted text-muted-foreground",
  SUBMITTED: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  IN_REVIEW: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  APPROVED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  REVISION_REQ: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  REJECTED: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  PAID: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
};

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  APPLIED: "지원됨",
  APPLICATION_REJECTED: "지원 거절",
  JOINED: "참여 중",
  WITHDRAWN: "철회",
  SUBMITTED: "제출됨",
  IN_REVIEW: "검토 중",
  APPROVED: "승인됨",
  REVISION_REQ: "수정 요청",
  REJECTED: "거절됨",
  PAID: "정산 완료",
};

const creatorNav = [
  { key: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { key: "myCampaigns", label: "내 캠페인", icon: Megaphone },
  { key: "wallet", label: "지갑", icon: Wallet },
  { key: "messages", label: "메시지", icon: MessageSquare },
  { key: "analytics", label: "분석", icon: BarChart3 },
  { key: "settings", label: "설정", icon: Settings },
];

const clipperNav = [
  { key: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { key: "browseCampaigns", label: "캠페인 찾기", icon: Search },
  { key: "wallet", label: "지갑", icon: Wallet },
  { key: "messages", label: "메시지", icon: MessageSquare },
  { key: "settings", label: "설정", icon: Settings },
];

/* ------------------------------------------------------------------ */
/*  COMPONENTS                                                        */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border/50 hover:border-foreground/20 transition-colors">
      <CardContent className="relative p-5">
        <Icon className="absolute right-5 top-5 h-8 w-8 text-muted-foreground/30" />
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  SIDEBAR PREVIEW                                                   */
/* ------------------------------------------------------------------ */

function PreviewSidebar({ mode }: { mode: "creator" | "clipper" }) {
  const navItems = mode === "creator" ? creatorNav : clipperNav;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border/50 bg-background">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border/50 px-5">
        <Scissors className="h-5 w-5 text-foreground" />
        <span className="text-sm font-semibold tracking-tight text-foreground">
          ClipPlatform
        </span>
      </div>

      {/* Role Indicator */}
      <div className="px-3 pt-3 pb-2">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-full px-3.5 py-2 text-xs font-medium border",
            mode === "creator"
              ? "border-violet-500/20 bg-violet-500/10 text-violet-400"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              mode === "creator" ? "bg-violet-400" : "bg-emerald-400"
            )}
          />
          <span className="font-medium">
            {mode === "creator" ? "크리에이터" : "클리퍼"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2">
        <div className="flex flex-col gap-0.5">
          {navItems.map((item, i) => {
            const isActive = i === 0;
            return (
              <div
                key={item.key}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer",
                  isActive
                    ? "bg-accent/50 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-foreground" />
                )}
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
            );
          })}
        </div>
      </nav>

      {/* User Card */}
      <div className="border-t border-border/50 p-2">
        <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-accent/50 cursor-pointer">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-accent text-xs font-semibold text-foreground">
            JH
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              주혁
            </p>
            <p className="truncate text-xs text-muted-foreground">
              juhyuk@example.com
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-0.5 w-full justify-start gap-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          로그아웃
        </Button>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  CREATOR DASHBOARD PREVIEW                                         */
/* ------------------------------------------------------------------ */

function CreatorDashboardPreview() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            크리에이터 대시보드
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            주혁님, 환영합니다!
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          캠페인 만들기
        </Button>
      </div>

      {/* Bento Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Megaphone} label="진행 중 캠페인" value="2" />
        <StatCard icon={CheckCircle} label="완료된 캠페인" value="1" />
        <StatCard icon={Wallet} label="지갑 잔액" value={formatKRW(1250000)} />
        <StatCard icon={ClipboardList} label="에스크로 보유" value={formatKRW(7000000)} />
      </div>

      {/* Recent Campaigns */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">
              내 캠페인
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
              전체 보기
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y divide-border/50">
            {MOCK_CAMPAIGNS.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between py-3.5 px-1 transition-colors hover:bg-accent/50 rounded-md -mx-1 cursor-pointer"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {campaign.title}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        TYPE_BADGE_CLASSES[campaign.type] ?? "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {TYPE_LABELS[campaign.type]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(campaign.deadline).toLocaleDateString("ko-KR")}
                    </span>
                    <span>{campaign.submissionCount}명 참여</span>
                    {campaign.totalBudget && (
                      <span>{formatKRW(campaign.totalBudget)}</span>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium",
                    STATUS_BADGE_CLASSES[campaign.status] ?? "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {STATUS_LABELS[campaign.status]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CLIPPER DASHBOARD PREVIEW                                         */
/* ------------------------------------------------------------------ */

const ACTION_NEEDED = new Set(["JOINED", "REVISION_REQ"]);
const ACTIVE_TRACKING = new Set(["APPLIED", "SUBMITTED", "IN_REVIEW", "APPROVED"]);
const ARCHIVE = new Set(["PAID", "REJECTED", "APPLICATION_REJECTED", "WITHDRAWN"]);

function ClipperDashboardPreview() {
  const [filter, setFilter] = useState<string | null>(null);

  const actionSubs = MOCK_SUBMISSIONS.filter((s) => ACTION_NEEDED.has(s.status));
  const activeSubs = MOCK_SUBMISSIONS.filter((s) => ACTIVE_TRACKING.has(s.status));
  const archiveSubs = MOCK_SUBMISSIONS.filter((s) => ARCHIVE.has(s.status));

  const showAction = !filter || filter === "action";
  const showActive = !filter || filter === "active";
  const showArchive = !filter || filter === "archive";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            클리퍼 대시보드
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            주혁님, 환영합니다!
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <Search className="h-3.5 w-3.5" />
          캠페인 찾기
        </Button>
      </div>

      {/* Bento Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="참여 중인 캠페인" value="4" />
        <StatCard icon={CheckCircle} label="승인된 클립" value="2" />
        <StatCard icon={TrendingUp} label="총 수익" value={formatKRW(350000)} />
        <StatCard icon={Wallet} label="지갑 잔액" value={formatKRW(350000)} />
      </div>

      {/* Submission Hub */}
      <Card className="border-border/50">
        <CardHeader className="space-y-4 pb-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold text-foreground">
              내 제출 허브
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              모든 캠페인 참여 현황을 한눈에 확인하세요
            </p>
          </div>

          {/* Pill-shaped filter toggles */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: null, label: "전체" },
              { key: "action", label: "액션 필요" },
              { key: "active", label: "진행 중" },
              { key: "archive", label: "보관" },
            ].map((f) => (
              <button
                key={f.key ?? "all"}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.key
                    ? "border-foreground/20 bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-8 pt-0">
          {showAction && (
            <SubmissionSection
              title="액션 필요"
              description="클립 제출이나 수정이 필요한 캠페인"
              submissions={actionSubs}
              section="action"
            />
          )}
          {showActive && (
            <SubmissionSection
              title="진행 중"
              description="현재 추적 중인 제출"
              submissions={activeSubs}
              section="active"
            />
          )}
          {showArchive && (
            <SubmissionSection
              title="보관"
              description="완료되거나 종료된 제출"
              submissions={archiveSubs}
              section="archive"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SubmissionSection({
  title,
  description,
  submissions,
  section,
}: {
  title: string;
  description: string;
  submissions: typeof MOCK_SUBMISSIONS;
  section: string;
}) {
  if (submissions.length === 0) {
    return (
      <div className="space-y-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className={cn(
          "rounded-md border p-3 text-xs",
          section === "action"
            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
            : "border-dashed border-border/50 text-muted-foreground"
        )}>
          {section === "action" ? "모든 작업이 완료되었습니다!" : "항목이 없습니다"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="divide-y divide-border/50">
        {submissions.map((sub) => {
          const delta =
            sub.baselineViewCount !== null
              ? sub.latestViewCount - sub.baselineViewCount
              : null;

          return (
            <div
              key={sub.id}
              className="group py-3.5 px-1 transition-colors hover:bg-accent/50 rounded-md -mx-1 cursor-pointer"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {sub.campaign.title}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        TYPE_BADGE_CLASSES[sub.campaign.type] ?? "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {TYPE_LABELS[sub.campaign.type] ?? sub.campaign.type}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        SUBMISSION_STATUS_BADGE_CLASSES[sub.status] ?? "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {SUBMISSION_STATUS_LABELS[sub.status] ?? sub.status}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {sub.clipTitle
                      ? `클립 제목: ${sub.clipTitle}`
                      : "아직 클립이 제출되지 않았습니다"}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {"현재 조회수 "}
                      {sub.latestViewCount.toLocaleString()}
                    </span>
                    {section === "active" && delta !== null && (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                        {"제출 후 "}
                        {delta >= 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {sub.lastMetricsSyncedAt
                        ? new Date(sub.lastMetricsSyncedAt).toLocaleString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "동기화 전"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                  {Number(sub.totalPaid) > 0 && (
                    <span className="text-xs font-semibold text-emerald-400">
                      {formatKRW(Number(sub.totalPaid))}
                    </span>
                  )}
                  {(sub.status === "JOINED" || sub.status === "REVISION_REQ") && (
                    <Button size="sm" className="h-7 gap-1 text-xs">
                      {sub.status === "JOINED" ? "클립 제출하기" : "수정하기"}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    상세 보기
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground">
                    캠페인 보기
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PREVIEW PAGE                                                 */
/* ------------------------------------------------------------------ */

export default function PreviewPage() {
  const [mode, setMode] = useState<"creator" | "clipper">("creator");

  return (
    <div className="flex min-h-screen bg-background">
      <PreviewSidebar mode={mode} />
      <div className="flex flex-1 flex-col pl-64">
        {/* Header bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 bg-background/95 px-6 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Preview Mode
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMode("creator")}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                mode === "creator"
                  ? "border-violet-500/20 bg-violet-500/10 text-violet-400"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              크리에이터
            </button>
            <button
              onClick={() => setMode("clipper")}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                mode === "clipper"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              클리퍼
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1">
          <div className="mx-auto max-w-7xl p-6">
            {mode === "creator" ? (
              <CreatorDashboardPreview />
            ) : (
              <ClipperDashboardPreview />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
