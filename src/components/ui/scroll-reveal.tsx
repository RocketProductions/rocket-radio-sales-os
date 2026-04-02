"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;         // ms delay before animation starts
  duration?: number;      // ms transition duration (default 600)
  direction?: "up" | "left" | "right" | "none"; // slide direction
  threshold?: number;     // 0-1, how much visible before triggering
}

const DIRECTION_CLASSES: Record<string, string> = {
  up:    "translate-y-6",
  left:  "-translate-x-6",
  right: "translate-x-6",
  none:  "",
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  duration = 600,
  direction = "up",
  threshold = 0.15,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all ease-out sr-animated",
        visible ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${DIRECTION_CLASSES[direction]}`,
        "print:opacity-100 print:translate-x-0 print:translate-y-0",
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
