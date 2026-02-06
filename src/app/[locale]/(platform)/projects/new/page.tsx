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

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: API call to create project
    router.push("/projects");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("create")}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>프로젝트의 기본 정보를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("title")}</label>
              <Input placeholder="프로젝트 제목을 입력하세요" required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("description")}</label>
              <Textarea
                placeholder="프로젝트에 대해 간단히 설명해주세요"
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("sourceVideo")}</label>
              <Input
                type="url"
                placeholder={t("sourceVideoPlaceholder")}
                required
              />
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
              <Textarea
                placeholder={t("briefPlaceholder")}
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("targetPlatforms")}
              </label>
              <div className="flex flex-wrap gap-2">
                {TARGET_PLATFORMS.map((platform) => (
                  <Badge
                    key={platform.id}
                    variant={
                      selectedPlatforms.includes(platform.id)
                        ? "default"
                        : "outline"
                    }
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
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
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
            <CardTitle>예산 및 일정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("budget")}</label>
                <Input type="number" placeholder="100000" min={0} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("deadline")}</label>
                <Input type="date" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("maxClips")}</label>
                <Input type="number" placeholder="5" min={1} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("maxRevisions")}
                </label>
                <Input type="number" placeholder="2" min={0} defaultValue={2} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
            {tc("cancel")}
          </Button>
          <Button type="submit" className="flex-1">
            {t("create")}
          </Button>
        </div>
      </form>
    </div>
  );
}
