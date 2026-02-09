"use client";

import { useState, useEffect, useRef } from "react";

interface NicknameCheckResult {
  status: "idle" | "checking" | "available" | "taken" | "invalid";
  message: string | null;
}

export function useNicknameCheck(nickname: string, debounceMs = 500): NicknameCheckResult {
  const [result, setResult] = useState<NicknameCheckResult>({ status: "idle", message: null });
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);

  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = nickname.trim();

    // Too short or empty — don't check
    if (!trimmed) {
      setResult({ status: "idle", message: null });
      return;
    }
    if (trimmed.length < 2) {
      setResult({ status: "invalid", message: "닉네임은 2자 이상이어야 합니다." });
      return;
    }

    setResult({ status: "checking", message: null });

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/v1/users/check-nickname?nickname=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setResult({ status: "invalid", message: d.error || "확인 실패" });
          return;
        }
        const data = await res.json();
        if (data.available) {
          setResult({ status: "available", message: "사용 가능한 닉네임입니다." });
        } else {
          setResult({ status: "taken", message: data.reason || "이미 사용 중인 닉네임입니다." });
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setResult({ status: "idle", message: null });
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [nickname, debounceMs]);

  return result;
}
