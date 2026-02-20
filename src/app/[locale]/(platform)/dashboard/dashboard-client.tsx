"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMode } from "@/contexts/mode-context";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatKRW } from "@/lib/utils";
import {
  Megaphone,
  CheckCircle,
  Wallet,
  Plus,
  ClipboardList,
  Calendar,
  Eye,
  TrendingUp,
  Search,
  Clock3,
  ArrowUpRight,
} from "lucide-react";

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

const ACTION_NEEDED_STATUSES = new Set(["JOINED", "REVISION_REQ"]);
const ACTIVE_TRACKING_STATUSES = new Set(["APPLIED", "SUBMITTED", "IN_REVIEW", "APPROVED"]);
const ARCHIVE_STATUSES = new Set(["PAID", "REJECTED", "APPLICATION_REJECTED", "WITHDRAWN"]);

type SubmissionSectionKey = "action" | "active" | "archive";

interface CreatorCampaignSummary {
  id: string;
  title: string;
  type: string;
  status: string;
  deadline: string;
  totalBudget: number | null;
  submissionCount: number;
}

interface ClipperSubmissionSummary {
  id: string;
  status: string;
  clipTitle: string | null;
  totalPaid: number;
  latestViewCount: number;
  baselineViewCount: number | null;
  submittedAt: string | null;
  updatedAt: string;
  lastMetricsSyncedAt: string | null;
  campaign: {
    id: string;
    title: string;
    type: string;
    status: string;
    deadline: string;
  };
}

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

function safeTranslate(
  t: (key: string, values?: Record<string, string | number | Date>) => string,
  key: string,
  fallback: string,
  values?: Record<string, string | number | Date>
) {
  try {
    return t(key, values);
  } catch {
    return fallback;
  }
}

