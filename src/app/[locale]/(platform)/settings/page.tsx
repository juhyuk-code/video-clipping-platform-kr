"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const tc = useTranslations("common");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const body = {
      nickname: (form.get("nickname") as string) || undefined,
      bio: (form.get("bio") as string) || undefined,
      preferredLanguage: (form.get("language") as string) || undefined,
    };
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) setMessage("저장되었습니다");
      else { const data = await res.json(); setMessage(data.error || "저장에 실패했습니다"); }
    } catch { setMessage("오류가 발생했습니다"); }
    finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">{tc("settings")}</h1>
      {message && <div className="rounded-lg border bg-muted p-3 text-sm">{message}</div>}

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>프로필</CardTitle>
            <CardDescription>공개 프로필 정보를 관리하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">닉네임</label>
              <Input name="nickname" placeholder="닉네임을 입력하세요" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">소개</label>
              <Textarea name="bio" placeholder="자기소개를 작성하세요" rows={3} />
            </div>
            <Button type="submit" disabled={saving}>{saving ? "저장 중..." : tc("save")}</Button>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>알림 설정</CardTitle>
          <CardDescription>알림 수신 방법을 설정하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">이메일 알림</p><p className="text-xs text-muted-foreground">프로젝트 업데이트를 이메일로 받기</p></div>
            <input type="checkbox" defaultChecked className="h-4 w-4" />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">카카오톡 알림</p><p className="text-xs text-muted-foreground">중요 알림을 카카오톡으로 받기</p></div>
            <input type="checkbox" className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>계정</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">언어</p><p className="text-xs text-muted-foreground">선호 언어를 선택하세요</p></div>
            <select name="language" className="rounded-md border border-input bg-background px-3 py-1 text-sm">
              <option value="KO">한국어</option>
              <option value="EN">English</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
