"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Film, ThumbsDown, ThumbsUp, RotateCcw, Play, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatKRW } from "@/lib/utils";
import type { CreatorSubmissionCardVM } from "@/lib/campaigns/submission-dashboard";

const MIN_REVIEW_REASON_LENGTH = 5;

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  APPLIED: "outline",
  APPLICATION_REJECTED: "destructive",
  JOINED: "secondary",
  WITHDRAWN: "outline",
  SUBMITTED: "default",
  IN_REVIEW: "secondary",
  APPROVED: "default",
  REVISION_REQ: "destructive",
  REJECTED: "destructive",
  PAID: "outline",
};

interface SubmissionVideoCardProps {
  campaignId: string;
  campaignWorkflow: "LEGACY_CLIPPER_PUBLISH" | "CREATOR_PUBLISH";
  submission: CreatorSubmissionCardVM;
  rank?: number;
  variant: "top" | "queue";
  showActions?: boolean;
  labels: {
    views: string;
    estPayout: string;
    settledPayout: string;
    deltaSinceSubmission: string;
    syncedAt: string;
    notSynced: string;
    disconnected: string;
    submissionDetail: string;
    preview: string;
    approveAdmission: string;
    rejectAdmission: string;
    approveSubmission: string;
    requestRevision: string;
    rejectSubmission: string;
    confirmReject: string;
    cancel: string;
    rejectReasonPlaceholder: string;
    revisionReasonPlaceholder: string;
    applicationRejectedReason: string;
    revisionRequestedReason: string;
  };
  statusLabel: (status: string) => string;
  onOpenPreview: (submission: CreatorSubmissionCardVM) => void;
  onMutated: () => void;
}

