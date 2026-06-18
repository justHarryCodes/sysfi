"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Rocket, Flame, ArrowLeftRight, Users, GitBranch } from "lucide-react";

const NAV = [
  { href: "/dao",    label: "DAO",       icon: Users,          color: "blue"  },
  { href: "/",       label: "Meme Rush", icon: Flame,          color: "green" },
  { href: "/swap",   label: "Swap",      icon: ArrowLeftRight, color: "green" },
  { href: "/launch", label: "Launch",    icon: Rocket,         color: "green" },
  { href: "/bridge", label: "Bridge",    icon: GitBranch,      color: "green" },
] as const;

export default function MobileNav() {
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => { NAV.forEach((n) => router.prefetch(n.href)); }, [router]);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        background:     "var(--bg-nav)",
        borderTop:      "1px solid var(--border-1)",
        backdropFilter: "blur(24px)",
        boxShadow:      "var(--shadow-nav)",
        paddingBottom:  "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {NAV.map(({ href, label, icon: Icon, color }) => {
        const isActive  = pathname === href || (href !== "/" && pathname.startsWith(href));
        const neonColor = color === "green" ? "var(--neon-green)" : "var(--neon-blue)";
        return (
          <Link
            key={href}
            href={href}
            prefetch
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all active:scale-95"
          >
            <div className="relative">
              {isActive && (
                <div
                  className="absolute -inset-2 rounded-full opacity-20 blur-sm"
                  style={{ background: neonColor }}
                />
              )}
              <Icon
                size={24}
                style={{
                  color:  isActive ? neonColor : "var(--c-text-2)",
                  filter: isActive ? `drop-shadow(0 0 8px ${neonColor})` : "none",
                  transition: "all 0.15s",
                }}
              />
            </div>
            <span
              className="text-xs font-mono tracking-wide"
              style={{ color: isActive ? neonColor : "var(--c-text-2)" }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
