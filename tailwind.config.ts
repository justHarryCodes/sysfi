import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        "bg-base": "#060611",
        "bg-surface": "#0d0d1f",
        "bg-card": "#10102a",
        // Neon accents
        "neon-green": "#00ff87",
        "neon-blue": "#00d4ff",
        "neon-purple": "#7b2fff",
        "neon-pink": "#ff2d78",
        // Semantic
        "green-dim": "#00ff8730",
        "blue-dim": "#00d4ff30",
        // Text
        "text-primary": "#e2e8f0",
        "text-secondary": "#64748b",
        "text-muted": "#334155",
        // Border
        "border-glass": "rgba(0,212,255,0.12)",
        "border-green": "rgba(0,255,135,0.2)",
      },
      fontFamily: {
        display: ["'Exo 2'", "sans-serif"],
        body: ["'Outfit'", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
        "glow-green":
          "radial-gradient(ellipse at center, rgba(0,255,135,0.15) 0%, transparent 70%)",
        "glow-blue":
          "radial-gradient(ellipse at center, rgba(0,212,255,0.15) 0%, transparent 70%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(16,16,42,0.9) 0%, rgba(10,10,26,0.95) 100%)",
        "neon-border-green":
          "linear-gradient(90deg, transparent, #00ff87, transparent)",
        "neon-border-blue":
          "linear-gradient(90deg, transparent, #00d4ff, transparent)",
      },
      backgroundSize: {
        "grid-sm": "20px 20px",
        "grid-md": "40px 40px",
      },
      boxShadow: {
        "neon-green":
          "0 0 20px rgba(0,255,135,0.4), 0 0 60px rgba(0,255,135,0.15)",
        "neon-blue":
          "0 0 20px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.15)",
        "neon-green-sm": "0 0 10px rgba(0,255,135,0.3)",
        "neon-blue-sm": "0 0 10px rgba(0,212,255,0.3)",
        glass:
          "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
        "glass-hover":
          "0 16px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)",
        "inner-glow-green": "inset 0 0 20px rgba(0,255,135,0.05)",
        "inner-glow-blue": "inset 0 0 20px rgba(0,212,255,0.05)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      animation: {
        ticker: "ticker 100s linear infinite", // ← was 30s
        "pulse-green": "pulseGreen 2s ease-in-out infinite",
        "pulse-blue": "pulseBlue 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        scan: "scan 8s linear infinite",
        "glow-breathe": "glowBreathe 3s ease-in-out infinite",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.4s ease-out",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulseGreen: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(0,255,135,0.3)" },
          "50%": {
            boxShadow:
              "0 0 25px rgba(0,255,135,0.6), 0 0 50px rgba(0,255,135,0.2)",
          },
        },
        pulseBlue: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(0,212,255,0.3)" },
          "50%": {
            boxShadow:
              "0 0 25px rgba(0,212,255,0.6), 0 0 50px rgba(0,212,255,0.2)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        glowBreathe: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
