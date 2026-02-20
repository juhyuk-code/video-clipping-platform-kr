export type ChartRangePreset = "2H" | "24H" | "7D" | "ALL";

export interface SnapshotForChart {
  capturedAt: string | Date;
  viewCount: number;
}

export interface BucketedViewPoint {
  bucketStart: string;
  label: string;
  fullLabel: string;
  views: number;
  delta: number;
}

type RangeConfig = {
  rangeMs: number | null;
  bucketMs: number;
};

const RANGE_CONFIGS: Record<ChartRangePreset, RangeConfig> = {
  "2H": { rangeMs: 2 * 60 * 60 * 1000, bucketMs: 5 * 60 * 1000 },
  "24H": { rangeMs: 24 * 60 * 60 * 1000, bucketMs: 30 * 60 * 1000 },
  "7D": { rangeMs: 7 * 24 * 60 * 60 * 1000, bucketMs: 60 * 60 * 1000 },
  "ALL": { rangeMs: null, bucketMs: 24 * 60 * 60 * 1000 },
};

function toLocaleCode(locale?: string): string {
  if (!locale) return "ko-KR";
  if (locale.toLowerCase().startsWith("en")) return "en-US";
  return "ko-KR";
}

function formatBucketLabel(date: Date, preset: ChartRangePreset, localeCode: string): string {
  if (preset === "2H" || preset === "24H") {
    return new Intl.DateTimeFormat(localeCode, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  if (preset === "7D") {
    return new Intl.DateTimeFormat(localeCode, {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      hour12: false,
    }).format(date);
  }

  return new Intl.DateTimeFormat(localeCode, {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function formatBucketFullLabel(date: Date, localeCode: string): string {
  return new Intl.DateTimeFormat(localeCode, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function toTimestamp(value: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function getRangeBucketUnitLabel(preset: ChartRangePreset, locale?: string): string {
  const localeCode = toLocaleCode(locale);
  if (localeCode === "en-US") {
    if (preset === "2H") return "5m";
    if (preset === "24H") return "30m";
    if (preset === "7D") return "1h";
    return "1d";
  }

  if (preset === "2H") return "5분";
  if (preset === "24H") return "30분";
  if (preset === "7D") return "1시간";
  return "1일";
}

export function buildBucketedSeries(
  snapshots: SnapshotForChart[],
  preset: ChartRangePreset,
  locale?: string
): BucketedViewPoint[] {
  if (snapshots.length === 0) return [];

  const localeCode = toLocaleCode(locale);
  const config = RANGE_CONFIGS[preset];

  const points = snapshots
    .map((snapshot) => ({
      timestamp: toTimestamp(snapshot.capturedAt),
      viewCount: Number.isFinite(snapshot.viewCount) ? snapshot.viewCount : 0,
    }))
    .filter((snapshot) => Number.isFinite(snapshot.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (points.length === 0) return [];

  const end = points[points.length - 1].timestamp;
  const start = config.rangeMs == null
    ? points[0].timestamp
    : Math.max(points[0].timestamp, end - config.rangeMs);

  const inRange = points.filter((snapshot) => snapshot.timestamp >= start && snapshot.timestamp <= end);
  const seed = points.filter((snapshot) => snapshot.timestamp < start).at(-1);

  if (!seed && inRange.length === 0) return [];

  const bucketed: BucketedViewPoint[] = [];
  let pointer = 0;
  let knownValue: number | null = seed ? seed.viewCount : null;
  let knownTimestamp: number | null = seed ? seed.timestamp : null;
  let previousValue: number | null = null;

  for (let bucketStart = start; bucketStart <= end; bucketStart += config.bucketMs) {
    const bucketEnd = bucketStart + config.bucketMs;

    while (pointer < inRange.length && inRange[pointer].timestamp <= bucketEnd) {
      knownValue = inRange[pointer].viewCount;
      knownTimestamp = inRange[pointer].timestamp;
      pointer++;
    }

    if (knownValue == null) continue;

    const delta = previousValue == null ? 0 : knownValue - previousValue;
    previousValue = knownValue;

    const bucketDate = new Date(bucketStart);
    bucketed.push({
      bucketStart: bucketDate.toISOString(),
      label: formatBucketLabel(bucketDate, preset, localeCode),
      fullLabel: formatBucketFullLabel(new Date(knownTimestamp ?? bucketStart), localeCode),
      views: knownValue,
      delta,
    });
  }

  return bucketed;
}
