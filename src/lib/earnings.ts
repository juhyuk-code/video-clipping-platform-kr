// Campaign earnings & velocity calculations

interface Snapshot {
  viewCount: number;
  capturedAt: string;
}

export interface EarningsBreakdown {
  fixed: number;
  viewBased: number;
  total: number;
}

export function calculateEstimatedEarnings(
  type: string,
  views: number,
  fixedPayPerClip: number | null,
  cprRate: number | null,
  viewBonusRate: number | null
): EarningsBreakdown {
  if (type === "PROJECT") {
    const fixed = fixedPayPerClip ?? 0;
    return { fixed, viewBased: 0, total: fixed };
  }
  if (type === "REWARD") {
    const viewBased = Math.floor((views / 1000) * (cprRate ?? 0));
    return { fixed: 0, viewBased, total: viewBased };
  }
  // HYBRID
  const fixed = fixedPayPerClip ?? 0;
  const viewBased = Math.floor((views / 1000) * (viewBonusRate ?? 0));
  return { fixed, viewBased, total: fixed + viewBased };
}

export function calculateViewVelocity(snapshots: Snapshot[]): number {
  if (snapshots.length < 2) return 0;
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const daysDiff =
    (new Date(last.capturedAt).getTime() - new Date(first.capturedAt).getTime()) /
    (1000 * 60 * 60 * 24);
  if (daysDiff < 0.01) return 0;
  return Math.round((last.viewCount - first.viewCount) / daysDiff);
}

export function snapshotsToChartData(
  snapshots: Snapshot[]
): { date: string; views: number }[] {
  return [...snapshots]
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
    .map((s) => ({ date: s.capturedAt, views: s.viewCount }));
}
