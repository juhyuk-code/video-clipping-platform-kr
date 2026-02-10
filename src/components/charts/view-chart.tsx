"use client";

import { useMemo } from "react";

interface DataPoint {
  date: string;
  views: number;
}

interface ViewChartProps {
  data: DataPoint[];
  height?: number;
  className?: string;
}

function formatAxisDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatViews(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

export function ViewChart({ data, height = 200, className = "" }: ViewChartProps) {
  const chart = useMemo(() => {
    if (data.length === 0) return null;

    const sorted = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const views = sorted.map((d) => d.views);
    const minV = Math.min(...views);
    const maxV = Math.max(...views);
    const range = maxV - minV || 1;

    const padTop = 24;
    const padBottom = 28;
    const padLeft = 48;
    const padRight = 16;
    const chartH = height - padTop - padBottom;
    const chartW = 100; // percentage-based, will use viewBox

    const viewBoxW = 400;
    const innerW = viewBoxW - padLeft - padRight;
    const innerH = chartH;

    const points = sorted.map((d, i) => {
      const x = padLeft + (sorted.length === 1 ? innerW / 2 : (i / (sorted.length - 1)) * innerW);
      const y = padTop + innerH - ((d.views - minV) / range) * innerH;
      return { x, y, ...d };
    });

    const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
    const areaPath = `M${points[0].x},${padTop + innerH} ${points.map((p) => `L${p.x},${p.y}`).join(" ")} L${points[points.length - 1].x},${padTop + innerH} Z`;

    // Y-axis: 3-4 labels
    const ySteps = 3;
    const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
      const val = minV + (range * i) / ySteps;
      const y = padTop + innerH - (innerH * i) / ySteps;
      return { val: Math.round(val), y };
    });

    // X-axis: up to 5 labels
    const xStep = Math.max(1, Math.floor(sorted.length / 5));
    const xLabels = sorted
      .filter((_, i) => i % xStep === 0 || i === sorted.length - 1)
      .map((d, idx, arr) => {
        const origIdx = sorted.indexOf(d);
        const x = padLeft + (sorted.length === 1 ? innerW / 2 : (origIdx / (sorted.length - 1)) * innerW);
        return { label: formatAxisDate(d.date), x };
      });

    return { points, polyline, areaPath, yLabels, xLabels, viewBoxW, padTop, padLeft, padRight, innerH, innerW };
  }, [data, height]);

  if (!chart || data.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded-lg border bg-muted/30 ${className}`} style={{ height }}>
        <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 rounded-lg border bg-muted/30 ${className}`} style={{ height }}>
        <p className="text-2xl font-bold">{data[0].views.toLocaleString()}회</p>
        <p className="text-xs text-muted-foreground">{formatAxisDate(data[0].date)} 측정</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${chart.viewBoxW} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {chart.yLabels.map((yl, i) => (
          <line
            key={i}
            x1={chart.padLeft}
            y1={yl.y}
            x2={chart.viewBoxW - chart.padRight}
            y2={yl.y}
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
          />
        ))}

        {/* Area fill */}
        <path d={chart.areaPath} fill="url(#areaGradient)" />

        {/* Line */}
        <polyline
          points={chart.polyline}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {chart.points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="hsl(var(--background))"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
        ))}

        {/* Y-axis labels */}
        {chart.yLabels.map((yl, i) => (
          <text
            key={i}
            x={chart.padLeft - 6}
            y={yl.y + 4}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize="10"
          >
            {formatViews(yl.val)}
          </text>
        ))}

        {/* X-axis labels */}
        {chart.xLabels.map((xl, i) => (
          <text
            key={i}
            x={xl.x}
            y={height - 6}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="10"
          >
            {xl.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
