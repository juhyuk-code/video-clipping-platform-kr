"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  campaignId: string;
  campaignType: string;
  campaignStatus: string;
  isCreator: boolean;
  mySubmission: {
    id: string;
    status: string;
    revisionNotes: string | null;
  } | null;
}

export function CampaignActions({
  campaignId,
  campaignType,
  campaignStatus,
  isCreator,
  mySubmission,
}: Props) {
  const t = useTranslations("campaigns");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  async function handleAction(url: string, method: string, body?: unknown) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "오류가 발생했습니다");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  // Creator actions
  if (isCreator) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>캠페인 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </div>
          )}
          {campaignStatus === "DRAFT" && (
            <Button
              className="w-full"
              onClick={() => handleAction(`/api/v1/campaigns/${campaignId}`, "PUT", { status: "ACTIVE" })}
              disabled={loading}
            >
              {t("actions.activate")}
            </Button>
          )}
          {campaignStatus === "ACTIVE" && (
            <>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleAction(`/api/v1/campaigns/${campaignId}`, "PUT", { status: "PAUSED" })}
                disabled={loading}
              >
                {t("actions.pause")}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleAction(`/api/v1/campaigns/${campaignId}`, "PUT", { status: "COMPLETED" })}
                disabled={loading}
              >
                {t("actions.complete")}
              </Button>
            </>
          )}
          {campaignStatus === "PAUSED" && (
            <Button
              className="w-full"
              onClick={() => handleAction(`/api/v1/campaigns/${campaignId}`, "PUT", { status: "ACTIVE" })}
              disabled={loading}
            >
              {t("actions.resume")}
            </Button>
          )}
          {["DRAFT", "ACTIVE", "PAUSED"].includes(campaignStatus) && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => handleAction(`/api/v1/campaigns/${campaignId}`, "PUT", { status: "CANCELLED" })}
              disabled={loading}
            >
              {t("actions.cancel")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Clipper actions
  if (campaignStatus !== "ACTIVE") return null;

  // Not yet joined/applied
  if (!mySubmission) {
    if (campaignType === "REWARD") {
      return (
        <Card>
          <CardContent className="p-4">
            {error && (
              <div className="mb-3 rounded-lg border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => handleAction(`/api/v1/campaigns/${campaignId}/submissions`, "POST", {})}
              disabled={loading}
            >
              {t("actions.join")}
            </Button>
          </CardContent>
        </Card>
      );
    }

    // PROJECT or HYBRID — show apply form
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("actions.apply")}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-3 rounded-lg border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </div>
          )}
          {!showApplyForm ? (
            <Button className="w-full" onClick={() => setShowApplyForm(true)}>
              {t("actions.apply")}
            </Button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                handleAction(`/api/v1/campaigns/${campaignId}/submissions`, "POST", {
                  pitch: form.get("pitch"),
                  proposedPrice: Number(form.get("proposedPrice")) || undefined,
                });
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("submission.pitch")}</label>
                <Textarea
                  name="pitch"
                  placeholder={t("submission.pitchPlaceholder")}
                  rows={3}
                  required
                />
              </div>
              {campaignType === "PROJECT" && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">희망 금액 (₩)</label>
                  <Input name="proposedPrice" type="number" placeholder="50000" />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "지원 중..." : t("actions.apply")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    );
  }

  // Already joined — show submit clip form
  const canSubmit = ["APPLIED", "JOINED", "REVISION_REQ", "SUBMITTED"].includes(mySubmission.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("actions.submitClip")}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded-lg border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}
        {mySubmission.revisionNotes && mySubmission.status === "REVISION_REQ" && (
          <div className="mb-3 rounded-lg border border-yellow-500 bg-yellow-50 p-3 text-sm dark:bg-yellow-900/20">
            <p className="font-medium text-yellow-800 dark:text-yellow-200">수정 요청:</p>
            <p className="text-yellow-700 dark:text-yellow-300">{mySubmission.revisionNotes}</p>
          </div>
        )}
        {canSubmit ? (
          !showSubmitForm ? (
            <Button className="w-full" onClick={() => setShowSubmitForm(true)}>
              {t("actions.submitClip")}
            </Button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                handleAction(`/api/v1/campaigns/${campaignId}/submissions/${mySubmission.id}`, "PUT", {
                  clipTitle: form.get("clipTitle"),
                  clipUrl: form.get("clipUrl") || undefined,
                  targetPlatform: form.get("targetPlatform") || "YOUTUBE_SHORTS",
                });
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("submission.clipTitle")}</label>
                <Input name="clipTitle" placeholder="클립 제목" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("submission.clipUrl")}</label>
                <Input name="clipUrl" type="url" placeholder="https://youtube.com/shorts/..." />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("fields.targetPlatforms")}</label>
                <select name="targetPlatform" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="YOUTUBE_SHORTS">YouTube Shorts</option>
                  <option value="TIKTOK">TikTok</option>
                  <option value="INSTAGRAM_REELS">Instagram Reels</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "제출 중..." : t("actions.submitClip")}
              </Button>
            </form>
          )
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            현재 상태: {t(`submission.status.${mySubmission.status}`)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