function formatDateTime(isoDate: string, locale: string) {
  const localeCode = locale === "ko" ? "ko-KR" : "en-US";
  return new Date(isoDate).toLocaleString(localeCode, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseSectionFilter(section: string | null): SubmissionSectionKey | null {
  if (section === "action" || section === "active" || section === "archive") {
    return section;
  }
  return null;
}

interface Props {
  userName: string;
  initialTab: string | null;
  initialSection: string | null;
  data: {
    activeCampaigns: number;
    completedCampaigns: number;
    mySubmissions: number;
    approvedSubmissions: number;
    walletBalance: number;
    totalEarned: number;
    escrowHeld: number;
    recentCreatorCampaigns: CreatorCampaignSummary[];
    clipperSubmissions: ClipperSubmissionSummary[];
  };
}

export function DashboardClient({ userName, data, initialTab, initialSection }: Props) {
  const { mode } = useMode();

  if (mode === "creator") return <CreatorDashboard userName={userName} data={data} />;
  return (
    <ClipperDashboard
      userName={userName}
      data={data}
      initialTab={initialTab}
      initialSection={initialSection}
    />
  );
}

function CreatorDashboard({
  userName,
  data,
}: Pick<Props, "userName" | "data">) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            크리에이터 대시보드
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {userName}님, 환영합니다!
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            캠페인 만들기
          </Button>
        </Link>
      </div>

      {/* Bento Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Megaphone} label="진행 중 캠페인" value={String(data.activeCampaigns)} />
        <StatCard icon={CheckCircle} label="완료된 캠페인" value={String(data.completedCampaigns)} />
        <StatCard icon={Wallet} label="지갑 잔액" value={formatKRW(data.walletBalance)} />
        <StatCard icon={ClipboardList} label="에스크로 보유" value={formatKRW(data.escrowHeld)} />
      </div>

      {/* Recent Campaigns */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">
              내 캠페인
            </CardTitle>
            <Link href="/campaigns">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                전체 보기
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {data.recentCreatorCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Megaphone className="mb-4 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                아직 캠페인이 없습니다
              </p>
              <Link href="/campaigns/new" className="mt-4">
                <Button variant="outline" size="sm" className="gap-2 border-border/50">
                  <Plus className="h-3.5 w-3.5" />
                  캠페인 만들기
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {data.recentCreatorCampaigns.map((campaign) => (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                  <div className="flex items-center justify-between py-3.5 px-1 transition-colors hover:bg-accent/50 rounded-md -mx-1">
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
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClipperDashboard({
  userName,
  data,
  initialTab,
  initialSection,
}: Pick<Props, "userName" | "data" | "initialTab" | "initialSection">) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("campaigns");
  const locale = useLocale();
  const router = useRouter();
  const sectionFilter = parseSectionFilter(initialSection);

  useEffect(() => {
    if (initialTab && initialTab !== "submissions") {
      router.replace("/dashboard?tab=submissions");
    }
  }, [initialTab, router]);

  const actionNeededSubmissions = data.clipperSubmissions.filter((submission) =>
    ACTION_NEEDED_STATUSES.has(submission.status)
  );

  const activeTrackingSubmissions = data.clipperSubmissions.filter((submission) =>
    ACTIVE_TRACKING_STATUSES.has(submission.status)
  );

  const archiveSubmissions = data.clipperSubmissions.filter((submission) =>
    ARCHIVE_STATUSES.has(submission.status)
  );

  const shouldShowActionSection = !sectionFilter || sectionFilter === "action";
  const shouldShowActiveSection = !sectionFilter || sectionFilter === "active";
  const shouldShowArchiveSection =
    sectionFilter === "archive" || (!sectionFilter && archiveSubmissions.length > 0);

  function getCampaignTypeLabel(type: string) {
    return safeTranslate(
      tc as (key: string, values?: Record<string, string | number | Date>) => string,
      `type.${type}`,
      TYPE_LABELS[type] ?? type
    );
  }

  function getSubmissionStatusLabel(status: string) {
    return safeTranslate(
      tc as (key: string, values?: Record<string, string | number | Date>) => string,
      `submission.status.${status}`,
      status
    );
  }

  function getSectionBaseHref() {
    return "/dashboard?tab=submissions";
  }

  function renderSubmissionRow(submission: ClipperSubmissionSummary, section: SubmissionSectionKey) {
    const detailHref = `/campaigns/${submission.campaign.id}/submissions/${submission.id}`;
    const campaignHref = `/campaigns/${submission.campaign.id}`;
    const deltaSinceSubmission = submission.baselineViewCount !== null
      ? submission.latestViewCount - submission.baselineViewCount
      : null;
    const syncReference = submission.lastMetricsSyncedAt ?? submission.updatedAt;
    const syncLabel = submission.lastMetricsSyncedAt
      ? safeTranslate(
        t as (key: string, values?: Record<string, string | number | Date>) => string,
        "submissionHub.syncedAt",
        `동기화 ${formatDateTime(syncReference, locale)}`,
        { time: formatDateTime(syncReference, locale) }
      )
      : safeTranslate(
        t as (key: string, values?: Record<string, string | number | Date>) => string,
        "submissionHub.updatedAt",
        `업데이트 ${formatDateTime(syncReference, locale)}`,
        { time: formatDateTime(syncReference, locale) }
      );

    const urgencyCta =
      submission.status === "JOINED"
        ? t("submissionHub.cta.submitClip")
        : submission.status === "REVISION_REQ"
          ? t("submissionHub.cta.resubmitClip")
          : null;

    return (
      <div
        key={submission.id}
        className="group py-3.5 px-1 transition-colors hover:bg-accent/50 rounded-md -mx-1 cursor-pointer"
        onClick={() => router.push(detailHref)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            router.push(detailHref);
          }
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                {submission.campaign.title}
              </p>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  TYPE_BADGE_CLASSES[submission.campaign.type] ?? "border-border bg-muted text-muted-foreground"
                )}
              >
                {getCampaignTypeLabel(submission.campaign.type)}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  SUBMISSION_STATUS_BADGE_CLASSES[submission.status] ?? "border-border bg-muted text-muted-foreground"
                )}
              >
                {getSubmissionStatusLabel(submission.status)}
              </span>
            </div>

            <div className="text-xs text-muted-foreground">
              {submission.clipTitle
                ? `${t("submissionHub.clipTitleLabel")}: ${submission.clipTitle}`
                : t("submissionHub.noClipTitle")}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {safeTranslate(
                  t as (key: string, values?: Record<string, string | number | Date>) => string,
                  "submissionHub.currentViews",
                  "현재 조회수 {count}",
                  { count: submission.latestViewCount.toLocaleString() }
                )}
              </span>

              {section === "active" && deltaSinceSubmission !== null && (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  {safeTranslate(
                    t as (key: string, values?: Record<string, string | number | Date>) => string,
                    "submissionHub.deltaSinceSubmission",
                    "제출 후 {count}",
                    {
                      count:
                        deltaSinceSubmission >= 0
                          ? `+${deltaSinceSubmission.toLocaleString()}`
                          : deltaSinceSubmission.toLocaleString(),
                    }
                  )}
                </span>
              )}

              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {syncLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            {Number(submission.totalPaid) > 0 && (
              <span className="text-xs font-semibold text-emerald-400">
                {formatKRW(Number(submission.totalPaid))}
              </span>
            )}

            {urgencyCta && (
              <Link href={detailHref} onClick={(event) => event.stopPropagation()}>
                <Button size="sm" className="h-7 gap-1 text-xs">
                  {urgencyCta}
                </Button>
              </Link>
            )}

            <Link href={detailHref} onClick={(event) => event.stopPropagation()}>
              <Button
                variant={urgencyCta ? "outline" : "default"}
                size="sm"
                className="h-7 text-xs"
              >
                {t("submissionHub.cta.viewSubmissionDetail")}
              </Button>
            </Link>

            <Link
              href={campaignHref}
              onClick={(event) => event.stopPropagation()}
            >
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground">
                {t("submissionHub.cta.viewCampaign")}
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function renderSection(options: {
    key: SubmissionSectionKey;
    title: string;
    description: string;
    submissions: ClipperSubmissionSummary[];
    emptyState: React.ReactNode;
  }) {
    return (
      <div className="space-y-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">{options.title}</h3>
          <p className="text-xs text-muted-foreground">{options.description}</p>
        </div>

        {options.submissions.length === 0 ? (
          options.emptyState
        ) : (
          <div className="divide-y divide-border/50">
            {options.submissions.map((submission) => renderSubmissionRow(submission, options.key))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t("clipperDashboard")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {safeTranslate(t as (key: string, values?: Record<string, string | number | Date>) => string, "welcome", `${userName}님, 환영합니다!`, { name: userName })}
          </p>
        </div>
        <Link href="/campaigns">
          <Button size="sm" className="gap-2">
            <Search className="h-3.5 w-3.5" />
            {t("browseMarketplace")}
          </Button>
        </Link>
      </div>

      {/* Bento Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label={t("submissionHub.stats.participatingCampaigns")} value={String(data.mySubmissions)} />
        <StatCard icon={CheckCircle} label={t("submissionHub.stats.approvedClips")} value={String(data.approvedSubmissions)} />
        <StatCard icon={TrendingUp} label={t("submissionHub.stats.totalEarnings")} value={formatKRW(data.totalEarned)} />
        <StatCard icon={Wallet} label={t("submissionHub.stats.walletBalance")} value={formatKRW(data.walletBalance)} />
      </div>

      {/* Submission Hub */}
      <Card className="border-border/50">
        <CardHeader className="space-y-4 pb-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold text-foreground">
              {t("submissionHub.title")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("submissionHub.description")}
            </p>
          </div>

          {/* Pill-shaped filter toggles */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={getSectionBaseHref()}>
              <button
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  !sectionFilter
                    ? "border-foreground/20 bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {t("submissionHub.filters.all")}
              </button>
            </Link>
            <Link href={`${getSectionBaseHref()}&section=action`}>
              <button
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  sectionFilter === "action"
                    ? "border-foreground/20 bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {t("submissionHub.section.action.title")}
              </button>
            </Link>
            <Link href={`${getSectionBaseHref()}&section=active`}>
              <button
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  sectionFilter === "active"
                    ? "border-foreground/20 bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {t("submissionHub.section.active.title")}
              </button>
            </Link>
            <Link href={`${getSectionBaseHref()}&section=archive`}>
              <button
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  sectionFilter === "archive"
                    ? "border-foreground/20 bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {t("submissionHub.section.archive.title")}
              </button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 pt-0">
          {shouldShowActionSection &&
            renderSection({
              key: "action",
              title: t("submissionHub.section.action.title"),
              description: t("submissionHub.section.action.description"),
              submissions: actionNeededSubmissions,
              emptyState: (
                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-400">
                  {t("submissionHub.empty.action")}
                </div>
              ),
            })}

          {shouldShowActiveSection &&
            renderSection({
              key: "active",
              title: t("submissionHub.section.active.title"),
              description: t("submissionHub.section.active.description"),
              submissions: activeTrackingSubmissions,
              emptyState: (
                <div className="rounded-md border border-dashed border-border/50 p-6 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t("submissionHub.empty.active")}
                  </p>
                  <Link href="/campaigns" className="mt-3 inline-block">
                    <Button variant="outline" size="sm" className="gap-2 border-border/50 text-xs">
                      <Search className="h-3 w-3" />
                      {t("submissionHub.cta.findCampaigns")}
                    </Button>
                  </Link>
                </div>
              ),
            })}

          {shouldShowArchiveSection &&
            renderSection({
              key: "archive",
              title: t("submissionHub.section.archive.title"),
              description: t("submissionHub.section.archive.description"),
              submissions: archiveSubmissions,
              emptyState: (
                <div className="rounded-md border border-dashed border-border/50 p-3 text-xs text-muted-foreground">
                  {t("submissionHub.empty.archive")}
                </div>
              ),
            })}
        </CardContent>
      </Card>
    </div>
  );
}
