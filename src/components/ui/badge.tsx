import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-rocket-blue text-white",
        secondary: "border-transparent bg-rocket-bg text-rocket-dark",
        success: "border-transparent bg-rocket-success-bright/10 text-rocket-success",
        warning: "border-transparent bg-rocket-accent-bright/10 text-rocket-accent",
        destructive: "border-transparent bg-rocket-danger/10 text-rocket-danger",
        outline: "border-rocket-border text-rocket-dark",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
