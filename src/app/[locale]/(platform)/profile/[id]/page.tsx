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
} from "lucide-react";
import { Link } from "@/i18n/routing";

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

const PROVIDER_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  YOUTUBE: { icon: Youtube, label: "YouTube" },
  INSTAGRAM: { icon: Instagram, label: "Instagram" },
  TIKTOK: { icon: TikTokIcon, label: "TikTok" },
};

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Try full query; fall back if new tables/columns haven't been migrated yet
  let user: any;
  try {
    user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        nickname: true,
        role: true,
        bio: true,
        createdAt: true,
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
    // Fallback: query only base user fields (new tables/columns may not exist yet)
    try {
      user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, nickname: true, role: true, bio: true, createdAt: true },
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

  const session = await auth();
  const isOwnProfile = session?.user?.id === user.id;
  const displayName = user.nickname || user.name || "사용자";
  const cp = user.creatorProfile;
  const kp = user.clipperProfile;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {getInitials(displayName)}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{displayName}</h1>
                {user.bio && <p className="mt-1 text-sm text-muted-foreground">{user.bio}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {user.role === "CREATOR" ? "크리에이터" : user.role === "CLIPPER" ? "클리퍼" : user.role}
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

      {/* Connected Platforms */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cp && (
          <>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{cp.totalProjectsPosted}</p>
                <p className="text-xs text-muted-foreground">등록 캠페인</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold flex items-center justify-center gap-1">
                  {cp.averageRating ? (
                    <><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{cp.averageRating.toFixed(1)}</>
                  ) : "-"}
                </p>
                <p className="text-xs text-muted-foreground">평균 평점</p>
              </CardContent>
            </Card>
          </>
        )}
        {kp && (
          <>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{kp.totalProjectsCompleted}</p>
                <p className="text-xs text-muted-foreground">완료 캠페인</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold flex items-center justify-center gap-1">
                  {kp.averageRating ? (
                    <><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{kp.averageRating.toFixed(1)}</>
                  ) : "-"}
                </p>
                <p className="text-xs text-muted-foreground">평균 평점</p>
              </CardContent>
            </Card>
          </>
        )}
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{user._count.reviewsReceived}</p>
            <p className="text-xs text-muted-foreground">받은 리뷰</p>
          </CardContent>
        </Card>
      </div>

      {/* Creator Section */}
      {cp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" /> 크리에이터 정보
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
            {(cp.twitchUrl || cp.afreecaTvUrl || cp.chzzkUrl) && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">기타 플랫폼</p>
                <div className="flex flex-wrap gap-2">
                  {cp.twitchUrl && (
                    <a href={cp.twitchUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent">
                      Twitch <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {cp.afreecaTvUrl && (
                    <a href={cp.afreecaTvUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent">
                      AfreecaTV <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {cp.chzzkUrl && (
                    <a href={cp.chzzkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent">
                      CHZZK <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Clipper Section */}
      {kp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" /> 클리퍼 정보
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
                <p className="mb-2 text-sm font-medium text-muted-foreground">편집 도구</p>
                <div className="flex flex-wrap gap-2">
                  {kp.editingTools.map((t: string) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
            {kp.languages.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">작업 가능 언어</p>
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

      {/* Portfolio */}
      {kp && kp.portfolioItems.length > 0 && (
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
                    {item.viewCount != null && <span>{item.viewCount.toLocaleString()} views</span>}
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
