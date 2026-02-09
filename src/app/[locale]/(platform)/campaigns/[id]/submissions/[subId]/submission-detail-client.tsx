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
} from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { ProfileSummary, ProfileFull, type ProfileData } from "@/components/profile/profile-content";

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

export function SubmissionDetailClient({ submission: sub }: { submission: SubmissionData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const canReview = sub.isCreator && ["SUBMITTED", "IN_REVIEW"].includes(sub.status);
  const clipperName = sub.clipper.nickname ?? sub.clipper.name ?? "사용자";

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
          <p className="text-muted-foreground">
            {sub.campaign.title}
          </p>
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
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application info */}
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

          {/* Submitted clip */}
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
                {sub.latestViewCount > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">조회수</p>
                    <p className="flex items-center gap-1 text-sm font-medium">
                      <Eye className="h-3.5 w-3.5" />
                      {sub.latestViewCount.toLocaleString()}회
                    </p>
                  </div>
                )}
                {/* View snapshots timeline */}
                {sub.snapshots.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">조회수 추이</p>
                    <div className="space-y-1">
                      {sub.snapshots.slice(0, 10).map((snap, i) => (
                        <div key={i} className="flex justify-between text-xs text-muted-foreground">
                          <span>{new Date(snap.capturedAt).toLocaleString("ko-KR")}</span>
                          <span className="font-medium">{snap.viewCount.toLocaleString()}회</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Revision notes */}
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

          {/* Payment info */}
          {sub.totalPaid > 0 && (
            <Card className="border-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Wallet className="h-5 w-5" />
                  정산 정보
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
                  <span className="font-medium">총 지급액</span>
                  <span className="font-bold text-green-600">{formatKRW(sub.totalPaid)}</span>
                </div>
                {sub.paidAt && (
                  <p className="text-xs text-muted-foreground">
                    지급일: {new Date(sub.paidAt).toLocaleDateString("ko-KR")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Creator review actions */}
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Clipper profile — summary with expand */}
          <ProfileSummary
            profile={sub.clipperProfile}
            onExpand={() => setProfileOpen(true)}
          />

          {/* Campaign reward info */}
          <Card>
            <CardHeader>
              <CardTitle>보상 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {sub.campaign.fixedPayPerClip && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">클립당</span>
                  <span className="font-medium">{formatKRW(sub.campaign.fixedPayPerClip)}</span>
                </div>
              )}
              {sub.campaign.cprRate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1000뷰당</span>
                  <span className="font-medium">{formatKRW(sub.campaign.cprRate)}</span>
                </div>
              )}
              {sub.campaign.viewBonusRate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">뷰 보너스</span>
                  <span className="font-medium">{formatKRW(sub.campaign.viewBonusRate)}/1K</span>
                </div>
              )}
              <div className="border-t pt-2">
                <p className="text-xs font-medium text-muted-foreground">타겟 플랫폼</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {sub.campaign.targetPlatforms.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs">{p.replace("_", " ")}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>타임라인</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <TimelineItem
                  label="지원"
                  date={sub.createdAt}
                  active
                />
                {sub.submittedAt && (
                  <TimelineItem
                    label="클립 제출"
                    date={sub.submittedAt}
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
                    active
                  />
                )}
                {sub.paidAt && (
                  <TimelineItem
                    label="정산 완료"
                    date={sub.paidAt}
                    active
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
