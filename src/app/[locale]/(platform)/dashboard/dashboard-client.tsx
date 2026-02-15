"use client";

import { useMode } from "@/contexts/mode-context";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { formatKRW } from "@/lib/utils";

const TYPE_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  PROJECT: "default",
  REWARD: "secondary",
  HYBRID: "outline",
};

const TYPE_LABELS: Record<string, string> = {
  PROJECT: "프로젝트형",
  REWARD: "리워드형",
  HYBRID: "하이브리드형",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  ACTIVE: "default",
  PAUSED: "secondary",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "초안",
  ACTIVE: "진행 중",
  PAUSED: "일시정지",
  COMPLETED: "완료",
  CANCELLED: "취소됨",
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
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  userName: string;
  data: {
    activeCampaigns: number;
    completedCampaigns: number;
    mySubmissions: number;
    approvedSubmissions: number;
    walletBalance: number;
    totalEarned: number;
    escrowHeld: number;
    recentCreatorCampaigns: any[];
    recentClipperSubmissions: any[];
  };
}

export function DashboardClient({ userName, data }: Props) {
  const { mode } = useMode();

  if (mode === "creator") return <CreatorDashboard userName={userName} data={data} />;
  return <ClipperDashboard userName={userName} data={data} />;
}

function CreatorDashboard({ userName, data }: Props) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">크리에이터 대시보드</h1>
          <p className="text-muted-foreground">{userName}님, 환영합니다!</p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            캠페인 만들기
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Megaphone} label="진행 중 캠페인" value={String(data.activeCampaigns)} />
        <StatCard icon={CheckCircle} label="완료된 캠페인" value={String(data.completedCampaigns)} />
        <StatCard icon={Wallet} label="지갑 잔액" value={formatKRW(data.walletBalance)} />
        <StatCard icon={ClipboardList} label="에스크로 보유" value={formatKRW(data.escrowHeld)} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>내 캠페인</CardTitle>
            <Link href="/campaigns">
              <Button variant="ghost" size="sm">전체 보기</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentCreatorCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Megaphone className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">아직 캠페인이 없습니다</p>
              <Link href="/campaigns/new" className="mt-4">
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  캠페인 만들기
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentCreatorCampaigns.map((c: any) => (
                <Link key={c.id} href={`/campaigns/${c.id}`}>
                  <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{c.title}</p>
                        <Badge variant={TYPE_COLORS[c.type]} className="text-xs">
                          {TYPE_LABELS[c.type]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(c.deadline).toLocaleDateString("ko-KR")}
                        </span>
                        <span>{c.submissionCount}명 참여</span>
                        {c.totalBudget && <span>{formatKRW(c.totalBudget)}</span>}
                      </div>
                    </div>
                    <Badge variant={STATUS_COLORS[c.status]}>
                      {STATUS_LABELS[c.status]}
                    </Badge>
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

function ClipperDashboard({ userName, data }: Props) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">클리퍼 대시보드</h1>
          <p className="text-muted-foreground">{userName}님, 환영합니다!</p>
        </div>
        <Link href="/campaigns">
          <Button className="gap-2">
            <Search className="h-4 w-4" />
            캠페인 찾기
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="참여 중 캠페인" value={String(data.mySubmissions)} />
        <StatCard icon={CheckCircle} label="승인된 클립" value={String(data.approvedSubmissions)} />
        <StatCard icon={TrendingUp} label="총 수익" value={formatKRW(data.totalEarned)} />
        <StatCard icon={Wallet} label="지갑 잔액" value={formatKRW(data.walletBalance)} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>내 제출 현황</CardTitle>
            <Link href="/my-submissions">
              <Button variant="ghost" size="sm">전체 보기</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentClipperSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">참여 중인 캠페인이 없습니다</p>
              <Link href="/campaigns" className="mt-4">
                <Button variant="outline" className="gap-2">
                  <Search className="h-4 w-4" />
                  캠페인 찾기
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentClipperSubmissions.map((s: any) => (
                <Link key={s.id} href={`/campaigns/${s.campaign.id}`}>
                  <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{s.campaign.title}</p>
                        <Badge variant={TYPE_COLORS[s.campaign.type]} className="text-xs">
                          {TYPE_LABELS[s.campaign.type]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {s.clipTitle && <span>클립: {s.clipTitle}</span>}
                        {s.latestViewCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {s.latestViewCount.toLocaleString()}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(s.campaign.deadline).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.totalPaid > 0 && (
                        <span className="text-sm font-medium text-green-600">
                          {formatKRW(s.totalPaid)}
                        </span>
                      )}
                      <Badge variant={STATUS_COLORS[s.status] ?? "outline"}>
                        {STATUS_LABELS[s.status]}
                      </Badge>
                    </div>
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
