import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Youtube,
  Instagram,
  ExternalLink,
  Star,
  Calendar,
  Briefcase,
  Shield,
  Wrench,
  Globe,
  Sparkles,
  Eye,
  TrendingUp,
  CheckCircle,
  MessageSquare,
  Activity,
  Clock,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { formatKRW } from "@/lib/utils";

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.72a8.27 8.27 0 0 0 4.85 1.56V6.83a4.82 4.82 0 0 1-1.09-.14Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const PROVIDER_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  YOUTUBE: { icon: Youtube, label: "YouTube" },
  INSTAGRAM: { icon: Instagram, label: "Instagram" },
  TIKTOK: { icon: TikTokIcon, label: "TikTok" },
  TWITTER: { icon: XIcon, label: "X" },
};

function formatViewsCompact(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

function getRelativeDuration(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days}일`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월`;
  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  return remainMonths > 0 ? `${years}년 ${remainMonths}개월` : `${years}년`;
}

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  PROJECT: "프로젝트형",
  REWARD: "리워드형",
  HYBRID: "하이브리드형",
};

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let user: any;
  try {
    user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nickname: true,
        role: true,
        bio: true,
        createdAt: true,
        image: true,
        creatorProfile: {
          select: {
            youtubeChannelName: true,
            subscriberCount: true,
            contentCategories: true,
            preferredClipStyle: true,
            twitchUrl: true,
            afreecaTvUrl: true,
            chzzkUrl: true,
            averageRating: true,
            totalProjectsPosted: true,
          },
        },
        clipperProfile: {
          select: {
            specializations: true,
            editingTools: true,
            languages: true,
            tier: true,
            isVerified: true,
            averageRating: true,
            totalProjectsCompleted: true,
            portfolioItems: {
              select: {
                id: true,
                title: true,
                description: true,
                videoUrl: true,
                thumbnailUrl: true,
                platform: true,
                viewCount: true,
              },
              take: 12,
              orderBy: { createdAt: "desc" },
            },
          },
        },
        socialConnections: {
          select: {
            provider: true,
            username: true,
            displayName: true,
            profileUrl: true,
            followerCount: true,
            channelName: true,
          },
        },
        _count: {
          select: {
            reviewsReceived: true,
            campaignsCreated: true,
            submissions: true,
          },
        },
      },
    });
  } catch {
    try {
      user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, nickname: true, role: true, bio: true, createdAt: true, image: true },
      });
    } catch {
      user = null;
    }
    if (user) {
      user.socialConnections = [];
      user.creatorProfile = null;
      user.clipperProfile = null;
      user._count = { reviewsReceived: 0, campaignsCreated: 0, submissions: 0 };
    }
  }

  if (!user) notFound();

  // For creators, fetch their active campaigns
  let activeCampaigns: any[] = [];
  if (user.role === "CREATOR") {
    try {
      activeCampaigns = await prisma.campaign.findMany({
        where: { creatorId: id, status: "ACTIVE" },
        select: {
          id: true,
          title: true,
          type: true,
          deadline: true,
          fixedPayPerClip: true,
          cprRate: true,
          viewBonusRate: true,
          participantCount: true,
          maxParticipants: true,
          targetPlatforms: true,
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      });
    } catch {
      activeCampaigns = [];
    }
  }

  // Fetch clipper-specific aggregate stats
  let clipperStats = {
    totalSubmissions: 0,
    approvedCount: 0,
    approvalRate: null as number | null,
    totalViewsGenerated: 0,
    activeCampaigns: 0,
  };

  if (user.role === "CLIPPER") {
    try {
      const [submissionCounts, viewsAggregate, activeCampaignCount] = await Promise.all([
        prisma.campaignSubmission.groupBy({
          by: ["status"],
          where: { clipperId: id },
          _count: true,
        }),
        prisma.campaignSubmission.aggregate({
          where: { clipperId: id },
          _sum: { latestViewCount: true },
        }),
        prisma.campaignSubmission.count({
          where: {
            clipperId: id,
            status: { in: ["JOINED", "SUBMITTED", "IN_REVIEW"] },
          },
        }),
      ]);

      const totalSubmissions = submissionCounts.reduce((sum, g) => sum + g._count, 0);
      const approvedCount = submissionCounts
        .filter((g) => g.status === "APPROVED" || g.status === "PAID")
        .reduce((sum, g) => sum + g._count, 0);

      clipperStats = {
        totalSubmissions,
        approvedCount,
        approvalRate: totalSubmissions > 0 ? Math.round((approvedCount / totalSubmissions) * 100) : null,
        totalViewsGenerated: viewsAggregate._sum.latestViewCount ?? 0,
        activeCampaigns: activeCampaignCount,
      };
    } catch {
      // Stats queries may fail if tables don't exist yet — keep defaults
    }
  }

  const session = await auth();
  const isOwnProfile = session?.user?.id === user.id;
  const displayName = user.nickname || "사용자";
  const cp = user.creatorProfile;
  const kp = user.clipperProfile;
  const isCreator = user.role === "CREATOR";
  const isClipper = user.role === "CLIPPER";
  const portfolioItems = kp?.portfolioItems ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {user.image ? (
                <img
                  src={user.image}
                  alt={displayName}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {getInitials(displayName)}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{displayName}</h1>
                {user.bio && <p className="mt-1 text-sm text-muted-foreground">{user.bio}</p>}
                {/* Creator: show channel info */}
                {isCreator && cp?.youtubeChannelName && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cp.youtubeChannelName}
                    {cp.subscriberCount != null && (
                      <span className="ml-1">· 구독자 {cp.subscriberCount.toLocaleString()}명</span>
                    )}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {isCreator ? "크리에이터" : isClipper ? "클리퍼" : user.role}
                  </Badge>
                  {kp?.isVerified && (
                    <Badge className="gap-1 bg-blue-500">
                      <Shield className="h-3 w-3" /> 인증됨
                    </Badge>
                  )}
                  {kp?.tier && kp.tier !== "BRONZE" && (
                    <Badge variant="secondary">{kp.tier}</Badge>
                  )}
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(user.createdAt).toLocaleDateString("ko")} 가입
                  </Badge>
                </div>
              </div>
            </div>
            {isOwnProfile && (
              <Link
                href="/settings"
                className="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                프로필 편집
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {isCreator && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold flex items-center justify-center gap-1">
                {cp?.averageRating ? (
                  <><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{Number(cp.averageRating).toFixed(1)}</>
                ) : "-"}
              </p>
              <p className="text-xs text-muted-foreground">평균 평점</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{cp?.totalProjectsPosted ?? 0}</p>
              <p className="text-xs text-muted-foreground">등록 캠페인</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{user._count.reviewsReceived}</p>
              <p className="text-xs text-muted-foreground">받은 리뷰</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isClipper && (
        <Card>
          <CardContent className="pt-5 pb-5">
            {/* Row 1: Trust signals */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="flex items-center justify-center gap-1 text-xl font-bold">
                  {kp?.averageRating ? (
                    <>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {Number(kp.averageRating).toFixed(1)}
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">평균 평점</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className={`text-xl font-bold ${clipperStats.approvalRate !== null && clipperStats.approvalRate >= 70 ? "text-green-600" : ""}`}>
                  {clipperStats.approvalRate !== null ? `${clipperStats.approvalRate}%` : "-"}
                </p>
                <p className="text-xs text-muted-foreground">승인율</p>
                {clipperStats.totalSubmissions > 0 && (
                  <p className="text-[10px] text-muted-foreground">{clipperStats.approvedCount}/{clipperStats.totalSubmissions}</p>
                )}
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xl font-bold">{kp?.totalProjectsCompleted ?? 0}</p>
                <p className="text-xs text-muted-foreground">완료 캠페인</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xl font-bold">{user._count.reviewsReceived}</p>
                <p className="text-xs text-muted-foreground">받은 리뷰</p>
              </div>
            </div>

            {/* Row 2: Capability signals */}
            <div className="mt-3 grid grid-cols-4 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold">
                  {clipperStats.totalViewsGenerated > 0
                    ? `${formatViewsCompact(clipperStats.totalViewsGenerated)}회`
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">총 조회수</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold">
                  {portfolioItems.length > 0
                    ? `${formatViewsCompact(Math.round(portfolioItems.reduce((s: number, p: any) => s + (p.viewCount ?? 0), 0) / portfolioItems.length))}회`
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">클립 평균 조회</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold">
                  {getRelativeDuration(user.createdAt)}
                </p>
                <p className="text-xs text-muted-foreground">활동 기간</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className={`text-xl font-bold ${clipperStats.activeCampaigns >= 3 ? "text-orange-600" : ""}`}>
                  {clipperStats.activeCampaigns}개
                </p>
                <p className="text-xs text-muted-foreground">진행 중</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state when no profile details filled in */}
      {isClipper && !kp && user.socialConnections.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">아직 프로필 정보가 없습니다</p>
            {isOwnProfile && (
              <Link
                href="/settings"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                설정에서 프로필을 완성해보세요
              </Link>
            )}
          </CardContent>
        </Card>
      )}
      {isCreator && !cp && user.socialConnections.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">아직 프로필 정보가 없습니다</p>
            {isOwnProfile && (
              <Link
                href="/settings"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                설정에서 프로필을 완성해보세요
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* === CLIPPER-SPECIFIC SECTIONS === */}

      {/* Clipper Skills */}
      {isClipper && kp && (kp.specializations.length > 0 || kp.editingTools.length > 0 || kp.languages.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" /> 전문 역량
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {kp.specializations.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">전문 분야</p>
                <div className="flex flex-wrap gap-2">
                  {kp.specializations.map((s: string) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {kp.editingTools.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  <Wrench className="mr-1 inline h-3.5 w-3.5" />
                  편집 도구
                </p>
                <div className="flex flex-wrap gap-2">
                  {kp.editingTools.map((t: string) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
            {kp.languages.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  <Globe className="mr-1 inline h-3.5 w-3.5" />
                  작업 가능 언어
                </p>
                <div className="flex flex-wrap gap-2">
                  {kp.languages.map((l: string) => (
                    <Badge key={l} variant="outline">{l}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Clipper Portfolio */}
      {isClipper && kp && kp.portfolioItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">포트폴리오</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {kp.portfolioItems.map((item: any) => (
                <a
                  key={item.id}
                  href={item.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <p className="font-medium group-hover:text-primary">{item.title}</p>
                  {item.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{item.platform}</Badge>
                    {item.viewCount != null && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {item.viewCount.toLocaleString()}회
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* === CREATOR-SPECIFIC SECTIONS === */}

      {/* Creator Content Info */}
      {isCreator && cp && (cp.contentCategories.length > 0 || cp.preferredClipStyle) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" /> 콘텐츠 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cp.contentCategories.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">콘텐츠 카테고리</p>
                <div className="flex flex-wrap gap-2">
                  {cp.contentCategories.map((c: string) => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
            {cp.preferredClipStyle && (
              <div>
                <p className="mb-1 text-sm font-medium text-muted-foreground">선호 클립 스타일</p>
                <Badge>{cp.preferredClipStyle}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Creator Platform Links */}
      {isCreator && cp && (cp.twitchUrl || cp.afreecaTvUrl || cp.chzzkUrl) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">방송 플랫폼</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {cp.twitchUrl && (
                <a href={cp.twitchUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent">
                  Twitch <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {cp.afreecaTvUrl && (
                <a href={cp.afreecaTvUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent">
                  AfreecaTV <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {cp.chzzkUrl && (
                <a href={cp.chzzkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent">
                  CHZZK <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Creator Active Campaigns */}
      {isCreator && activeCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">진행 중인 캠페인</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeCampaigns.map((c: any) => {
                const reward = c.fixedPayPerClip
                  ? `${formatKRW(Number(c.fixedPayPerClip))}/클립`
                  : c.cprRate
                    ? `${formatKRW(Number(c.cprRate))}/1K뷰`
                    : null;
                return (
                  <Link key={c.id} href={`/campaigns/${c.id}`}>
                    <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{c.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">
                            {CAMPAIGN_TYPE_LABELS[c.type] ?? c.type}
                          </Badge>
                          {c.targetPlatforms.slice(0, 2).map((p: string) => (
                            <Badge key={p} variant="outline" className="text-[10px]">{p.replace("_", " ")}</Badge>
                          ))}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(c.deadline).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        {reward && <p className="text-sm font-medium">{reward}</p>}
                        {c.maxParticipants && (
                          <p className="text-xs text-muted-foreground">
                            {c.participantCount}/{c.maxParticipants}명
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Platforms — shared for both roles */}
      {user.socialConnections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">연결된 플랫폼</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {user.socialConnections.map((sc: any) => {
                const providerInfo = PROVIDER_ICONS[sc.provider];
                const Icon = providerInfo?.icon || Youtube;
                return (
                  <a
                    key={sc.provider}
                    href={sc.profileUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <Icon className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">
                        {sc.displayName || sc.username || providerInfo?.label}
                      </p>
                      {sc.followerCount != null && (
                        <p className="text-xs text-muted-foreground">
                          {sc.followerCount.toLocaleString()} 팔로워
                        </p>
                      )}
                    </div>
                    <ExternalLink className="ml-1 h-3 w-3 text-muted-foreground" />
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
