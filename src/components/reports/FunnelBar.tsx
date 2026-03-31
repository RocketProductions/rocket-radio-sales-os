/**
 * FunnelBar
 *
 * A single stage in the lead funnel.
 * Shows: stage label, count, percentage of total, and a filled bar.
 */

interface FunnelBarProps {
  label: string;
  count: number;
  total: number;
  color: string;   // Tailwind bg class: "bg-rocket-blue", "bg-rocket-accent", etc.
  sublabel?: string;
}

export function FunnelBar({ label, count, total, color, sublabel }: FunnelBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-sm font-medium text-rocket-dark">{label}</span>
          {sublabel && (
            <span className="ml-2 text-xs text-rocket-muted">{sublabel}</span>
          )}
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-rocket-dark">{count}</span>
          <span className="ml-1 text-xs text-rocket-muted">{pct}%</span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-rocket-border">
        <div
          className={`h-2 rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
