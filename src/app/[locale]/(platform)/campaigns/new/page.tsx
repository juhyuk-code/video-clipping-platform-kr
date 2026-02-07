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
import { FolderKanban, Gift, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TARGET_PLATFORMS = [
  { id: "YOUTUBE_SHORTS", label: "YouTube Shorts" },
  { id: "TIKTOK", label: "TikTok" },
  { id: "INSTAGRAM_REELS", label: "Instagram Reels" },
];

const CAMPAIGN_TYPES = [
  { id: "PROJECT" as const, icon: FolderKanban },
  { id: "REWARD" as const, icon: Gift },
  { id: "HYBRID" as const, icon: Sparkles },
];

export default function NewCampaignPage() {
  const t = useTranslations("campaigns");
  const tc = useTranslations("common");
  const tm = useTranslations("marketplace");
  const router = useRouter();

  const [campaignType, setCampaignType] = useState<"PROJECT" | "REWARD" | "HYBRID">("PROJECT");
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
    const body: Record<string, unknown> = {
      title: form.get("title") as string,
      description: form.get("description") as string,
      guidelines: form.get("guidelines") as string,
      type: campaignType,
      sourceVideoUrl: (form.get("sourceVideoUrl") as string) || undefined,
      targetPlatforms: selectedPlatforms.length > 0 ? selectedPlatforms : ["YOUTUBE_SHORTS"],
      contentCategory: (form.get("category") as string) || undefined,
      deadline: new Date(form.get("deadline") as string).toISOString(),
      totalBudget: Number(form.get("totalBudget")) || undefined,
      maxParticipants: Number(form.get("maxParticipants")) || undefined,
      maxClipsPerUser: Number(form.get("maxClipsPerUser")) || 1,
    };

    // Type-specific fields
    if (campaignType === "PROJECT" || campaignType === "HYBRID") {
      body.fixedPayPerClip = Number(form.get("fixedPayPerClip")) || undefined;
    }
    if (campaignType === "REWARD") {
      body.cprRate = Number(form.get("cprRate")) || undefined;
      body.minViewThreshold = Number(form.get("minViewThreshold")) || 0;
    }
    if (campaignType === "HYBRID") {
      body.viewBonusRate = Number(form.get("viewBonusRate")) || undefined;
    }

    try {
      const res = await fetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "캠페인 생성에 실패했습니다");
      }
      const campaign = await res.json();
      router.push(`/campaigns/${campaign.id}`);
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

      {/* Campaign Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t("type.label")}</CardTitle>
          <CardDescription>캠페인 유형을 선택하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {CAMPAIGN_TYPES.map((ct) => (
              <button
                key={ct.id}
                type="button"
                onClick={() => setCampaignType(ct.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors",
                  campaignType === ct.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <ct.icon className={cn(
                  "h-8 w-8",
                  campaignType === ct.id ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="text-sm font-medium">{t(`type.${ct.id}`)}</span>
                <span className="text-xs text-muted-foreground">{t(`type.${ct.id}_desc`)}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
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
              <Textarea name="description" placeholder="캠페인에 대해 간단히 설명해주세요" rows={3} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("fields.sourceVideo")}</label>
              <Input name="sourceVideoUrl" type="url" placeholder="YouTube, Twitch, AfreecaTV URL" />
            </div>
          </CardContent>
        </Card>

        {/* Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>{t("fields.guidelines")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea name="guidelines" placeholder={t("fields.guidelinesPlaceholder")} rows={5} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("fields.targetPlatforms")}</label>
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
              <label className="text-sm font-medium">{t("fields.category")}</label>
              <select name="category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">카테고리 선택</option>
                {(["gaming", "beauty", "tech", "mukbang", "vlog", "music", "education", "comedy", "sports", "other"] as const).map((cat) => (
                  <option key={cat} value={cat}>{tm(`categories.${cat}`)}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Budget & Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>예산 및 보상</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("fields.totalBudget")}</label>
                <Input name="totalBudget" type="number" placeholder="1000000" min={0} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("fields.deadline")}</label>
                <Input name="deadline" type="date" required />
              </div>
            </div>

            {/* PROJECT / HYBRID: fixed pay per clip */}
            {(campaignType === "PROJECT" || campaignType === "HYBRID") && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("fields.fixedPayPerClip")}</label>
                <Input name="fixedPayPerClip" type="number" placeholder="50000" min={0} required />
              </div>
            )}

            {/* REWARD: CPR rate */}
            {campaignType === "REWARD" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("fields.cprRate")}</label>
                  <Input name="cprRate" type="number" placeholder="500" min={0} step="0.01" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("fields.minViewThreshold")}</label>
                  <Input name="minViewThreshold" type="number" placeholder="1000" min={0} />
                </div>
              </>
            )}

            {/* HYBRID: view bonus rate */}
            {campaignType === "HYBRID" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("fields.viewBonusRate")}</label>
                <Input name="viewBonusRate" type="number" placeholder="200" min={0} step="0.01" required />
              </div>
            )}

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

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
            {tc("cancel")}
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? "생성 중..." : t("create")}
          </Button>
        </div>
      </form>
    </div>
  );
}
