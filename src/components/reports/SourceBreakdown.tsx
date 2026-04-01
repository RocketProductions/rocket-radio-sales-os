/**
 * SourceBreakdown
 *
 * Shows where leads heard about the business — from the
 * "How did you hear about us?" form field.
 */

const SOURCE_COLORS: Record<string, string> = {
  "Radio ad":                  "bg-rocket-accent",
  "Facebook / Instagram":      "bg-blue-500",
  "Google search":             "bg-emerald-500",
  "Friend or family":          "bg-purple-500",
  "Drove past / saw a sign":   "bg-amber-500",
  "Other":                     "bg-slate-400",
  "Not specified":             "bg-rocket-border",
};

const FALLBACK_COLORS = [
  "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-lime-500", "bg-rose-500",
];

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

  let fallbackIdx = 0;
  function getColor(source: string) {
    if (SOURCE_COLORS[source]) return SOURCE_COLORS[source];
    const color = FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length];
    fallbackIdx++;
    return color;
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
              className={`${getColor(s.source)} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${s.source}: ${s.count}`}
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
                className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${getColor(s.source)}`}
              />
              <span className="text-xs text-rocket-muted truncate">
                {s.source}
              </span>
              <span className="ml-auto text-xs font-medium text-rocket-dark whitespace-nowrap">
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
