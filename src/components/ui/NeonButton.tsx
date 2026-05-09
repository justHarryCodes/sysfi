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

const variantStyles: Record<string, React.CSSProperties> = {
  green: {
    background: "linear-gradient(135deg, rgba(0,255,135,0.1), rgba(0,255,135,0.04))",
    border:     "1px solid rgba(0,255,135,0.4)",
    color:      "#00ff87",
  },
  blue: {
    background: "linear-gradient(135deg, rgba(0,212,255,0.1), rgba(0,212,255,0.04))",
    border:     "1px solid rgba(0,212,255,0.4)",
    color:      "#00d4ff",
  },
  "solid-green": {
    background: "#00ff87",
    border:     "1px solid #00ff87",
    color:      "#060611",
  },
  "solid-blue": {
    background: "#00d4ff",
    border:     "1px solid #00d4ff",
    color:      "#060611",
  },
  ghost: {
    background: "transparent",
    border:     "1px solid rgba(255,255,255,0.08)",
    color:      "#64748b",
  },
};

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
        className
      )}
      style={{
        ...variantStyles[variant],
        ...(isDisabled ? {} : {
          textShadow: variant === "green" || variant === "solid-green"
            ? "0 0 10px rgba(0,255,135,0.3)"
            : variant === "blue" || variant === "solid-blue"
              ? "0 0 10px rgba(0,212,255,0.3)"
              : "none",
        }),
      }}
      onMouseEnter={(e) => {
        if (isDisabled) return;
        const glow = variant.includes("green")
          ? "0 0 20px rgba(0,255,135,0.4), 0 0 40px rgba(0,255,135,0.1)"
          : variant.includes("blue")
            ? "0 0 20px rgba(0,212,255,0.4), 0 0 40px rgba(0,212,255,0.1)"
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
