"use client";

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
} from "lucide-react";

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

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// --- Shared data shape ---

export interface ProfileData {
  id: string;
  nickname: string | null;
  role: string;
  bio: string | null;
  image: string | null;
  createdAt: string;
  creatorProfile: {
    youtubeChannelName: string | null;
    subscriberCount: number | null;
    contentCategories: string[];
    preferredClipStyle: string | null;
    twitchUrl: string | null;
    afreecaTvUrl: string | null;
    chzzkUrl: string | null;
    averageRating: number | null;
    totalProjectsPosted: number;
  } | null;
  clipperProfile: {
    specializations: string[];
    editingTools: string[];
    languages: string[];
    tier: string;
    isVerified: boolean;
    averageRating: number | null;
    totalProjectsCompleted: number;
    portfolioItems: {
      id: string;
      title: string;
      description: string | null;
      videoUrl: string;
      thumbnailUrl: string | null;
      platform: string;
      viewCount: number | null;
    }[];
  } | null;
  socialConnections: {
    provider: string;
    username: string | null;
    displayName: string | null;
    profileUrl: string | null;
    followerCount: number | null;
    channelName: string | null;
  }[];
  _count: {
    reviewsReceived: number;
  };
}

// ========================
// SUMMARY variant
// ========================

export function ProfileSummary({
  profile,
  onExpand,
}: {
  profile: ProfileData;
  onExpand: () => void;
}) {
  const displayName = profile.nickname || "사용자";
  const kp = profile.clipperProfile;
  const cp = profile.creatorProfile;
  const isClipper = profile.role === "CLIPPER";

  return (
    <Card className="transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="h-4 w-4" />
          {isClipper ? "클리퍼 정보" : "크리에이터 정보"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Avatar + name + bio */}
        <div className="flex items-center gap-3">
          {profile.image ? (
            <img
              src={profile.image}
              alt={displayName}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {getInitials(displayName)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium">{displayName}</p>
            {profile.bio && (
              <p className="text-xs text-muted-foreground line-clamp-2">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Clipper quick stats */}
        {isClipper && kp && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {kp.averageRating != null && kp.averageRating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-500" />
                {kp.averageRating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1 text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" />
              {kp.totalProjectsCompleted}건 완료
            </span>
            {kp.tier && kp.tier !== "BRONZE" && (
              <Badge variant="secondary" className="text-xs">{kp.tier}</Badge>
            )}
            {kp.isVerified && (
              <Badge className="gap-1 bg-blue-500 text-xs">
                <Shield className="h-3 w-3" /> 인증
              </Badge>
            )}
          </div>
        )}

        {/* Creator quick stats */}
        {!isClipper && cp && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {cp.averageRating != null && cp.averageRating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-500" />
                {cp.averageRating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1 text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" />
              {cp.totalProjectsPosted}건 등록
            </span>
            {cp.youtubeChannelName && (
              <span className="text-xs text-muted-foreground">
                {cp.youtubeChannelName}
              </span>
            )}
          </div>
        )}

        {/* Clipper: top specializations */}
        {isClipper && kp && kp.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {kp.specializations.slice(0, 3).map((s) => (
              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
            ))}
            {kp.specializations.length > 3 && (
              <Badge variant="outline" className="text-xs">+{kp.specializations.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Creator: top categories */}
        {!isClipper && cp && cp.contentCategories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cp.contentCategories.slice(0, 3).map((c) => (
              <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
            ))}
          </div>
        )}

        {/* Expand button */}
        <button
          onClick={onExpand}
          className="w-full rounded-md border px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-accent"
        >
          프로필 자세히 보기
        </button>
      </CardContent>
    </Card>
  );
}

// ========================
// FULL variant (for Sheet)
// ========================

export function ProfileFull({ profile }: { profile: ProfileData }) {
  const displayName = profile.nickname || "사용자";
  const kp = profile.clipperProfile;
  const cp = profile.creatorProfile;
  const isClipper = profile.role === "CLIPPER";
  const isCreator = profile.role === "CREATOR";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {profile.image ? (
          <img
            src={profile.image}
            alt={displayName}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
            {getInitials(displayName)}
          </div>
        )}
        <div>
          <h3 className="text-xl font-bold">{displayName}</h3>
          {profile.bio && (
            <p className="mt-0.5 text-sm text-muted-foreground">{profile.bio}</p>
          )}
          {isCreator && cp?.youtubeChannelName && (
            <p className="text-sm text-muted-foreground">
              {cp.youtubeChannelName}
              {cp.subscriberCount != null && (
                <span className="ml-1">· 구독자 {cp.subscriberCount.toLocaleString()}명</span>
              )}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline">
              {isCreator ? "크리에이터" : "클리퍼"}
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
              {new Date(profile.createdAt).toLocaleDateString("ko")} 가입
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {isClipper && (
          <>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-lg font-bold flex items-center justify-center gap-1">
                {kp?.averageRating ? (
                  <><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{kp.averageRating.toFixed(1)}</>
                ) : "-"}
              </p>
              <p className="text-xs text-muted-foreground">평균 평점</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-lg font-bold">{kp?.totalProjectsCompleted ?? 0}</p>
              <p className="text-xs text-muted-foreground">완료 캠페인</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-lg font-bold">{profile._count.reviewsReceived}</p>
              <p className="text-xs text-muted-foreground">받은 리뷰</p>
            </div>
          </>
        )}
        {isCreator && (
          <>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-lg font-bold flex items-center justify-center gap-1">
                {cp?.averageRating ? (
                  <><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{cp.averageRating.toFixed(1)}</>
                ) : "-"}
              </p>
              <p className="text-xs text-muted-foreground">평균 평점</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-lg font-bold">{cp?.totalProjectsPosted ?? 0}</p>
              <p className="text-xs text-muted-foreground">등록 캠페인</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-lg font-bold">{profile._count.reviewsReceived}</p>
              <p className="text-xs text-muted-foreground">받은 리뷰</p>
            </div>
          </>
        )}
      </div>

      {/* === CLIPPER SECTIONS === */}

      {/* Skills */}
      {isClipper && kp && (kp.specializations.length > 0 || kp.editingTools.length > 0 || kp.languages.length > 0) && (
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4" /> 전문 역량
          </h4>
          {kp.specializations.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">전문 분야</p>
              <div className="flex flex-wrap gap-2">
                {kp.specializations.map((s) => (
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
                {kp.editingTools.map((t) => (
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
                {kp.languages.map((l) => (
                  <Badge key={l} variant="outline">{l}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Portfolio */}
      {isClipper && kp && kp.portfolioItems.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold">포트폴리오</h4>
          <div className="grid grid-cols-1 gap-3">
            {kp.portfolioItems.map((item) => (
              <a
                key={item.id}
                href={item.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <p className="font-medium text-sm group-hover:text-primary">{item.title}</p>
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
        </div>
      )}

      {/* === CREATOR SECTIONS === */}

      {/* Content Info */}
      {isCreator && cp && (cp.contentCategories.length > 0 || cp.preferredClipStyle) && (
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-semibold">
            <Briefcase className="h-4 w-4" /> 콘텐츠 정보
          </h4>
          {cp.contentCategories.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">콘텐츠 카테고리</p>
              <div className="flex flex-wrap gap-2">
                {cp.contentCategories.map((c) => (
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
        </div>
      )}

      {/* Creator Platform Links */}
      {isCreator && cp && (cp.twitchUrl || cp.afreecaTvUrl || cp.chzzkUrl) && (
        <div className="space-y-3">
          <h4 className="font-semibold">방송 플랫폼</h4>
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
        </div>
      )}

      {/* Connected Platforms — shared */}
      {profile.socialConnections.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold">연결된 플랫폼</h4>
          <div className="flex flex-wrap gap-3">
            {profile.socialConnections.map((sc) => {
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
        </div>
      )}

      {/* Link to full profile page */}
      <div className="border-t pt-4">
        <a
          href={`/profile/${profile.id}`}
          className="block w-full rounded-md border px-3 py-2 text-center text-sm font-medium transition-colors hover:bg-accent"
        >
          전체 프로필 페이지 열기
        </a>
      </div>
    </div>
  );
}
