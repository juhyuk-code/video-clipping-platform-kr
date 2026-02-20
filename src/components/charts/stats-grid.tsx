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
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 4
        ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid gap-3 ${gridCols} ${className}`}>
      {stats.map((stat, i) => (
        <div key={i} className="rounded-lg border bg-card p-3.5">
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className={`mt-1 text-2xl font-semibold tracking-tight ${stat.color ?? ""}`}>{stat.value}</p>
          {stat.sub && <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>}
        </div>
      ))}
    </div>
  );
}
