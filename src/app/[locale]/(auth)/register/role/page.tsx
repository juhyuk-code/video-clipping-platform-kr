"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Video, Scissors } from "lucide-react";

type Role = "CREATOR" | "CLIPPER";

export default function RoleSelectionPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
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

  async function handleSubmit() {
    if (!selectedRole) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "역할 설정에 실패했습니다");
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
              disabled={!selectedRole || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "설정 중..." : tc("save")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