function formatDateTime(dateStr: string, locale: string) {
  const localeCode = locale === "ko" ? "ko-KR" : "en-US";
  return new Date(dateStr).toLocaleString(localeCode, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SubmissionVideoCard({
  campaignId,
  campaignWorkflow,
  submission,
  rank,
  variant,
  showActions = true,
  labels,
  statusLabel,
  onOpenPreview,
  onMutated,
}: SubmissionVideoCardProps) {
  const router = useRouter();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdmissionRejectForm, setShowAdmissionRejectForm] = useState(false);
  const [admissionRejectReason, setAdmissionRejectReason] = useState("");
  const [pendingReviewDecision, setPendingReviewDecision] = useState<"REVISION_REQ" | "REJECTED" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [showPublicationForm, setShowPublicationForm] = useState(false);
  const [publicationUrl, setPublicationUrl] = useState(submission.clipUrl ?? "");

  const clipperName = submission.clipper.nickname ?? submission.clipper.name ?? "Unknown";
  const canAdmit = submission.status === "APPLIED";
  const canReview = submission.status === "SUBMITTED" || submission.status === "IN_REVIEW";
  const canLinkPublication =
    campaignWorkflow === "CREATOR_PUBLISH" &&
    (submission.status === "APPROVED" || submission.status === "PAID");
  const hasPublishedClip = Boolean(submission.clipUrl);

  const syncMessage = useMemo(() => {
    if (submission.metricsSyncStatus === "DISCONNECTED") {
      return labels.disconnected;
    }
    if (submission.lastMetricsSyncedAt) {
      return `${labels.syncedAt} ${formatDateTime(submission.lastMetricsSyncedAt, locale)}`;
    }
    return labels.notSynced;
  }, [submission.metricsSyncStatus, submission.lastMetricsSyncedAt, labels, locale]);

  useEffect(() => {
    setPublicationUrl(submission.clipUrl ?? "");
  }, [submission.clipUrl]);

  async function handleAdmission(decision: "ACCEPT" | "REJECT") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/campaigns/${campaignId}/submissions/${submission.id}/admission`,
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
        throw new Error(data.error || "요청에 실패했습니다.");
      }

      setShowAdmissionRejectForm(false);
      setAdmissionRejectReason("");
      onMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(status: "APPROVED" | "REVISION_REQ" | "REJECTED") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/campaigns/${campaignId}/submissions/${submission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          revisionNotes: status !== "APPROVED" ? reviewNotes : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "요청에 실패했습니다.");
      }

      setPendingReviewDecision(null);
      setReviewNotes("");
      onMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkPublication() {
    const normalizedUrl = publicationUrl.trim();
    if (!normalizedUrl) {
      setError("YouTube 게시 URL을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/campaigns/${campaignId}/submissions/${submission.id}/publication`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publishedUrl: normalizedUrl }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "게시 URL 연결에 실패했습니다.");
      }

      setShowPublicationForm(false);
      onMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article
      className={
        variant === "top"
          ? "w-[290px] shrink-0 rounded-xl border bg-card shadow-sm"
          : "rounded-xl border bg-card shadow-sm"
      }
    >
      <div className="relative">
        <div className="aspect-[9/16] w-full overflow-hidden rounded-t-xl bg-zinc-100">
          {submission.resolvedThumbnailUrl ? (
            <img
              src={submission.resolvedThumbnailUrl}
              alt={submission.clipTitle ?? "Submission thumbnail"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-200 text-zinc-500">
              <Film className="h-7 w-7" />
            </div>
          )}
        </div>

        {typeof rank === "number" && (
          <div className="absolute left-3 top-3 rounded-md bg-background/90 px-2 py-1 text-xs font-semibold shadow-sm">
            #{rank}
          </div>
        )}

        <Badge
          variant={STATUS_COLORS[submission.status] ?? "outline"}
          className="absolute right-3 top-3 bg-background/95"
        >
          {statusLabel(submission.status)}
        </Badge>
      </div>

      <div className="space-y-3 p-3">
        <div className="space-y-1">
          <p className="line-clamp-2 text-sm font-semibold">
            {submission.clipTitle ?? `${clipperName} submission`}
          </p>
          <p className="text-xs text-muted-foreground">{clipperName}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-2">
          <div>
            <p className="text-[11px] text-muted-foreground">{labels.views}</p>
            <p className="text-sm font-semibold">{submission.latestViewCount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">{labels.estPayout}</p>
            <p className="text-sm font-semibold">{formatKRW(submission.estimatedPayout)}</p>
          </div>
          {submission.deltaSinceSubmission !== null && (
            <div>
              <p className="text-[11px] text-muted-foreground">{labels.deltaSinceSubmission}</p>
              <p className={`text-sm font-semibold ${submission.deltaSinceSubmission >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {submission.deltaSinceSubmission >= 0 ? "+" : ""}
                {submission.deltaSinceSubmission.toLocaleString()}
              </p>
            </div>
          )}
          <div>
            <p className="text-[11px] text-muted-foreground">{labels.settledPayout}</p>
            <p className="text-sm font-semibold">{formatKRW(submission.totalPaid)}</p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">{syncMessage}</p>

        <div className="flex gap-2">
          <Button type="button" size="sm" className="flex-1 gap-1" onClick={() => onOpenPreview(submission)}>
            <Play className="h-3.5 w-3.5" />
            {labels.preview}
          </Button>
          {showActions && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => router.push(`/campaigns/${campaignId}/submissions/${submission.id}`)}
            >
              {labels.submissionDetail}
            </Button>
          )}
        </div>

        {showActions && canLinkPublication && (
          <div className="space-y-2 pt-1">
            {!showPublicationForm ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full gap-1"
                onClick={() => setShowPublicationForm(true)}
                disabled={loading}
              >
                <Link2 className="h-3.5 w-3.5" />
                {hasPublishedClip ? "YouTube 게시 URL 재연결" : "YouTube 게시 URL 연결"}
              </Button>
            ) : (
              <>
                <Input
                  type="url"
                  value={publicationUrl}
                  onChange={(event) => setPublicationUrl(event.target.value)}
                  placeholder="https://youtube.com/shorts/..."
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1"
                    onClick={handleLinkPublication}
                    disabled={loading || publicationUrl.trim().length === 0}
                  >
                    연결 저장
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setShowPublicationForm(false);
                      setPublicationUrl(submission.clipUrl ?? "");
                    }}
                  >
                    취소
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  크리에이터 채널 소유 영상만 연결할 수 있으며 연결 즉시 분석 수집이 시작됩니다.
                </p>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {submission.applicationDecisionNotes && submission.status === "APPLICATION_REJECTED" && (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            <span className="font-semibold">{labels.applicationRejectedReason}: </span>
            {submission.applicationDecisionNotes}
          </div>
        )}

        {submission.revisionNotes && submission.status === "REVISION_REQ" && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
            <span className="font-semibold">{labels.revisionRequestedReason}: </span>
            {submission.revisionNotes}
          </div>
        )}

        {showActions && canAdmit && !showAdmissionRejectForm && (
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="flex-1 gap-1"
              onClick={() => handleAdmission("ACCEPT")}
              disabled={loading}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {labels.approveAdmission}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="flex-1 gap-1"
              onClick={() => setShowAdmissionRejectForm(true)}
              disabled={loading}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              {labels.rejectAdmission}
            </Button>
          </div>
        )}

        {showActions && canAdmit && showAdmissionRejectForm && (
          <div className="space-y-2 pt-1">
            <Textarea
              value={admissionRejectReason}
              onChange={(event) => setAdmissionRejectReason(event.target.value)}
              placeholder={labels.rejectReasonPlaceholder}
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="flex-1"
                disabled={loading || admissionRejectReason.trim().length < MIN_REVIEW_REASON_LENGTH}
                onClick={() => handleAdmission("REJECT")}
              >
                {labels.confirmReject}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setShowAdmissionRejectForm(false);
                  setAdmissionRejectReason("");
                }}
              >
                {labels.cancel}
              </Button>
            </div>
          </div>
        )}

        {showActions && canReview && !pendingReviewDecision && (
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="flex-1 gap-1"
              onClick={() => handleReview("APPROVED")}
              disabled={loading}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {labels.approveSubmission}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              onClick={() => setPendingReviewDecision("REVISION_REQ")}
              disabled={loading}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {labels.requestRevision}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="flex-1 gap-1"
              onClick={() => setPendingReviewDecision("REJECTED")}
              disabled={loading}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              {labels.rejectSubmission}
            </Button>
          </div>
        )}

        {showActions && canReview && pendingReviewDecision && (
          <div className="space-y-2 pt-1">
            <Textarea
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              placeholder={
                pendingReviewDecision === "REJECTED"
                  ? labels.rejectReasonPlaceholder
                  : labels.revisionReasonPlaceholder
              }
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={pendingReviewDecision === "REJECTED" ? "destructive" : "outline"}
                className="flex-1"
                disabled={loading || reviewNotes.trim().length < MIN_REVIEW_REASON_LENGTH}
                onClick={() => handleReview(pendingReviewDecision)}
              >
                {pendingReviewDecision === "REJECTED" ? labels.confirmReject : labels.requestRevision}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setPendingReviewDecision(null);
                  setReviewNotes("");
                }}
              >
                {labels.cancel}
              </Button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
