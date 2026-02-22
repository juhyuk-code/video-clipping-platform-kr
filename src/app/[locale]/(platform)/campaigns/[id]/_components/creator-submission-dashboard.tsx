"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, Film, Inbox, CheckCircle2, Clock3 } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_CREATOR_PLATFORM,
  DEFAULT_CREATOR_QUEUE,
  DEFAULT_CREATOR_SORT,
  DEFAULT_CREATOR_VIEW,
  applyCreatorSubmissionFilters,
  buildCreatorSubmissionCardVM,
  buildQueueCounts,
  deriveTopPerformingVideos,
  parseCreatorPlatformFilterKey,
  parseCreatorQueueKey,
  parseCreatorSortKey,
  type CreatorPlatformFilterKey,
  type CreatorQueueKey,
  type CreatorSortKey,
  type CreatorSubmissionInput,
  type CreatorSubmissionCardVM,
} from "@/lib/campaigns/submission-dashboard";
import { SubmissionPreviewSheet } from "./submission-preview-sheet";
import { SubmissionQueueTabs } from "./submission-queue-tabs";
import { SubmissionVideoCard } from "./submission-video-card";

interface CreatorSubmissionDashboardProps {
  campaignId: string;
  campaignType: string;
  fixedPayPerClip: number | null;
  cprRate: number | null;
  viewBonusRate: number | null;
  submissions: CreatorSubmissionInput[];
}

function getMetricCardTone(queue: CreatorQueueKey) {
  if (queue === "review") return "border-orange-300 bg-orange-50";
  if (queue === "applied") return "border-blue-300 bg-blue-50";
  if (queue === "joined") return "border-indigo-300 bg-indigo-50";
  return "border-zinc-300 bg-zinc-50";
}

