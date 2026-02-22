"use client";

import { useMode } from "@/contexts/mode-context";
import { Button } from "@/components/ui/button";
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
  Wallet,
  Calendar,
} from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { CampaignActions } from "./campaign-actions";
import { CreatorSubmissionDashboard } from "./_components/creator-submission-dashboard";
import type { CreatorSubmissionInput } from "@/lib/campaigns/submission-dashboard";

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

interface Submission extends CreatorSubmissionInput {
  clipFileUrl: string | null;
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
  youtubeJoinGate: {
    required: boolean;
    status: "READY" | "MISSING_CONNECTION" | "MISSING_SCOPE";
    missingScopes: string[];
    connectUrl: string;
    reconnectUrl: string;
  };
}

export function CampaignDetailClient({ campaign }: { campaign: CampaignData }) {
  const { mode } = useMode();

  const showCreatorView = mode === "creator" && campaign.isOwner;
  const remaining = (campaign.totalBudget ?? 0) - campaign.totalSpent;

  return (
    <>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{campaign.title}</h1>
            <Badge variant={TYPE_COLORS[campaign.type]}>{TYPE_LABELS[campaign.type]}</Badge>
            <Badge variant={STATUS_COLORS[campaign.status]}>{STATUS_LABELS[campaign.status]}</Badge>
          </div>
          <p className="text-muted-foreground">
            <a href={`/profile/${campaign.creatorId}`} className="transition-colors hover:text-foreground hover:underline">
              {campaign.creatorName}
            </a>
            {" "}&middot; {new Date(campaign.createdAt).toLocaleDateString("ko-KR")}
          </p>
        </div>
      </div>

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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>설명</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{campaign.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>클리핑 가이드라인</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{campaign.guidelines}</p>
            </CardContent>
          </Card>

          {showCreatorView && (
            <Card>
              <CardHeader>
                <CardTitle>지원/제출 현황 ({campaign.submissions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <CreatorSubmissionDashboard
                  campaignId={campaign.id}
                  campaignType={campaign.type}
                  fixedPayPerClip={campaign.fixedPayPerClip}
                  cprRate={campaign.cprRate}
                  viewBonusRate={campaign.viewBonusRate}
                  submissions={campaign.submissions}
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
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
              {showCreatorView && campaign.totalBudget && (
                <>
                  <div className="flex justify-between border-t pt-3">
                    <span className="text-muted-foreground">지출</span>
                    <span className="font-medium">{formatKRW(campaign.totalSpent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">잔여</span>
                    <span className="font-medium">{formatKRW(remaining)}</span>
                  </div>
                </>
              )}
              {!showCreatorView && campaign.totalBudget && (
                <div className="flex justify-between border-t pt-3">
                  <span className="text-muted-foreground">총 예산</span>
                  <span className="font-medium">{formatKRW(campaign.totalBudget)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-3">
                <span className="text-muted-foreground">마감일</span>
                <span className="flex items-center gap-1 font-medium">
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

          <Card>
            <CardHeader>
              <CardTitle>타겟 플랫폼</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {campaign.targetPlatforms.map((platform) => (
                  <Badge key={platform} variant="outline">
                    {platform.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <CampaignActions
            campaignId={campaign.id}
            campaignType={campaign.type}
            campaignStatus={campaign.status}
            isCreator={showCreatorView}
            mySubmission={campaign.mySubmission}
            youtubeJoinGate={campaign.youtubeJoinGate}
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
