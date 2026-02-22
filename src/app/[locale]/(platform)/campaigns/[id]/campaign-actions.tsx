"use client";

import { useEffect, useState } from "react";
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
    applicationDecisionNotes: string | null;
  } | null;
  youtubeJoinGate?: {
    required: boolean;
    status: "READY" | "MISSING_CONNECTION" | "MISSING_SCOPE";
    missingScopes: string[];
    connectUrl: string;
    reconnectUrl: string;
  };
}

function mapSocialError(errorCode: string): string {
  switch (errorCode) {
    case "access_denied":
      return "소셜 연결 권한 동의가 취소되었습니다.";
    case "missing_params":
      return "연결 응답 정보가 누락되었습니다. 다시 시도해주세요.";
    case "invalid_state":
      return "보안 검증에 실패했습니다. 다시 연결해주세요.";
    case "session_mismatch":
      return "로그인 세션이 만료되었거나 변경되었습니다. 다시 로그인 후 시도해주세요.";
    case "token_exchange_failed":
      return "소셜 토큰 교환에 실패했습니다. 잠시 후 다시 시도해주세요.";
    case "profile_fetch_failed":
      return "연결된 계정 프로필 조회에 실패했습니다. 권한을 확인 후 재연결해주세요.";
    default:
      return `소셜 연결 실패: ${errorCode}`;
  }
}

