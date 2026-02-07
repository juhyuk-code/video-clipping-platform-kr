"use client";

import { useMode } from "@/contexts/mode-context";
import { Badge } from "@/components/ui/badge";
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
  JOINED: "secondary",
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
  JOINED: "참여 중",
  SUBMITTED: "제출됨",
  IN_REVIEW: "검토 중",
  APPROVED: "승인됨",
  REVISION_REQ: "수정 요청",
  REJECTED: "반려됨",
  PAID: "지급 완료",
};

interface Submission {
  id: string;
  status: string;
  clipTitle: string | null;
  clipUrl: string | null;
  pitch: string | null;
  latestViewCount: number;
  totalPaid: number;
  revisionNotes: string | null;
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
            {campaign.creatorName} &middot; {new Date(campaign.createdAt).toLocaleDateString("ko-KR")}
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
                <CardTitle>제출 현황 ({campaign.submissions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {campaign.submissions.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">아직 제출된 클립이 없습니다</p>
                ) : (
                  <div className="space-y-3">
                    {campaign.submissions.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-1">
                          <p className="font-medium">
                            {sub.clipper.nickname ?? sub.clipper.name}
                          </p>
                          {sub.clipTitle && (
                            <p className="text-sm text-muted-foreground">{sub.clipTitle}</p>
                          )}
                          {sub.pitch && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{sub.pitch}</p>
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
                            <span>
                              {new Date(sub.createdAt).toLocaleDateString("ko-KR")}
                            </span>
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
