interface StatItem {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({ stats, columns = 3, className = "" }: StatsGridProps) {
  const gridCols =
    columns === 2
      ? "grid-cols-2"
      : columns === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-3";

  return (
    <div className={`grid gap-3 ${gridCols} ${className}`}>
      {stats.map((stat, i) => (
        <div key={i} className="rounded-lg border p-3 text-center">
          <p className={`text-lg font-bold ${stat.color ?? ""}`}>{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          {stat.sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{stat.sub}</p>}
        </div>
      ))}
    </div>
  );
}