export function CampaignActions({
  campaignId,
  campaignType,
  campaignStatus,
  isCreator,
  mySubmission,
  youtubeJoinGate,
}: Props) {
  const t = useTranslations("campaigns");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const youtubeGateBlocked =
    Boolean(youtubeJoinGate?.required) && youtubeJoinGate?.status !== "READY";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const provider = params.get("social_provider");
    const connected = params.get("social_connected");
    const scopeStatus = params.get("social_scope_status");
    const socialError = params.get("social_error");

    if (!provider && !connected && !scopeStatus && !socialError) {
      return;
    }

    if (socialError) {
      setError(mapSocialError(socialError));
      setSuccess(null);
    } else if (provider === "youtube" || connected === "youtube") {
      if (scopeStatus === "ok") {
        setSuccess("YouTube 연결 및 필수 권한 동의가 완료되었습니다. 이제 캠페인에 참여할 수 있습니다.");
        setError(null);
      } else if (scopeStatus === "missing") {
        setError("YouTube 필수 권한이 누락되었습니다. 재연결 후 두 권한을 모두 허용해주세요.");
        setSuccess(null);
      } else if (connected) {
        setSuccess("YouTube 계정이 연결되었습니다.");
        setError(null);
      }
    }

    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  async function handleAction(
    url: string,
    method: string,
    body?: unknown,
    options?: {
      onSuccess?: () => void;
      successMessage?: string;
    }
  ) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `요청에 실패했습니다. (${res.status})`);
      }
      options?.onSuccess?.();
      if (options?.successMessage) setSuccess(options.successMessage);
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
          {success && (
            <div className="rounded-lg border border-emerald-500 bg-emerald-50 p-2 text-xs text-emerald-700">
              {success}
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
    if (youtubeGateBlocked && youtubeJoinGate) {
      const ctaLabel =
        youtubeJoinGate.status === "MISSING_SCOPE"
          ? "YouTube 재연결하기"
          : "YouTube 연결하기";
      const ctaUrl =
        youtubeJoinGate.status === "MISSING_SCOPE"
          ? youtubeJoinGate.reconnectUrl
          : youtubeJoinGate.connectUrl;

      return (
        <Card>
          <CardHeader>
            <CardTitle>YouTube 권한 연결 필요</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-500 bg-emerald-50 p-2 text-xs text-emerald-700">
                {success}
              </div>
            )}
            <div className="rounded-lg border border-amber-400/70 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">이 캠페인 참여 전 필수 설정</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs">
                <li>YouTube 계정을 연결합니다.</li>
                <li>Google 동의 화면에서 아래 2개 권한을 모두 허용합니다.</li>
                <li>캠페인 페이지로 돌아와 참여를 진행합니다.</li>
              </ol>
              <p className="mt-2 text-xs">
                필수 권한: 1) YouTube 계정 정보 보기 (youtube.readonly), 2) YouTube 분석 데이터 보기 (yt-analytics.readonly)
              </p>
            </div>

            {youtubeJoinGate.status === "MISSING_SCOPE" && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                필수 권한 일부가 빠졌습니다. 재연결 후 두 권한을 모두 허용해주세요.
                {youtubeJoinGate.missingScopes.length > 0 && (
                  <> 누락 권한: {youtubeJoinGate.missingScopes.map((scope) => scope.split("/").pop()).join(", ")}</>
                )}
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => {
                window.location.href = ctaUrl;
              }}
            >
              {ctaLabel}
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (campaignType === "REWARD") {
      return (
        <Card>
          <CardContent className="space-y-3 p-4">
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-500 bg-emerald-50 p-2 text-xs text-emerald-700">
                {success}
              </div>
            )}
            <Button
              className="w-full"
              onClick={() =>
                handleAction(`/api/v1/campaigns/${campaignId}/submissions`, "POST", {}, {
                  successMessage: "캠페인 참여가 완료되었습니다.",
                })
              }
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
          {success && (
            <div className="mb-3 rounded-lg border border-emerald-500 bg-emerald-50 p-2 text-xs text-emerald-700">
              {success}
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
                }, {
                  onSuccess: () => setShowApplyForm(false),
                  successMessage: "지원이 완료되었습니다. 크리에이터 승인을 기다려주세요.",
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

  if (mySubmission.status === "APPLIED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>지원 상태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-500 bg-emerald-50 p-2 text-xs text-emerald-700">
              {success}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            크리에이터의 승인 대기 중입니다. 승인되면 클립 제출이 열립니다.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              handleAction(`/api/v1/campaigns/${campaignId}/submissions/${mySubmission.id}/withdraw`, "PATCH", undefined, {
                successMessage: "지원을 철회했습니다.",
              })
            }
            disabled={loading}
          >
            지원 철회
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (mySubmission.status === "APPLICATION_REJECTED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>지원 반려됨</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {success && (
            <div className="rounded-lg border border-emerald-500 bg-emerald-50 p-2 text-xs text-emerald-700">
              {success}
            </div>
          )}
          <p className="text-sm text-muted-foreground">이번 캠페인 지원이 반려되었습니다.</p>
          {mySubmission.applicationDecisionNotes && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">반려 사유</p>
              <p>{mySubmission.applicationDecisionNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (mySubmission.status === "WITHDRAWN") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>지원 철회됨</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {success && (
            <div className="rounded-lg border border-emerald-500 bg-emerald-50 p-2 text-xs text-emerald-700">
              {success}
            </div>
          )}
          <p className="text-sm text-muted-foreground">이 캠페인 지원을 철회했습니다.</p>
        </CardContent>
      </Card>
    );
  }

  // Already admitted — show submit clip form
  const canSubmit = ["JOINED", "REVISION_REQ", "SUBMITTED"].includes(mySubmission.status);

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
        {success && (
          <div className="mb-3 rounded-lg border border-emerald-500 bg-emerald-50 p-2 text-xs text-emerald-700">
            {success}
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
            <div className="space-y-2">
              {mySubmission.status === "SUBMITTED" && (
                <div className="rounded-lg border border-blue-500 bg-blue-50 p-3 text-sm text-blue-700">
                  클립이 제출되었습니다. 크리에이터 검토를 기다려주세요.
                </div>
              )}
              <Button className="w-full" onClick={() => setShowSubmitForm(true)}>
                {mySubmission.status === "SUBMITTED" ? "제출 수정하기" : t("actions.submitClip")}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/campaigns/${campaignId}/submissions/${mySubmission.id}`)}
              >
                제출 상세 보기
              </Button>
              {mySubmission.status === "JOINED" && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    handleAction(`/api/v1/campaigns/${campaignId}/submissions/${mySubmission.id}/withdraw`, "PATCH", undefined, {
                      successMessage: "참여를 철회했습니다.",
                    })
                  }
                  disabled={loading}
                >
                  참여 철회
                </Button>
              )}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                handleAction(`/api/v1/campaigns/${campaignId}/submissions/${mySubmission.id}`, "PUT", {
                  clipTitle: form.get("clipTitle"),
                  clipUrl: form.get("clipUrl") || undefined,
                  targetPlatform: form.get("targetPlatform") || "YOUTUBE_SHORTS",
                }, {
                  onSuccess: () => setShowSubmitForm(false),
                  successMessage: "클립을 제출했습니다. 크리에이터 검토를 기다려주세요.",
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
