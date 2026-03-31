/**
 * SourceBreakdown
 *
 * Shows where leads are coming from: form, Meta Lead Ads, manual entry, Second Street.
 * Uses horizontal bar segments proportional to count.
 */

const SOURCE_LABELS: Record<string, string> = {
  meta_lead_ad: "Meta Ads",
  form: "Landing Page",
  manual: "Manual Entry",
  second_street: "Second Street",
};

const SOURCE_COLORS: Record<string, string> = {
  meta_lead_ad: "bg-blue-500",
  form: "bg-rocket-accent",
  manual: "bg-rocket-muted",
  second_street: "bg-purple-500",
};

interface SourceCount {
  source: string;
  count: number;
}

interface SourceBreakdownProps {
  sources: SourceCount[];
  total: number;
}

export function SourceBreakdown({ sources, total }: SourceBreakdownProps) {
  if (total === 0) {
    return (
      <p className="py-4 text-center text-sm text-rocket-muted">
        No leads yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {sources.map((s) => {
          const pct = (s.count / total) * 100;
          return (
            <div
              key={s.source}
              className={`${SOURCE_COLORS[s.source] ?? "bg-rocket-border"} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${SOURCE_LABELS[s.source] ?? s.source}: ${s.count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {sources.map((s) => {
          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
          return (
            <div key={s.source} className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${SOURCE_COLORS[s.source] ?? "bg-rocket-border"}`}
              />
              <span className="text-xs text-rocket-muted">
                {SOURCE_LABELS[s.source] ?? s.source}
              </span>
              <span className="ml-auto text-xs font-medium text-rocket-dark">
                {s.count}
                <span className="ml-0.5 text-rocket-muted">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
