"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
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

const TARGET_PLATFORMS = [
  { id: "YOUTUBE_SHORTS", label: "YouTube Shorts" },
  { id: "TIKTOK", label: "TikTok" },
  { id: "INSTAGRAM_REELS", label: "Instagram Reels" },
];

export default function NewProjectPage() {
  const t = useTranslations("projects");
  const tc = useTranslations("common");
  const tm = useTranslations("marketplace");
  const router = useRouter();

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body = {
      title: form.get("title") as string,
      description: form.get("description") as string,
      brief: form.get("brief") as string,
      sourceVideoUrl: (form.get("sourceVideoUrl") as string) || undefined,
      targetPlatforms: selectedPlatforms.length > 0 ? selectedPlatforms : ["YOUTUBE_SHORTS"],
      contentCategory: (form.get("category") as string) || undefined,
      budgetAmount: Number(form.get("budget")) || undefined,
      deadline: new Date(form.get("deadline") as string).toISOString(),
      maxClipsRequested: Number(form.get("maxClips")) || undefined,
      maxRevisionRounds: Number(form.get("maxRevisions")) || 2,
    };

    try {
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "프로젝트 생성에 실패했습니다");
      }
      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">{t("create")}</h1>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>프로젝트의 기본 정보를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("title")}</label>
              <Input name="title" placeholder="프로젝트 제목을 입력하세요" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("description")}</label>
              <Textarea name="description" placeholder="프로젝트에 대해 간단히 설명해주세요" rows={3} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("sourceVideo")}</label>
              <Input name="sourceVideoUrl" type="url" placeholder={t("sourceVideoPlaceholder")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>클리핑 요구사항</CardTitle>
            <CardDescription>클리퍼에게 전달할 가이드라인을 작성하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("brief")}</label>
              <Textarea name="brief" placeholder={t("briefPlaceholder")} rows={5} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("targetPlatforms")}</label>
              <div className="flex flex-wrap gap-2">
                {TARGET_PLATFORMS.map((platform) => (
                  <Badge
                    key={platform.id}
                    variant={selectedPlatforms.includes(platform.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => togglePlatform(platform.id)}
                  >
                    {platform.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("category")}</label>
              <select name="category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">카테고리 선택</option>
                {(["gaming", "beauty", "tech", "mukbang", "vlog", "music", "education", "comedy", "sports", "other"] as const).map((cat) => (
                  <option key={cat} value={cat}>{tm(`categories.${cat}`)}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>예산 및 일정</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("budget")}</label>
                <Input name="budget" type="number" placeholder="100000" min={0} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("deadline")}</label>
                <Input name="deadline" type="date" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("maxClips")}</label>
                <Input name="maxClips" type="number" placeholder="5" min={1} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("maxRevisions")}</label>
                <Input name="maxRevisions" type="number" placeholder="2" min={0} defaultValue={2} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>{tc("cancel")}</Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? "생성 중..." : t("create")}
          </Button>
        </div>
      </form>
    </div>
  );
}
