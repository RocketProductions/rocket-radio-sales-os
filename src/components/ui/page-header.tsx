import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 animate-fade-in", className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-rocket-dark">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-rocket-muted">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
