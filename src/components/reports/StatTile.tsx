/**
 * StatTile
 *
 * A compact metric tile for the reporting dashboard.
 * Shows a big number + label + optional trend indicator.
 */

interface StatTileProps {
  label: string;
  value: number | string;
  unit?: string;          // e.g. "%" or "days"
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;    // e.g. "+12 from last month"
  accent?: boolean;       // Highlight tile with accent color
}

export function StatTile({ label, value, unit, trend, trendLabel, accent }: StatTileProps) {
  const trendColor =
    trend === "up"
      ? "text-rocket-success"
      : trend === "down"
        ? "text-rocket-danger"
        : "text-rocket-muted";

  return (
    <div
      className={`rounded-lg border p-4 ${
        accent
          ? "border-rocket-accent bg-rocket-accent/5"
          : "border-rocket-border bg-white"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-rocket-muted">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-rocket-dark">{value}</span>
        {unit && <span className="text-sm text-rocket-muted">{unit}</span>}
      </div>
      {trendLabel && (
        <p className={`mt-1 text-xs ${trendColor}`}>{trendLabel}</p>
      )}
    </div>
  );
}
