"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useMode } from "@/contexts/mode-context";
import { usePathname } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Unlink,
  X,
  Youtube,
  Instagram,
} from "lucide-react";
import { useNicknameCheck } from "@/hooks/use-nickname-check";
import { getYouTubeScopeStatus } from "@/lib/social/youtube-permissions";

// ─── Types ──────────────────────────────────────────────

interface SocialConnection {
  id: string;
  provider: "YOUTUBE" | "INSTAGRAM" | "TIKTOK";
  scope?: string | null;
  username?: string;
  displayName?: string;
  profileUrl?: string;
  followerCount?: number;
  channelName?: string;
  connectedAt: string;
  lastSyncedAt?: string;
  _count: { videos: number };
}

interface UserProfile {
  id: string;
  name?: string;
  nickname?: string;
  email?: string;
  image?: string;
  role: string;
  bio?: string;
  preferredLanguage: string;
  createdAt: string;
  accounts: { provider: string }[];
  socialConnections: SocialConnection[];
  creatorProfile?: {
    contentCategories: string[];
    preferredClipStyle?: string;
    defaultClipGuidelines?: string;
    twitchUrl?: string;
    afreecaTvUrl?: string;
    chzzkUrl?: string;
    youtubeChannelName?: string;
    subscriberCount?: number;
    averageRating?: number;
    totalProjectsPosted: number;
  };
  clipperProfile?: {
    specializations: string[];
    editingTools: string[];
    languages: string[];
    tier: string;
    isVerified: boolean;
    averageRating?: number;
    totalProjectsCompleted: number;
  };
  _count: {
    reviewsReceived: number;
    campaignsCreated: number;
    submissions: number;
  };
}

// ─── Constants ──────────────────────────────────────────

const CONTENT_CATEGORIES = [
  "게이밍", "브이로그", "교육", "음악", "뷰티", "먹방",
  "스포츠", "뉴스/시사", "기술/IT", "엔터테인먼트", "일상",
];

const CLIP_STYLES = ["숏폼", "하이라이트", "컴필레이션", "자막/번역", "밈/편집", "리뷰/요약"];

const EDITING_TOOLS = [
  "Adobe Premiere Pro", "DaVinci Resolve", "Final Cut Pro",
  "CapCut", "After Effects", "VN Editor", "기타",
];

const SPECIALIZATIONS = [
  "게임 하이라이트", "토크 편집", "자막 작업", "밈/짤 편집",
  "뮤직비디오", "리뷰 요약", "교육 콘텐츠", "스포츠 클립",
];

const LANGUAGES_LIST = ["한국어", "English", "日本語", "中文", "Español"];

const LOGIN_PROVIDERS: Record<string, { label: string; color: string }> = {
  kakao: { label: "카카오", color: "bg-yellow-400 text-yellow-900" },
  naver: { label: "네이버", color: "bg-green-500 text-white" },
  google: { label: "Google", color: "bg-blue-500 text-white" },
};

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.72a8.27 8.27 0 0 0 4.85 1.56V6.83a4.82 4.82 0 0 1-1.09-.14Z"/>
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

const SOCIAL_PROVIDERS = [
  { key: "youtube", label: "YouTube", icon: Youtube, dbKey: "YOUTUBE" as const },
  { key: "instagram", label: "Instagram", icon: Instagram, dbKey: "INSTAGRAM" as const },
  { key: "tiktok", label: "TikTok", icon: TikTokIcon, dbKey: "TIKTOK" as const },
  { key: "twitter", label: "X", icon: XIcon, dbKey: "TWITTER" as const },
];

// ─── Helper Components ──────────────────────────────────

