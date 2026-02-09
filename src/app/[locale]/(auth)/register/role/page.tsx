"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Video, Scissors, ArrowLeft, Loader2 } from "lucide-react";

type Role = "CREATOR" | "CLIPPER";

export default function OnboardingPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = [
    {
      id: "CREATOR" as Role,
      icon: Video,
      label: t("roleCreator"),
      description: t("roleCreatorDesc"),
    },
    {
      id: "CLIPPER" as Role,
      icon: Scissors,
      label: t("roleClipper"),
      description: t("roleClipperDesc"),
    },
  ];

  function handleNext() {
    if (!selectedRole) return;
    setError(null);
    setStep(2);
  }

  async function handleComplete() {
    if (!selectedRole || !nickname.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          nickname: nickname.trim(),
          bio: bio.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "프로필 설정에 실패했습니다");
      }
      // Set initial mode to match chosen role
      localStorage.setItem("platform-mode", selectedRole.toLowerCase());
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold">
            {tc("appName")}
          </Link>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className={`h-2 w-12 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-2 w-12 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>

        {/* ─── Step 1: Role Selection ─── */}
        {step === 1 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>{t("selectRole")}</CardTitle>
              <CardDescription>{t("registerSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex items-start gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent ${
                    selectedRole === role.id
                      ? "border-primary bg-accent"
                      : "border-border"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <role.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{role.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                </button>
              ))}

              <p className="text-center text-xs text-muted-foreground">
                언제든지 사이드바에서 모드를 전환할 수 있습니다
              </p>

              <Button
                size="lg"
                className="mt-2 w-full"
                disabled={!selectedRole}
                onClick={handleNext}
              >
                다음
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 2: Profile Setup ─── */}
        {step === 2 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>프로필 설정</CardTitle>
              <CardDescription>
                다른 사용자에게 표시될 닉네임을 설정하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  닉네임 <span className="text-destructive">*</span>
                </label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  maxLength={50}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  공개 프로필에 표시되는 이름입니다. 나중에 설정에서 변경할 수 있습니다.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">소개</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="자기소개를 작성하세요 (선택)"
                  rows={3}
                  maxLength={280}
                />
                <p className="text-xs text-muted-foreground">{bio.length}/280</p>
              </div>

              <div className="mt-2 flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setStep(1);
                    setError(null);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  이전
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  disabled={!nickname.trim() || submitting}
                  onClick={handleComplete}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      설정 중...
                    </>
                  ) : (
                    "시작하기"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
