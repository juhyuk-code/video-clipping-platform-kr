"use client";

import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DataPoint {
  date: string;
  label: string;
  fullLabel?: string;
  views: number;
}

interface TooltipPayloadItem {
  payload: DataPoint;
}

interface TooltipContentProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

interface ViewChartProps {
  data: DataPoint[];
  visibleStartIndex: number;
  visibleEndIndex: number;
  onVisibleRangeChange?: (nextStart: number) => void;
  bucketUnitLabel?: string;
  hideSlider?: boolean;
  height?: number;
  className?: string;
}

function formatTickViews(value: number): string {
  const abs = Math.abs(value);
  if (abs < 10000) return Math.round(value).toLocaleString();
  if (abs < 100000000) return `${(value / 10000).toFixed(1)}만`;
  return `${(value / 100000000).toFixed(1)}억`;
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{point.fullLabel ?? point.label}</p>
      <p className="mt-1 text-sm font-semibold">{point.views.toLocaleString()}회</p>
    </div>
  );
}

export function ViewChart({
  data,
  visibleStartIndex,
  visibleEndIndex,
  onVisibleRangeChange,
  bucketUnitLabel,
  hideSlider = false,
  height = 184,
  className = "",
}: ViewChartProps) {
  const gradientId = useId().replace(/:/g, "");

  const safeStart = data.length > 0
    ? Math.min(Math.max(0, visibleStartIndex), data.length - 1)
    : 0;
  const safeEnd = data.length > 0
    ? Math.min(Math.max(safeStart, visibleEndIndex), data.length - 1)
    : -1;
  const windowSize = safeEnd >= safeStart ? (safeEnd - safeStart + 1) : 0;
  const maxSliderStart = Math.max(0, data.length - windowSize);
  const canSlide = !hideSlider && typeof onVisibleRangeChange === "function" && windowSize > 0 && data.length > windowSize;

  const visibleData = useMemo(
    () => (safeEnd >= safeStart ? data.slice(safeStart, safeEnd + 1) : []),
    [data, safeStart, safeEnd]
  );

  const windowStartLabel = visibleData[0]?.fullLabel ?? visibleData[0]?.label ?? "-";
  const windowEndLabel = visibleData[visibleData.length - 1]?.fullLabel ?? visibleData[visibleData.length - 1]?.label ?? "-";

  if (data.length === 0 || visibleData.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border bg-muted/20 ${className}`}
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={visibleData}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`view-area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.22} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="hsl(var(--border))"
              strokeDasharray="3 4"
            />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              minTickGap={24}
              interval="preserveStartEnd"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={62}
              tickFormatter={formatTickViews}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />

            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "3 3" }}
            />

            <Area
              type="monotone"
              dataKey="views"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill={`url(#view-area-${gradientId})`}
              isAnimationActive={false}
              dot={false}
              activeDot={{
                r: 4,
                stroke: "hsl(var(--primary))",
                strokeWidth: 2,
                fill: "hsl(var(--background))",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {!hideSlider && (
        <div className="space-y-2 rounded-md border bg-muted/20 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              표시 구간: {windowStartLabel} ~ {windowEndLabel}
            </p>
            {bucketUnitLabel && (
              <p className="text-xs text-muted-foreground">
                {windowSize.toLocaleString()}포인트 · {bucketUnitLabel} 간격
              </p>
            )}
          </div>

          <input
            type="range"
            min={0}
            max={maxSliderStart}
            step={1}
            value={Math.min(safeStart, maxSliderStart)}
            onChange={(event) => onVisibleRangeChange?.(Number(event.currentTarget.value))}
            disabled={!canSlide}
            aria-label="timeframe window slider"
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      )}
    </div>
  );
}
