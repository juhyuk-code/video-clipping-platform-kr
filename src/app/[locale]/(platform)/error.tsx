"use client";

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">문제가 발생했습니다</h2>
      <p className="text-muted-foreground">
        {error.message || "페이지를 불러오는 중 오류가 발생했습니다"}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        다시 시도
      </button>
    </div>
  );
}
