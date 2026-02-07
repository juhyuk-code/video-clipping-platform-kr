"use client";

import { useMode } from "@/contexts/mode-context";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Megaphone,
  Calendar,
  Users,
  Wallet,
  Eye,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
};

const CATEGORIES = [
  { id: "gaming", label: "게이밍" },
  { id: "beauty", label: "뷰티" },
  { id: "tech", label: "테크" },
  { id: "mukbang", label: "먹방" },
  { id: "vlog", label: "브이로그" },
  { id: "music", label: "음악" },
  { id: "education", label: "교육" },
  { id: "comedy", label: "코미디" },
  { id: "sports", label: "스포츠" },
];

interface Props {
  activeCampaigns: any[];
  myCampaigns: any[];
  currentType?: string;
  currentCategory?: string;
}

export function CampaignsClient({ activeCampaigns, myCampaigns, currentType, currentCategory }: Props) {
  const { mode } = useMode();

  if (mode === "creator") {
    return <CreatorCampaignsView myCampaigns={myCampaigns} />;
  }
  return (
    <ClipperCampaignsView
      campaigns={activeCampaigns}
      currentType={currentType}
      currentCategory={currentCategory}
    />
  );
}

function CreatorCampaignsView({ myCampaigns }: { myCampaigns: any[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">내 캠페인</h1>
          <p className="text-muted-foreground">내가 만든 캠페인을 관리하세요</p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            캠페인 만들기
          </Button>
        </Link>
      </div>

      {myCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24">
          <Megaphone className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg text-muted-foreground">아직 캠페인이 없습니다</p>
          <Link href="/campaigns/new" className="mt-4">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              첫 캠페인 만들기
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myCampaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{c.title}</p>
                    <Badge variant={TYPE_COLORS[c.type]} className="text-xs">
                      {TYPE_LABELS[c.type]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(c.deadline).toLocaleDateString("ko-KR")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {c.submissionCount}명 참여
                    </span>
                    {c.totalBudget && (
                      <span className="flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        {formatKRW(c.totalBudget)}
                      </span>
                    )}
                    {c.totalSpent > 0 && (
                      <span className="text-xs">지출: {formatKRW(c.totalSpent)}</span>
                    )}
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
    </div>
  );
}

function ClipperCampaignsView({
  campaigns,
  currentType,
  currentCategory,
}: {
  campaigns: any[];
  currentType?: string;
  currentCategory?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">캠페인 찾기</h1>
        <p className="text-muted-foreground">참여할 캠페인을 찾아보세요</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="캠페인 검색..." className="pl-10" />
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        <Link href="/campaigns">
          <Badge variant={!currentType ? "default" : "outline"} className="cursor-pointer">
            전체
          </Badge>
        </Link>
        {(["PROJECT", "REWARD", "HYBRID"] as const).map((t) => (
          <Link key={t} href={`/campaigns?type=${t}`}>
            <Badge variant={currentType === t ? "default" : "outline"} className="cursor-pointer">
              {TYPE_LABELS[t]}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Link key={cat.id} href={`/campaigns?${currentType ? `type=${currentType}&` : ""}category=${cat.id}`}>
            <Badge
              variant={currentCategory === cat.id ? "secondary" : "outline"}
              className="cursor-pointer text-xs"
            >
              {cat.label}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Campaign Grid */}
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24">
          <Megaphone className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg text-muted-foreground">참여 가능한 캠페인이 없습니다</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-2 text-base">{c.title}</CardTitle>
                    <Badge variant={TYPE_COLORS[c.type]} className="ml-2 shrink-0">
                      {TYPE_LABELS[c.type]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {c.targetPlatforms.map((p: string) => (
                      <Badge key={p} variant="outline" className="text-xs">
                        {p.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {c.fixedPayPerClip && (
                      <div className="flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        클립당: {formatKRW(c.fixedPayPerClip)}
                      </div>
                    )}
                    {c.cprRate && (
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        1000뷰당: {formatKRW(c.cprRate)}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    {c.totalBudget && (
                      <span className="flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        {formatKRW(c.totalBudget)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {c.submissionCount}명
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(c.deadline).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
