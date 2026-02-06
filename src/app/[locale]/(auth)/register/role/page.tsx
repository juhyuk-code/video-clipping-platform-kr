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
import { Video, Scissors, Users } from "lucide-react";

type Role = "CREATOR" | "CLIPPER" | "BOTH";

export default function RoleSelectionPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

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
    {
      id: "BOTH" as Role,
      icon: Users,
      label: t("roleBoth"),
      description: t("roleBothDesc"),
    },
  ];

  async function handleSubmit() {
    if (!selectedRole) return;
    // TODO: API call to update user role
    router.push("/dashboard");
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

            <Button
              size="lg"
              className="mt-4 w-full"
              disabled={!selectedRole}
              onClick={handleSubmit}
            >
              {tc("save")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
