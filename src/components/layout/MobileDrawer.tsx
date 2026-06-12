"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { X, Rocket, Flame, Wallet, ArrowLeftRight, Users, Sun, Moon } from "lucide-react";
import Image from "next/image";
import ChainSwitcher from "./ChainSwitcher";
import { useTheme } from "@/lib/theme";

const NAV = [
  { href: "/dao",       label: "DAO",       icon: Users,          color: "blue"  },
  { href: "/",          label: "Meme Rush",  icon: Flame,          color: "green" },
  { href: "/swap",      label: "Swap",       icon: ArrowLeftRight, color: "green" },
  { href: "/launch",    label: "Launch",     icon: Rocket,         color: "green" },
  { href: "/portfolio", label: "Portfolio",  icon: Wallet,         color: "blue"  },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ open, onClose }: Props) {
  const pathname   = usePathname();
  const { theme, toggle } = useTheme();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Close when route changes (link clicked)
  useEffect(() => {
    onCloseRef.current();
  }, [pathname]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="lg:hidden fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background:    "rgba(0,0,0,0.55)",
          backdropFilter: "blur(3px)",
          opacity:        open ? 1 : 0,
          pointerEvents:  open ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="lg:hidden fixed left-0 top-0 bottom-0 z-50 flex flex-col transition-transform duration-300 ease-out"
        style={{
          width:         "280px",
          transform:     open ? "translateX(0)" : "translateX(-100%)",
          background:    "var(--bg-nav)",
          borderRight:   "1px solid var(--border-1)",
          backdropFilter: "blur(24px)",
          boxShadow:     "4px 0 32px rgba(0,0,0,0.3)",
        }}
      >
        {/* Top */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-1)", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
              <Image src="/logo.png" alt="Sysfi" width={32} height={32} className="object-contain" />
            </div>
            <span className="font-bold text-sm" style={{ fontFamily: "'Outfit', sans-serif", color: "var(--text-primary)" }}>
              Sysfi
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)", color: "var(--c-text-2)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, color }) => {
            const isActive  = pathname === href || (href !== "/" && pathname.startsWith(href));
            const neonColor = color === "green" ? "var(--neon-green)" : "var(--neon-blue)";
            const activeBg  = color === "green" ? "var(--bg-input-g)" : "var(--bg-input)";
            const activeBrd = color === "green" ? "var(--border-g2)"  : "var(--border-2)";

            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150"
                style={
                  isActive
                    ? { background: activeBg, border: `1px solid ${activeBrd}` }
                    : { background: "transparent", border: "1px solid transparent" }
                }
              >
                <Icon
                  size={22}
                  style={{
                    color:  isActive ? neonColor : "var(--c-text-2)",
                    filter: isActive ? `drop-shadow(0 0 6px ${neonColor})` : "none",
                    transition: "all 0.15s",
                  }}
                />
                <span
                  className="text-base font-medium"
                  style={{ color: isActive ? neonColor : "var(--c-text-2)", fontFamily: "'Outfit', sans-serif" }}
                >
                  {label}
                </span>
                {isActive && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: neonColor, boxShadow: `0 0 6px ${neonColor}` }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: theme toggle + chain switcher */}
        <div className="px-4 py-4 flex-shrink-0 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border-1)" }}>
          <button
            onClick={toggle}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 w-full"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)", color: "var(--c-text-2)" }}
          >
            {theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
            <span className="text-base font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>

          <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Network</p>
          <ChainSwitcher />
        </div>
      </div>
    </>
  );
}
