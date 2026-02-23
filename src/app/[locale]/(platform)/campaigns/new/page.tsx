"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMode } from "@/contexts/mode-context";
import { getYouTubeScopeStatus } from "@/lib/social/youtube-permissions";

type YouTubeGateStatus =
  | "loading"
  | "ready"
  | "missing_connection"
  | "missing_scope"
  | "error";

export default function NewCampaignPage() {
  const t = useTranslations("campaigns");
  const tc = useTranslations("common");
  const tm = useTranslations("marketplace");
  const router = useRouter();
  const pathname = usePathname();
  const { mode } = useMode();

  // Only creators can create campaigns
  if (mode !== "creator") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-lg text-muted-foreground">
          캠페인 생성은 크리에이터 모드에서만 가능합니다
        </p>
        <Link href="/campaigns">
          <Button variant="outline">캠페인 찾기로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeGateStatus, setYouTubeGateStatus] = useState<YouTubeGateStatus>("loading");

  const connectYouTubeUrl = useMemo(
    () =>
      `/api/v1/social/connect/youtube?returnTo=${encodeURIComponent(pathname)}&source=settings`,
    [pathname]
  );

  useEffect(() => {
    let alive = true;
    async function loadYouTubeReadiness() {
      try {
        const res = await fetch("/api/v1/users/me");
        if (!res.ok) {
          if (alive) setYouTubeGateStatus("error");
          return;
        }
        const profile = await res.json();
        const connection = (profile?.socialConnections ?? []).find(
          (item: { provider: string }) => item.provider === "YOUTUBE"
        );
        if (!connection) {
          if (alive) setYouTubeGateStatus("missing_connection");
          return;
        }

        const scopeStatus = getYouTubeScopeStatus(connection.scope);
        if (alive) {
          setYouTubeGateStatus(scopeStatus.ready ? "ready" : "missing_scope");
        }
      } catch {
        if (alive) setYouTubeGateStatus("error");
      }
    }

    loadYouTubeReadiness();
    return () => {
      alive = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const sourceVideoUrl = (form.get("sourceVideoUrl") as string).trim();
    const totalBudget = Number(form.get("totalBudget"));
    const fixedPayPerClip = Number(form.get("fixedPayPerClip"));
    const viewBonusRate = Number(form.get("viewBonusRate"));

    const body: Record<string, unknown> = {
      title: form.get("title") as string,
      description: form.get("description") as string,
      guidelines: form.get("guidelines") as string,
      type: "HYBRID",
      sourceVideoUrl: sourceVideoUrl || undefined,
      targetPlatforms: ["YOUTUBE_SHORTS"],
      contentCategory: (form.get("category") as string) || undefined,
      deadline: new Date(form.get("deadline") as string).toISOString(),
      totalBudget: Number.isFinite(totalBudget) && totalBudget > 0 ? totalBudget : undefined,
      fixedPayPerClip:
        Number.isFinite(fixedPayPerClip) && fixedPayPerClip > 0
          ? fixedPayPerClip
          : undefined,
      viewBonusRate:
        Number.isFinite(viewBonusRate) && viewBonusRate > 0 ? viewBonusRate : undefined,
      maxParticipants: Number(form.get("maxParticipants")) || undefined,
      maxClipsPerUser: Number(form.get("maxClipsPerUser")) || 1,
    };

    if (!body.totalBudget) {
      setError("총 예산은 필수이며 0보다 커야 합니다.");
      setSubmitting(false);
      return;
    }
    if (!sourceVideoUrl) {
      setError("하이브리드 캠페인은 원본 영상 링크가 필요합니다.");
      setSubmitting(false);
      return;
    }
    if (!body.fixedPayPerClip || !body.viewBonusRate) {
      setError("고정 지급액과 조회수 보너스 단가를 모두 입력해주세요.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `서버 오류 (${res.status})`);
      }
      const campaign = await res.json();
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  const isYouTubeReady = youtubeGateStatus === "ready";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t("create")}</h1>
        <p className="text-sm text-muted-foreground">
          이 버전은 하이브리드 캠페인 + YouTube Shorts만 지원합니다.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="border-amber-300 bg-amber-50">
        <CardHeader>
          <CardTitle>YouTube 채널 연결 필수</CardTitle>
          <CardDescription>
            캠페인 생성/활성화 전에 크리에이터 본인 YouTube 권한이 준비되어야 합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal space-y-1 pl-5">
            <li>YouTube 계정을 연결합니다.</li>
            <li>
              Google 권한 화면에서 <code>youtube.readonly</code>와{" "}
              <code>yt-analytics.readonly</code>를 모두 허용합니다.
            </li>
            <li>연결 후 이 페이지로 돌아와 캠페인을 생성합니다.</li>
          </ol>

          <div className="flex items-center gap-2">
            <Badge variant={isYouTubeReady ? "default" : "outline"}>
              {youtubeGateStatus === "ready"
                ? "준비 완료"
                : youtubeGateStatus === "loading"
                  ? "확인 중..."
                  : "연결 필요"}
            </Badge>
            {!isYouTubeReady && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = connectYouTubeUrl;
                }}
              >
                YouTube 연결/재연결
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("fields.title")}</label>
              <Input name="title" placeholder="캠페인 제목을 입력하세요" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("fields.description")}</label>
              <Textarea
                name="description"
                placeholder="캠페인에 대해 간단히 설명해주세요"
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("fields.sourceVideo")}</label>
              <Input
                name="sourceVideoUrl"
                type="url"
                placeholder="원본 영상 링크"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("fields.guidelines")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                name="guidelines"
                placeholder={t("fields.guidelinesPlaceholder")}
                rows={5}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("fields.targetPlatforms")}</label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">YouTube Shorts</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("fields.category")}</label>
              <select
                name="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">카테고리 선택</option>
                {(
                  [
                    "gaming",
                    "beauty",
                    "tech",
                    "mukbang",
                    "vlog",
                    "music",
                    "education",
                    "comedy",
                    "sports",
                    "other",
                  ] as const
                ).map((cat) => (
                  <option key={cat} value={cat}>
                    {tm(`categories.${cat}`)}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>예산 및 보상</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("fields.totalBudget")}</label>
                <Input name="totalBudget" type="number" placeholder="1000000" min={1} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("fields.deadline")}</label>
                <Input name="deadline" type="date" required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("fields.fixedPayPerClip")}</label>
              <Input name="fixedPayPerClip" type="number" placeholder="50000" min={1} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("fields.viewBonusRate")}</label>
              <Input name="viewBonusRate" type="number" placeholder="200" min={1} step="0.01" required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("fields.maxParticipants")}</label>
                <Input name="maxParticipants" type="number" placeholder="10" min={1} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("fields.maxClipsPerUser")}</label>
                <Input name="maxClipsPerUser" type="number" placeholder="1" min={1} defaultValue={1} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            {tc("cancel")}
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting || !isYouTubeReady}>
            {submitting ? "생성 중..." : t("create")}
          </Button>
        </div>
      </form>
    </div>
  );
}