export function CreatorSubmissionDashboard({
  campaignId,
  campaignType,
  fixedPayPerClip,
  cprRate,
  viewBonusRate,
  submissions,
}: CreatorSubmissionDashboardProps) {
  const t = useTranslations("campaigns.creatorSubmissionDashboard");
  const tc = useTranslations("campaigns");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedQueue, setSelectedQueue] = useState<CreatorQueueKey>(DEFAULT_CREATOR_QUEUE);
  const [selectedSort, setSelectedSort] = useState<CreatorSortKey>(DEFAULT_CREATOR_SORT);
  const [selectedPlatform, setSelectedPlatform] = useState<CreatorPlatformFilterKey>(DEFAULT_CREATOR_PLATFORM);
  const [previewSubmission, setPreviewSubmission] = useState<CreatorSubmissionCardVM | null>(null);

  const allSubmissionVMs = useMemo(
    () =>
      submissions.map((submission) =>
        buildCreatorSubmissionCardVM(submission, {
          campaignType,
          fixedPayPerClip,
          cprRate,
          viewBonusRate,
        })
      ),
    [submissions, campaignType, fixedPayPerClip, cprRate, viewBonusRate]
  );

  useEffect(() => {
    const queue = parseCreatorQueueKey(searchParams.get("queue"));
    const sort = parseCreatorSortKey(searchParams.get("sort"));
    const platform = parseCreatorPlatformFilterKey(searchParams.get("platform"));

    setSelectedQueue(queue);
    setSelectedSort(sort);
    setSelectedPlatform(platform);
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (params.get("view") !== DEFAULT_CREATOR_VIEW) {
      params.set("view", DEFAULT_CREATOR_VIEW);
      changed = true;
    }

    if (!params.get("queue")) {
      params.set("queue", DEFAULT_CREATOR_QUEUE);
      changed = true;
    }

    if (!params.get("sort")) {
      params.set("sort", DEFAULT_CREATOR_SORT);
      changed = true;
    }

    if (!params.get("platform")) {
      params.set("platform", DEFAULT_CREATOR_PLATFORM);
      changed = true;
    }

    if (changed) {
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [searchParams, pathname, router]);

  function updateQuery(next: {
    queue?: CreatorQueueKey;
    sort?: CreatorSortKey;
    platform?: CreatorPlatformFilterKey;
  }) {
    const nextQueue = next.queue ?? selectedQueue;
    const nextSort = next.sort ?? selectedSort;
    const nextPlatform = next.platform ?? selectedPlatform;

    setSelectedQueue(nextQueue);
    setSelectedSort(nextSort);
    setSelectedPlatform(nextPlatform);

    const params = new URLSearchParams(searchParams.toString());
    params.set("view", DEFAULT_CREATOR_VIEW);
    params.set("queue", nextQueue);
    params.set("sort", nextSort);
    params.set("platform", nextPlatform);

    router.replace(`${pathname}?${params.toString()}`);
  }

  const queueCounts = useMemo(
    () => buildQueueCounts(allSubmissionVMs, selectedPlatform),
    [allSubmissionVMs, selectedPlatform]
  );

  const selectedQueueSubmissions = useMemo(
    () =>
      applyCreatorSubmissionFilters(allSubmissionVMs, {
        queue: selectedQueue,
        sort: selectedSort,
        platform: selectedPlatform,
      }),
    [allSubmissionVMs, selectedQueue, selectedSort, selectedPlatform]
  );

  const topPerformingSubmissions = useMemo(
    () =>
      deriveTopPerformingVideos(allSubmissionVMs, {
        platform: selectedPlatform,
        limit: 10,
      }),
    [allSubmissionVMs, selectedPlatform]
  );

  function getStatusLabel(status: string) {
    try {
      return tc(`submission.status.${status}` as any);
    } catch {
      return status;
    }
  }

  const cardLabels = {
    views: t("cards.views"),
    estPayout: t("cards.estimatedPayout"),
    settledPayout: t("cards.settledPayout"),
    deltaSinceSubmission: t("cards.deltaSinceSubmission"),
    syncedAt: t("cards.syncedAt"),
    notSynced: t("cards.notSynced"),
    disconnected: t("cards.disconnected"),
    submissionDetail: t("cards.submissionDetail"),
    preview: t("cards.preview"),
    approveAdmission: t("actions.approveAdmission"),
    rejectAdmission: t("actions.rejectAdmission"),
    approveSubmission: t("actions.approveSubmission"),
    requestRevision: t("actions.requestRevision"),
    rejectSubmission: t("actions.rejectSubmission"),
    confirmReject: t("actions.confirmReject"),
    cancel: t("actions.cancel"),
    rejectReasonPlaceholder: t("actions.rejectReasonPlaceholder"),
    revisionReasonPlaceholder: t("actions.revisionReasonPlaceholder"),
    applicationRejectedReason: t("cards.applicationRejectedReason"),
    revisionRequestedReason: t("cards.revisionRequestedReason"),
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            {t("operationsSummaryTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => updateQuery({ queue: "applied" })}
              className={`rounded-lg border p-3 text-left transition-colors hover:bg-accent ${selectedQueue === "applied" ? getMetricCardTone("applied") : ""}`}
            >
              <p className="text-xs text-muted-foreground">{t("queue.applied")}</p>
              <p className="mt-1 text-xl font-bold">{queueCounts.applied}</p>
            </button>
            <button
              type="button"
              onClick={() => updateQuery({ queue: "joined" })}
              className={`rounded-lg border p-3 text-left transition-colors hover:bg-accent ${selectedQueue === "joined" ? getMetricCardTone("joined") : ""}`}
            >
              <p className="text-xs text-muted-foreground">{t("queue.joined")}</p>
              <p className="mt-1 text-xl font-bold">{queueCounts.joined}</p>
            </button>
            <button
              type="button"
              onClick={() => updateQuery({ queue: "review" })}
              className={`rounded-lg border p-3 text-left transition-colors hover:bg-accent ${selectedQueue === "review" ? getMetricCardTone("review") : ""}`}
            >
              <p className="text-xs text-muted-foreground">{t("queue.review")}</p>
              <p className="mt-1 text-xl font-bold">{queueCounts.review}</p>
            </button>
            <button
              type="button"
              onClick={() => updateQuery({ queue: "closed" })}
              className={`rounded-lg border p-3 text-left transition-colors hover:bg-accent ${selectedQueue === "closed" ? getMetricCardTone("closed") : ""}`}
            >
              <p className="text-xs text-muted-foreground">{t("queue.closed")}</p>
              <p className="mt-1 text-xl font-bold">{queueCounts.closed}</p>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Film className="h-4 w-4" />
              {t("topPerforming.title")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t("topPerforming.subtitle")}</p>
          </div>
        </CardHeader>
        <CardContent>
          {topPerformingSubmissions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              {t("empty.topPerforming")}
            </div>
          ) : (
            <div className="flex snap-x gap-4 overflow-x-auto pb-2">
              {topPerformingSubmissions.map((submission) => (
                <div key={submission.id} className="snap-start">
                  <SubmissionVideoCard
                    campaignId={campaignId}
                    submission={submission}
                    rank={submission.rank}
                    variant="top"
                    showActions
                    labels={cardLabels}
                    statusLabel={getStatusLabel}
                    onOpenPreview={setPreviewSubmission}
                    onMutated={() => router.refresh()}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            <CardTitle className="text-base">{t("inbox.title")}</CardTitle>
          </div>
          <SubmissionQueueTabs
            selectedQueue={selectedQueue}
            selectedSort={selectedSort}
            selectedPlatform={selectedPlatform}
            queueCounts={queueCounts}
            onQueueChange={(queue) => updateQuery({ queue })}
            onSortChange={(sort) => updateQuery({ sort })}
            onPlatformChange={(platform) => updateQuery({ platform })}
            labels={{
              queueApplied: t("queue.applied"),
              queueJoined: t("queue.joined"),
              queueReview: t("queue.review"),
              queueClosed: t("queue.closed"),
              sortLabel: t("controls.sort"),
              sortLatest: t("sort.latest"),
              sortViews: t("sort.views"),
              sortPayout: t("sort.payout"),
              platformLabel: t("controls.platform"),
              platformAll: t("platform.all"),
              platformYouTube: t("platform.youtube"),
              platformInstagram: t("platform.instagram"),
              platformTikTok: t("platform.tiktok"),
            }}
          />
        </CardHeader>
        <CardContent>
          {selectedQueueSubmissions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              {selectedQueue === "applied" && t("empty.applied")}
              {selectedQueue === "joined" && t("empty.joined")}
              {selectedQueue === "review" && t("empty.review")}
              {selectedQueue === "closed" && t("empty.closed")}
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {selectedQueueSubmissions.map((submission) => (
                <SubmissionVideoCard
                  key={submission.id}
                  campaignId={campaignId}
                  submission={submission}
                  variant="queue"
                  showActions
                  labels={cardLabels}
                  statusLabel={getStatusLabel}
                  onOpenPreview={setPreviewSubmission}
                  onMutated={() => router.refresh()}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SubmissionPreviewSheet
        open={Boolean(previewSubmission)}
        onClose={() => setPreviewSubmission(null)}
        submission={previewSubmission}
        title={t("previewSheet.title")}
        noClipTitle={t("previewSheet.noClipTitle")}
        noClipDescription={t("previewSheet.noClipDescription")}
        openOriginalLabel={t("previewSheet.openOriginal")}
        unsupportedEmbedDescription={t("previewSheet.unsupportedEmbed")}
      />
    </div>
  );
}