function TagSelector({
  options,
  selected,
  onChange,
  allowCustom = false,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  allowCustom?: boolean;
}) {
  const [custom, setCustom] = useState("");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() =>
              onChange(
                selected.includes(opt)
                  ? selected.filter((s) => s !== opt)
                  : [...selected, opt]
              )
            }
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selected.includes(opt)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-accent"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {allowCustom && (
        <div className="flex gap-2">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="직접 입력 후 Enter"
            className="h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && custom.trim()) {
                e.preventDefault();
                if (!selected.includes(custom.trim())) {
                  onChange([...selected, custom.trim()]);
                }
                setCustom("");
              }
            }}
          />
        </div>
      )}
      {selected.filter((s) => !options.includes(s)).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected
            .filter((s) => !options.includes(s))
            .map((s) => (
              <Badge key={s} variant="secondary" className="gap-1 text-xs">
                {s}
                <button type="button" onClick={() => onChange(selected.filter((v) => v !== s))}>
                  &times;
                </button>
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "U";
}

// ─── Main Page ──────────────────────────────────────────

export default function SettingsPage() {
  const tc = useTranslations("common");
  const { mode } = useMode();
  const pathname = usePathname();
  const { update: updateSession } = useSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Base fields
  const [nickname, setNickname] = useState("");
  const [savedNickname, setSavedNickname] = useState("");
  const [bio, setBio] = useState("");
  const [language, setLanguage] = useState("KO");

  // Only check availability when nickname differs from what's saved
  const nicknameCheck = useNicknameCheck(
    nickname.trim() !== savedNickname ? nickname : ""
  );

  // Creator fields
  const [contentCategories, setContentCategories] = useState<string[]>([]);
  const [preferredClipStyle, setPreferredClipStyle] = useState("");
  const [defaultGuidelines, setDefaultGuidelines] = useState("");
  const [twitchUrl, setTwitchUrl] = useState("");
  const [afreecaTvUrl, setAfreecaTvUrl] = useState("");
  const [chzzkUrl, setChzzkUrl] = useState("");

  // Clipper fields
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [editingTools, setEditingTools] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);

  // Social connection states
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/users/me");
      if (!res.ok) return;
      const data = await res.json();
      setProfile(data);

      setNickname(data.nickname || "");
      setSavedNickname(data.nickname || "");
      setBio(data.bio || "");
      setLanguage(data.preferredLanguage || "KO");

      if (data.creatorProfile) {
        setContentCategories(data.creatorProfile.contentCategories || []);
        setPreferredClipStyle(data.creatorProfile.preferredClipStyle || "");
        setDefaultGuidelines(data.creatorProfile.defaultClipGuidelines || "");
        setTwitchUrl(data.creatorProfile.twitchUrl || "");
        setAfreecaTvUrl(data.creatorProfile.afreecaTvUrl || "");
        setChzzkUrl(data.creatorProfile.chzzkUrl || "");
      }

      if (data.clipperProfile) {
        setSpecializations(data.clipperProfile.specializations || []);
        setEditingTools(data.clipperProfile.editingTools || []);
        setLanguages(data.clipperProfile.languages || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Check for social connection callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("social_connected");
    const provider = params.get("social_provider");
    const scopeStatus = params.get("social_scope_status");
    const error = params.get("social_error");

    if (error) {
      setMessage({ type: "error", text: `연결 실패: ${error}` });
    } else if ((provider === "youtube" || connected === "youtube") && scopeStatus === "missing") {
      setMessage({
        type: "error",
        text: "YouTube 연결은 완료되었지만 필수 권한이 누락되었습니다. 재연결 후 두 권한을 모두 허용해주세요.",
      });
    } else if ((provider === "youtube" || connected === "youtube") && scopeStatus === "ok") {
      setMessage({ type: "success", text: "YouTube 계정 연결 및 필수 권한 동의가 완료되었습니다." });
    } else if (connected) {
      setMessage({ type: "success", text: `${connected} 계정이 연결되었습니다.` });
    }

    if (connected || provider || scopeStatus || error) {
      fetchProfile();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchProfile]);

  async function handleSaveBase(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname || undefined, bio: bio || undefined, preferredLanguage: language }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "프로필이 저장되었습니다." });
        fetchProfile();
        // Refresh the Auth.js session so sidebar/header pick up the new nickname
        await updateSession();
      } else {
        const d = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: d.error || "저장에 실패했습니다." });
      }
    } catch {
      setMessage({ type: "error", text: "오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCreator() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/users/me/creator-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentCategories,
          preferredClipStyle: preferredClipStyle || null,
          defaultClipGuidelines: defaultGuidelines || null,
          twitchUrl: twitchUrl || null,
          afreecaTvUrl: afreecaTvUrl || null,
          chzzkUrl: chzzkUrl || null,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "크리에이터 프로필이 저장되었습니다." });
        fetchProfile();
      } else {
        const d = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: d.error || "저장에 실패했습니다." });
      }
    } catch {
      setMessage({ type: "error", text: "오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveClipper() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/users/me/clipper-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specializations, editingTools, languages }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "에디터 프로필이 저장되었습니다." });
        fetchProfile();
      } else {
        const d = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: d.error || "저장에 실패했습니다." });
      }
    } catch {
      setMessage({ type: "error", text: "오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSync(provider: string) {
    setSyncing(provider);
    try {
      const res = await fetch(`/api/v1/social/sync/${provider}`, { method: "POST" });
      if (res.ok) {
        setMessage({ type: "success", text: `${provider} 데이터가 동기화되었습니다.` });
        fetchProfile();
      } else {
        const d = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: d.error || "동기화에 실패했습니다." });
      }
    } catch {
      setMessage({ type: "error", text: "동기화 중 오류가 발생했습니다." });
    } finally {
      setSyncing(null);
    }
  }

  async function handleDisconnect(provider: string) {
    if (!confirm(`${provider} 연결을 해제하시겠습니까?`)) return;
    setDisconnecting(provider);
    try {
      const res = await fetch(`/api/v1/social/connections/${provider}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: `${provider} 연결이 해제되었습니다.` });
        fetchProfile();
      }
    } catch {
      setMessage({ type: "error", text: "연결 해제에 실패했습니다." });
    } finally {
      setDisconnecting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const loginProviders = profile?.accounts?.map((a) => a.provider) || [];
  const socialConnections = profile?.socialConnections || [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">{tc("settings")}</h1>

      {message && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ─── Profile Card ─── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
              {getInitials(profile?.nickname, profile?.email)}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{profile?.nickname || "사용자"}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <div className="mt-1 flex gap-2">
                <Badge variant="outline">{profile?.role === "CREATOR" ? "크리에이터" : "에디터"}</Badge>
                <Badge variant="secondary">
                  가입일: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("ko") : "-"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Base Profile ─── */}
      <form onSubmit={handleSaveBase}>
        <Card>
          <CardHeader>
            <CardTitle>기본 프로필</CardTitle>
            <CardDescription>공개 프로필에 표시되는 기본 정보입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">이메일</label>
              <Input
                value={profile?.email || ""}
                disabled
                placeholder="이메일 정보 없음"
                className="bg-muted text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                {profile?.email
                  ? "로그인 계정에서 가져온 이메일입니다. 변경할 수 없습니다."
                  : "OAuth 제공자에서 이메일을 가져올 수 없습니다. 비즈 앱 연동 후 이용 가능합니다."}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">닉네임</label>
              <div className="relative">
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  maxLength={50}
                  className={
                    nicknameCheck.status === "available" ? "border-green-500 pr-9" :
                    nicknameCheck.status === "taken" || nicknameCheck.status === "invalid" ? "border-destructive pr-9" :
                    ""
                  }
                />
                {nicknameCheck.status === "checking" && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
                {nicknameCheck.status === "available" && (
                  <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                )}
                {(nicknameCheck.status === "taken" || nicknameCheck.status === "invalid") && (
                  <X className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                )}
              </div>
              {nicknameCheck.message ? (
                <p className={`text-xs ${nicknameCheck.status === "available" ? "text-green-600" : "text-destructive"}`}>
                  {nicknameCheck.message}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  공개 프로필에 표시되는 이름입니다.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">소개</label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="자기소개를 작성하세요"
                rows={3}
                maxLength={280}
              />
              <p className="text-xs text-muted-foreground">{bio.length}/280</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">언어</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="KO">한국어</option>
                <option value="EN">English</option>
              </select>
            </div>
            <Button type="submit" disabled={saving || nicknameCheck.status === "taken" || nicknameCheck.status === "invalid" || nicknameCheck.status === "checking"}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 저장 중...</> : tc("save")}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* ─── Login Accounts ─── */}
      <Card>
        <CardHeader>
          <CardTitle>로그인 계정</CardTitle>
          <CardDescription>소셜 로그인에 연결된 계정입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(LOGIN_PROVIDERS).map(([key, { label, color }]) => {
            const connected = loginProviders.includes(key);
            return (
              <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${color}`}>{label}</span>
                  <span className="text-sm">{label} 로그인</span>
                </div>
                {connected ? (
                  <Badge variant="outline" className="gap-1 text-green-600">
                    <Check className="h-3 w-3" /> 연결됨
                  </Badge>
                ) : (
                  <Badge variant="secondary">미연결</Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ─── Social Platform Connections ─── */}
      <Card>
        <CardHeader>
          <CardTitle>소셜 플랫폼 연결</CardTitle>
          <CardDescription>
            {mode === "creator"
              ? "크리에이터 캠페인 생성/운영을 위해 YouTube 연결과 필수 권한 동의가 필요합니다."
              : "에디터는 소셜 연결 없이도 캠페인에 지원할 수 있습니다. 연결 시 프로필/통계 연동이 활성화됩니다."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {SOCIAL_PROVIDERS.map(({ key, label, icon: Icon, dbKey }) => {
            const connection = socialConnections.find((c) => c.provider === dbKey);
            const youtubeScopeStatus =
              key === "youtube" && connection
                ? getYouTubeScopeStatus(connection.scope)
                : null;
            const youtubeScopeReady = youtubeScopeStatus?.ready ?? false;
            const returnToPath = pathname || "/settings";
            const connectUrl = `/api/v1/social/connect/${key}?returnTo=${encodeURIComponent(returnToPath)}&source=settings`;
            return (
              <div key={key} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{label}</p>
                        {key === "youtube" && connection && (
                          youtubeScopeReady ? (
                            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                              {mode === "creator" ? "캠페인 운영 가능" : "권한 연결 완료"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                              {mode === "creator" ? "캠페인 운영 불가 (재연결 필요)" : "권한 부족 (재연결 권장)"}
                            </Badge>
                          )
                        )}
                      </div>
                      {connection && (
                        <p className="text-xs text-muted-foreground">
                          {connection.displayName || connection.username}
                          {connection.followerCount != null && (
                            <> · {connection.followerCount.toLocaleString()} 팔로워</>
                          )}
                          {connection._count?.videos > 0 && (
                            <> · {connection._count.videos}개 영상</>
                          )}
                        </p>
                      )}
                      {key === "youtube" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {mode === "creator"
                            ? "캠페인 생성/활성화와 YouTube 성과 집계를 위해 아래 2개 권한이 모두 필요합니다."
                            : "연결 시 아래 2개 권한을 모두 허용하면 YouTube 분석 연동을 사용할 수 있습니다."}
                          <br />
                          1) YouTube 계정 정보 보기 (youtube.readonly)
                          <br />
                          2) YouTube 분석 데이터 보기 (yt-analytics.readonly)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connection ? (
                      <>
                        {connection.profileUrl && (
                          <a
                            href={connection.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        {key === "youtube" && !youtubeScopeReady && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.location.href = connectUrl;
                            }}
                          >
                            재연결
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSync(key)}
                          disabled={syncing === key}
                        >
                          {syncing === key ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisconnect(key)}
                          disabled={disconnecting === key}
                          className="text-destructive hover:text-destructive"
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.location.href = connectUrl;
                        }}
                      >
                        연결하기
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ─── Creator Profile ─── */}
      {mode === "creator" && (
        <Card>
          <CardHeader>
            <CardTitle>크리에이터 프로필</CardTitle>
            <CardDescription>에디터에게 보여지는 크리에이터 정보입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">콘텐츠 카테고리</label>
              <TagSelector
                options={CONTENT_CATEGORIES}
                selected={contentCategories}
                onChange={setContentCategories}
                allowCustom
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">선호하는 클립 스타일</label>
              <div className="flex flex-wrap gap-2">
                {CLIP_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setPreferredClipStyle(preferredClipStyle === style ? "" : style)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      preferredClipStyle === style
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">기본 클립 가이드라인</label>
              <Textarea
                value={defaultGuidelines}
                onChange={(e) => setDefaultGuidelines(e.target.value)}
                placeholder="에디터에게 전달할 기본 가이드라인을 작성하세요"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">기타 플랫폼 링크</label>
              <div className="space-y-2">
                <Input value={twitchUrl} onChange={(e) => setTwitchUrl(e.target.value)} placeholder="Twitch 채널 URL" />
                <Input value={afreecaTvUrl} onChange={(e) => setAfreecaTvUrl(e.target.value)} placeholder="AfreecaTV 채널 URL" />
                <Input value={chzzkUrl} onChange={(e) => setChzzkUrl(e.target.value)} placeholder="CHZZK 채널 URL" />
              </div>
            </div>
            <Button onClick={handleSaveCreator} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 저장 중...</> : "크리에이터 프로필 저장"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── Clipper Profile ─── */}
      {mode === "clipper" && (
        <Card>
          <CardHeader>
            <CardTitle>에디터 프로필</CardTitle>
            <CardDescription>크리에이터에게 보여지는 에디터 정보입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">전문 분야</label>
              <TagSelector
                options={SPECIALIZATIONS}
                selected={specializations}
                onChange={setSpecializations}
                allowCustom
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">편집 도구</label>
              <TagSelector
                options={EDITING_TOOLS}
                selected={editingTools}
                onChange={setEditingTools}
                allowCustom
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">작업 가능 언어</label>
              <TagSelector
                options={LANGUAGES_LIST}
                selected={languages}
                onChange={setLanguages}
              />
            </div>
            {profile?.clipperProfile && (
              <div className="rounded-lg bg-muted p-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold">{profile.clipperProfile.totalProjectsCompleted}</p>
                    <p className="text-xs text-muted-foreground">완료 캠페인</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{profile.clipperProfile.averageRating?.toFixed(1) || "-"}</p>
                    <p className="text-xs text-muted-foreground">평균 평점</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{profile.clipperProfile.tier}</p>
                    <p className="text-xs text-muted-foreground">등급</p>
                  </div>
                </div>
              </div>
            )}
            <Button onClick={handleSaveClipper} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 저장 중...</> : "에디터 프로필 저장"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── Notification Settings ─── */}
      <Card>
        <CardHeader>
          <CardTitle>알림 설정</CardTitle>
          <CardDescription>알림 수신 방법을 설정하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">이메일 알림</p>
              <p className="text-xs text-muted-foreground">프로젝트 업데이트를 이메일로 받기</p>
            </div>
            <input type="checkbox" defaultChecked className="h-4 w-4" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">카카오톡 알림</p>
              <p className="text-xs text-muted-foreground">중요 알림을 카카오톡으로 받기</p>
            </div>
            <input type="checkbox" className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
