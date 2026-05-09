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
      background:  "rgba(0,255,135,0.03)",
      border:      "1px solid rgba(0,255,135,0.12)",
      boxShadow:   "0 8px 32px rgba(0,0,0,0.5), 0 0 30px rgba(0,255,135,0.05), inset 0 1px 0 rgba(0,255,135,0.06)",
    },
    blue: {
      background:  "rgba(0,212,255,0.03)",
      border:      "1px solid rgba(0,212,255,0.12)",
      boxShadow:   "0 8px 32px rgba(0,0,0,0.5), 0 0 30px rgba(0,212,255,0.05), inset 0 1px 0 rgba(0,212,255,0.06)",
    },
    none: {
      background:  "rgba(13,13,31,0.7)",
      border:      "1px solid rgba(0,212,255,0.08)",
      boxShadow:   "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
    },
  };

  return (
    <Tag
      onClick={onClick}
      className={cn(
        "rounded-2xl backdrop-blur-xl transition-all duration-300",
        hover && "hover:scale-[1.01] cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
      style={glowStyles[glow]}
    >
      {children}
    </Tag>
  );
}
