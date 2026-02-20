"use client";

import { useId, useMemo } from "react";

interface DataPoint {
  date: string;
  label: string;
  fullLabel?: string;
  views: number;
}

interface ViewChartProps {
  data: DataPoint[];
  height?: number;
  className?: string;
}

function getNiceStep(range: number, targetTicks = 4): number {
  if (range <= 0) return 1;

  const roughStep = range / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const residual = roughStep / magnitude;

  let niceResidual = 1;
  if (residual > 1) niceResidual = 2;
  if (residual > 2) niceResidual = 5;
  if (residual > 5) niceResidual = 10;

  return niceResidual * magnitude;
}

function buildYTicks(min: number, max: number): number[] {
  if (min === max) return [min];

  const step = getNiceStep(max - min, 4);
  const tickMin = Math.floor(min / step) * step;
  const tickMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let value = tickMin; value <= tickMax; value += step) {
    ticks.push(value);
  }

  return ticks.length > 1 ? ticks : [tickMin, tickMax];
}

function formatViews(value: number, compact: boolean): string {
  if (!compact || Math.abs(value) < 10000) {
    return Math.round(value).toLocaleString();
  }

  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(1)}만`;
  return `${(value / 1000).toFixed(1)}천`;
}

export function ViewChart({ data, height = 172, className = "" }: ViewChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const chart = useMemo(() => {
    if (data.length === 0) return null;

    const sorted = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const values = sorted.map((point) => point.views);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const expandedMin = minValue === maxValue ? minValue - 1 : minValue;
    const expandedMax = minValue === maxValue ? maxValue + 1 : maxValue;

    const yTicks = buildYTicks(expandedMin, expandedMax);
    const yMin = yTicks[0];
    const yMax = yTicks[yTicks.length - 1];
    const yRange = Math.max(1, yMax - yMin);

    const padTop = 14;
    const padBottom = 28;
    const padLeft = 54;
    const padRight = 12;
    const viewBoxWidth = 420;
    const innerWidth = viewBoxWidth - padLeft - padRight;
    const innerHeight = height - padTop - padBottom;

    const points = sorted.map((point, index) => {
      const x = padLeft + (sorted.length === 1 ? innerWidth / 2 : (index / (sorted.length - 1)) * innerWidth);
      const y = padTop + innerHeight - ((point.views - yMin) / yRange) * innerHeight;
      return { ...point, x, y };
    });

    const linePath = points.map((point, index) =>
      `${index === 0 ? "M" : "L"}${point.x},${point.y}`
    ).join(" ");

    const areaPath = `${linePath} L${points[points.length - 1].x},${padTop + innerHeight} L${points[0].x},${padTop + innerHeight} Z`;

    const xLabelStep = Math.max(1, Math.ceil(points.length / 6));
    const xLabels = points.filter((_, index) => index % xLabelStep === 0 || index === points.length - 1);

    return {
      points,
      yTicks,
      yMin,
      yRange,
      padTop,
      padLeft,
      padRight,
      innerHeight,
      viewBoxWidth,
      linePath,
      areaPath,
      xLabels,
    };
  }, [data, height]);

  if (!chart) {
    return (
      <div className={`flex items-center justify-center rounded-lg border bg-muted/20 ${className}`} style={{ height }}>
        <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
      </div>
    );
  }

  const useCompactTicks = Math.abs(chart.yRange) >= 10000;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${chart.viewBoxWidth} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`view-area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {chart.yTicks.map((tick, index) => {
          const y = chart.padTop + chart.innerHeight - ((tick - chart.yMin) / chart.yRange) * chart.innerHeight;
          return (
            <g key={`${tick}-${index}`}>
              <line
                x1={chart.padLeft}
                y1={y}
                x2={chart.viewBoxWidth - chart.padRight}
                y2={y}
                stroke="hsl(var(--border))"
                strokeWidth="0.8"
                strokeDasharray={index === 0 ? undefined : "2 3"}
              />
              <text
                x={chart.padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize="10"
              >
                {formatViews(tick, useCompactTicks)}
              </text>
            </g>
          );
        })}

        <path d={chart.areaPath} fill={`url(#view-area-${gradientId})`} />

        <path
          d={chart.linePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {chart.points.map((point, index) => (
          <circle
            key={`${point.date}-${index}`}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="hsl(var(--background))"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          >
            <title>{`${point.fullLabel ?? point.label} · ${point.views.toLocaleString()}회`}</title>
          </circle>
        ))}

        {chart.xLabels.map((point, index) => (
          <text
            key={`${point.date}-label-${index}`}
            x={point.x}
            y={height - 8}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="10"
          >
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
