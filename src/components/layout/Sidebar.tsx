"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Rocket, Flame, ExternalLink, ArrowLeftRight, Users, Sun, Moon, GitBranch } from "lucide-react";
import ChainSwitcher from "./ChainSwitcher";
import { useWallet } from "@/context/WalletContext";
import { useTheme } from "@/lib/theme";
import Image from "next/image";

const NAV = [
  { href: "/dao",       label: "DAO",        icon: Users,          color: "blue"  },
  { href: "/",          label: "Meme Rush",  icon: Flame,          color: "green" },
  { href: "/swap",      label: "Swap",       icon: ArrowLeftRight, color: "green" },
  { href: "/launch",    label: "Launch",     icon: Rocket,         color: "green" },
  { href: "/bridge",    label: "Bridge",     icon: GitBranch,      color: "green" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { chainMeta } = useWallet();
  const { theme, toggle } = useTheme();

  useEffect(() => { NAV.forEach((n) => router.prefetch(n.href)); }, [router]);

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-8 bottom-0 w-72 z-30"
      style={{
        background:     "var(--bg-nav)",
        borderRight:    "1px solid var(--border-1)",
        backdropFilter: "blur(20px)",
        boxShadow:      "var(--shadow-nav)",
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--border-1)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="Sysfi" width={32} height={32} className="object-contain" priority />
          </div>
          <p className="font-display font-bold text-sm tracking-wide text-text-primary">Sysfi</p>
        </div>
      </div>

      {/* Chain switcher */}
      <div className="px-3 py-3" style={{ borderBottom: "1px solid var(--border-1)" }}>
        <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">Network</p>
        <ChainSwitcher />
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon, color }) => {
          const isActive    = pathname === href || (href !== "/" && pathname.startsWith(href));
          const neonColor   = color === "green" ? "var(--neon-green)" : "var(--neon-blue)";
          const activeBg    = color === "green" ? "var(--bg-input-g)" : "var(--bg-input)";
          const activeBorder= color === "green" ? "var(--border-g2)"  : "var(--border-2)";

          return (
            <Link
              key={href}
              href={href}
              prefetch
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
              style={
                isActive
                  ? { background: activeBg, border: `1px solid ${activeBorder}` }
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
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: neonColor, boxShadow: `0 0 6px ${neonColor}` }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle + Explorer */}
      <div className="px-4 py-3 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border-1)" }}>
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 w-full"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)", color: "var(--c-text-2)" }}
        >
          {theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
          <span className="text-base font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>

        <a
          href={chainMeta.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-text-secondary hover:text-neon-blue transition-colors"
        >
          <ExternalLink size={11} />
          <span className="font-mono truncate">{chainMeta.explorerName}</span>
        </a>
        <p className="text-[10px] font-mono text-text-muted -mt-2">Chain {chainMeta.chain.id}</p>
      </div>
    </aside>
  );
}
