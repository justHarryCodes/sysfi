"use client";

import { cn } from "@/lib/utils";

interface GlassCardProps {
  children:  React.ReactNode;
  className?: string;
  glow?:     "green" | "blue" | "none";
  hover?:    boolean;
  onClick?:  () => void;
  as?:       "div" | "article" | "section";
}

export default function GlassCard({
  children,
  className,
  glow    = "none",
  hover   = false,
  onClick,
  as: Tag = "div",
}: GlassCardProps) {
  const glowStyles: Record<string, React.CSSProperties> = {
    green: {
      background:  "var(--bg-input-g)",
      border:      "1px solid var(--border-g1)",
      boxShadow:   "var(--shadow-card)",
    },
    blue: {
      background:  "var(--bg-input)",
      border:      "1px solid var(--border-1)",
      boxShadow:   "var(--shadow-card)",
    },
    none: {
      background:  "var(--bg-glass)",
      border:      "1px solid var(--border-1)",
      boxShadow:   "var(--shadow-card)",
    },
  };

  return (
    <Tag
      onClick={onClick}
      className={cn(
        "rounded-2xl backdrop-blur-xl transition-all duration-300",
        hover && "hover:scale-[1.01] cursor-pointer",
        onClick && "cursor-pointer",
        className,
      )}
      style={glowStyles[glow]}
    >
      {children}
    </Tag>
  );
}
