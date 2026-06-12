"use client";

import { cn } from "@/lib/utils";

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "green" | "blue" | "solid-green" | "solid-blue" | "ghost";
  size?:    "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-7 py-3.5 text-base rounded-xl",
};

function getVariantStyle(variant: string): React.CSSProperties {
  switch (variant) {
    case "green":
      return {
        background: "linear-gradient(135deg, var(--bg-input-g), transparent)",
        border:     "1px solid var(--border-g3)",
        color:      "var(--neon-green)",
      };
    case "blue":
      return {
        background: "linear-gradient(135deg, var(--bg-input), transparent)",
        border:     "1px solid var(--border-3)",
        color:      "var(--neon-blue)",
      };
    case "solid-green":
      return {
        background: "var(--neon-green)",
        border:     "1px solid var(--neon-green)",
        color:      "var(--bg-base)",
      };
    case "solid-blue":
      return {
        background: "var(--neon-blue)",
        border:     "1px solid var(--neon-blue)",
        color:      "var(--bg-base)",
      };
    case "ghost":
      return {
        background: "transparent",
        border:     "1px solid var(--border-1)",
        color:      "var(--c-text-2)",
      };
    default:
      return {};
  }
}

export default function NeonButton({
  variant  = "blue",
  size     = "md",
  loading  = false,
  children,
  className,
  disabled,
  ...props
}: NeonButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={cn(
        "font-mono font-bold tracking-wide transition-all duration-200",
        "active:scale-[0.98]",
        sizeClasses[size],
        isDisabled && "opacity-40 cursor-not-allowed !transform-none",
        !isDisabled && "hover:-translate-y-0.5",
        className,
      )}
      style={getVariantStyle(variant)}
      onMouseEnter={(e) => {
        if (isDisabled) return;
        const glow = variant.includes("green")
          ? "0 0 20px var(--border-g2), 0 0 40px var(--border-g1)"
          : variant.includes("blue")
          ? "0 0 20px var(--border-2), 0 0 40px var(--border-1)"
          : "none";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = glow;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
      }}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
          </svg>
          Processing...
        </span>
      ) : children}
    </button>
  );
}
