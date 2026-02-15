"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useMode } from "@/contexts/mode-context";
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
  Users,
  FileCheck,
  CheckCircle,
  Eye,
  Wallet,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { CampaignActions } from "./campaign-actions";

const TYPE_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  PROJECT: "default",
  REWARD: "secondary",
  HYBRID: "outline",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  ACTIVE: "default",
  PAUSED: "secondary",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

const SUB_STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
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

const TYPE_LABELS: Record<string, string> = {
  PROJECT: "프로젝트형",
  REWARD: "리워드형",
  HYBRID: "하이브리드형",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "초안",
  ACTIVE: "진행 중",
  PAUSED: "일시정지",
  COMPLETED: "완료",
  CANCELLED: "취소됨",
};

const SUB_STATUS_LABELS: Record<string, string> = {
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

const MIN_REVIEW_REASON_LENGTH = 5;

interface Submission {
  id: string;
  status: string;
  clipTitle: string | null;
  clipUrl: string | null;
  pitch: string | null;
  proposedPrice: number | null;
  latestViewCount: number;
  totalPaid: number;
  revisionNotes: string | null;
  applicationDecisionNotes: string | null;
  applicationReviewedAt: string | null;
  joinedAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  clipper: {
    id: string;
    nickname: string | null;
    name: string | null;
    image: string | null;
  };
}

interface CampaignData {
  id: string;
  title: string;
  description: string;
  guidelines: string;
  type: string;
  status: string;
  createdAt: string;
  creatorId: string;
  creatorName: string;
  isOwner: boolean;
  participantCount: number;
  submissionCount: number;
  approvedCount: number;
  totalBudget: number | null;
  totalSpent: number;
  fixedPayPerClip: number | null;
  cprRate: number | null;
  viewBonusRate: number | null;
  deadline: string;
  maxParticipants: number | null;
  targetPlatforms: string[];
  submissions: Submission[];
  mySubmission: {
    id: string;
    status: string;
    revisionNotes: string | null;
    applicationDecisionNotes: string | null;
  } | null;
}

export function CampaignDetailClient({ campaign }: { campaign: CampaignData }) {
  const { mode } = useMode();

  // In creator mode AND is owner → show creator management view
  // Otherwise → show clipper view
  const showCreatorView = mode === "creator" && campaign.isOwner;
  const remaining = (campaign.totalBudget ?? 0) - campaign.totalSpent;

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{campaign.title}</h1>
            <Badge variant={TYPE_COLORS[campaign.type]}>{TYPE_LABELS[campaign.type]}</Badge>
            <Badge variant={STATUS_COLORS[campaign.status]}>{STATUS_LABELS[campaign.status]}</Badge>
          </div>
          <p className="text-muted-foreground">
            <a href={`/profile/${campaign.creatorId}`} className="hover:underline hover:text-foreground transition-colors">
              {campaign.creatorName}
            </a>
            {" "}&middot; {new Date(campaign.createdAt).toLocaleDateString("ko-KR")}
          </p>
        </div>
      </div>

      {/* Stats — different stats for creator vs clipper */}
      {showCreatorView ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="참여자" value={String(campaign.participantCount)} />
          <StatCard icon={FileCheck} label="제출" value={String(campaign.submissionCount)} />
          <StatCard icon={CheckCircle} label="승인" value={String(campaign.approvedCount)} />
          <StatCard icon={Wallet} label="예산" value={campaign.totalBudget ? formatKRW(campaign.totalBudget) : "무제한"} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard icon={Users} label="참여자" value={String(campaign.participantCount)} />
          <StatCard icon={Calendar} label="마감일" value={new Date(campaign.deadline).toLocaleDateString("ko-KR")} />
          <StatCard
            icon={Wallet}
            label="보상"
            value={
              campaign.fixedPayPerClip
                ? `${formatKRW(campaign.fixedPayPerClip)}/클립`
                : campaign.cprRate
                  ? `${formatKRW(campaign.cprRate)}/1K뷰`
                  : "정보 없음"
            }
          />
        </div>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>설명</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{campaign.description}</p>
            </CardContent>
          </Card>

          {/* Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle>클리핑 가이드라인</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{campaign.guidelines}</p>
            </CardContent>
          </Card>

          {/* Submissions — only visible to creator */}
          {showCreatorView && (
            <Card>
              <CardHeader>
                <CardTitle>지원/제출 현황 ({campaign.submissions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {campaign.submissions.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">아직 지원/제출 내역이 없습니다</p>
                ) : (
                  <div className="space-y-4">
                    {campaign.submissions.map((sub) => (
                      <SubmissionReviewCard
                        key={sub.id}
                        submission={sub}
                        campaignId={campaign.id}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing details */}
          <Card>
            <CardHeader>
              <CardTitle>보상 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {campaign.fixedPayPerClip && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">클립당</span>
                  <span className="font-medium">{formatKRW(campaign.fixedPayPerClip)}</span>
                </div>
              )}
              {campaign.cprRate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1000뷰당</span>
                  <span className="font-medium">{formatKRW(campaign.cprRate)}</span>
                </div>
              )}
              {campaign.viewBonusRate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">뷰 보너스</span>
                  <span className="font-medium">{formatKRW(campaign.viewBonusRate)}/1K</span>
                </div>
              )}
              {/* Creator sees budget spending details */}
              {showCreatorView && campaign.totalBudget && (
                <>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="text-muted-foreground">지출</span>
                    <span className="font-medium">{formatKRW(campaign.totalSpent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">잔여</span>
                    <span className="font-medium">{formatKRW(remaining)}</span>
                  </div>
                </>
              )}
              {/* Clipper sees total budget as reference */}
              {!showCreatorView && campaign.totalBudget && (
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-muted-foreground">총 예산</span>
                  <span className="font-medium">{formatKRW(campaign.totalBudget)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="text-muted-foreground">마감일</span>
                <span className="font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(campaign.deadline).toLocaleDateString("ko-KR")}
                </span>
              </div>
              {campaign.maxParticipants && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">최대 참여자 수</span>
                  <span className="font-medium">
                    {campaign.participantCount}/{campaign.maxParticipants}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Platforms */}
          <Card>
            <CardHeader>
              <CardTitle>타겟 플랫폼</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {campaign.targetPlatforms.map((p) => (
                  <Badge key={p} variant="outline">{p.replace("_", " ")}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions — mode-aware */}
          <CampaignActions
            campaignId={campaign.id}
            campaignType={campaign.type}
            campaignStatus={campaign.status}
            isCreator={showCreatorView}
            mySubmission={campaign.mySubmission}
          />
        </div>
      </div>
    </>
  );
}

function SubmissionReviewCard({
  submission: sub,
  campaignId,
}: {
  submission: Submission;
  campaignId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingReviewDecision, setPendingReviewDecision] = useState<"REVISION_REQ" | "REJECTED" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [showAdmissionRejectForm, setShowAdmissionRejectForm] = useState(false);
  const [admissionRejectReason, setAdmissionRejectReason] = useState("");

  const canAdmit = sub.status === "APPLIED";
  const canReview = ["SUBMITTED", "IN_REVIEW"].includes(sub.status);

  async function handleAdmission(decision: "ACCEPT" | "REJECT") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/campaigns/${campaignId}/submissions/${sub.id}/admission`,
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
        `/api/v1/campaigns/${campaignId}/submissions/${sub.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            revisionNotes: status !== "APPROVED" ? reviewNotes : undefined,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "오류가 발생했습니다");
      }
      router.refresh();
      setPendingReviewDecision(null);
      setReviewNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3 cursor-pointer transition-colors hover:bg-muted/50"
      onClick={() => router.push(`/campaigns/${campaignId}/submissions/${sub.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <a
            href={`/profile/${sub.clipper.id}`}
            className="font-medium hover:underline hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {sub.clipper.nickname ?? sub.clipper.name}
          </a>
          {sub.clipTitle && (
            <p className="text-sm text-muted-foreground">{sub.clipTitle}</p>
          )}
          {sub.pitch && (
            <p className="text-sm text-muted-foreground line-clamp-2">{sub.pitch}</p>
          )}
          {sub.proposedPrice != null && sub.proposedPrice > 0 && (
            <p className="text-xs text-muted-foreground">희망 금액: {formatKRW(sub.proposedPrice)}</p>
          )}
          {sub.clipUrl && (
            <a
              href={sub.clipUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              클립 보기
            </a>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {sub.latestViewCount > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {sub.latestViewCount.toLocaleString()} views
              </span>
            )}
            <span>{new Date(sub.createdAt).toLocaleDateString("ko-KR")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sub.totalPaid > 0 && (
            <span className="text-sm font-medium text-green-600">
              {formatKRW(sub.totalPaid)}
            </span>
          )}
          <Badge variant={SUB_STATUS_COLORS[sub.status] ?? "outline"}>
            {SUB_STATUS_LABELS[sub.status]}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="rounded border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Admission actions for APPLIED submissions */}
      {canAdmit && !showAdmissionRejectForm && (
        <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => handleAdmission("ACCEPT")}
            disabled={loading}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            지원 승인
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1"
            onClick={() => setShowAdmissionRejectForm(true)}
            disabled={loading}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            지원 반려
          </Button>
        </div>
      )}

      {canAdmit && showAdmissionRejectForm && (
        <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <Textarea
            value={admissionRejectReason}
            onChange={(e) => setAdmissionRejectReason(e.target.value)}
            placeholder="지원 반려 사유를 입력해주세요 (최소 5자)"
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="gap-1"
              onClick={() => handleAdmission("REJECT")}
              disabled={loading || admissionRejectReason.trim().length < MIN_REVIEW_REASON_LENGTH}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              반려 확정
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowAdmissionRejectForm(false); setAdmissionRejectReason(""); }}
            >
              취소
            </Button>
          </div>
        </div>
      )}

      {/* Review actions for SUBMITTED / IN_REVIEW submissions */}
      {canReview && !pendingReviewDecision && (
        <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => handleReview("APPROVED")}
            disabled={loading}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            승인
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setPendingReviewDecision("REVISION_REQ")}
            disabled={loading}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            수정 요청
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1"
            onClick={() => setPendingReviewDecision("REJECTED")}
            disabled={loading}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            반려
          </Button>
        </div>
      )}

      {/* Revision / rejection notes form */}
      {canReview && pendingReviewDecision && (
        <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <Textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder={
              pendingReviewDecision === "REJECTED"
                ? "반려 사유를 입력해주세요 (최소 5자)"
                : "수정 요청 사항을 입력해주세요 (최소 5자)"
            }
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={pendingReviewDecision === "REJECTED" ? "destructive" : "outline"}
              className="gap-1"
              onClick={() => handleReview(pendingReviewDecision)}
              disabled={loading || reviewNotes.trim().length < MIN_REVIEW_REASON_LENGTH}
            >
              {pendingReviewDecision === "REJECTED" ? <ThumbsDown className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
              {pendingReviewDecision === "REJECTED" ? "반려 확정" : "수정 요청"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setPendingReviewDecision(null); setReviewNotes(""); }}
            >
              취소
            </Button>
          </div>
        </div>
      )}

      {/* Show previous revision notes */}
      {sub.revisionNotes && sub.status === "REVISION_REQ" && (
        <div className="rounded border border-yellow-500 bg-yellow-50 p-2 text-xs dark:bg-yellow-900/20">
          <span className="font-medium text-yellow-800 dark:text-yellow-200">수정 요청: </span>
          <span className="text-yellow-700 dark:text-yellow-300">{sub.revisionNotes}</span>
        </div>
      )}
      {sub.applicationDecisionNotes && sub.status === "APPLICATION_REJECTED" && (
        <div className="rounded border border-red-500 bg-red-50 p-2 text-xs dark:bg-red-900/20">
          <span className="font-medium text-red-800 dark:text-red-200">지원 반려 사유: </span>
          <span className="text-red-700 dark:text-red-300">{sub.applicationDecisionNotes}</span>
        </div>
      )}
    </div>
  );
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
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <Icon className="h-8 w-8 text-primary" />
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
