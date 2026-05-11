"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Rocket, LayoutGrid, Wallet, Zap, ExternalLink } from "lucide-react";
import { useETHPrice } from "@/hooks/useETHPrice";
import { formatUSD } from "@/lib/utils";
import ChainSwitcher from "./ChainSwitcher";
import { useWallet } from "@/context/WalletContext";
import Image from "next/image";

const NAV = [
  { href: "/", label: "Explore", icon: LayoutGrid, color: "blue" },
  { href: "/launch", label: "Launch", icon: Rocket, color: "green" },
  { href: "/portfolio", label: "Portfolio", icon: Wallet, color: "blue" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { chainMeta } = useWallet();

  useEffect(() => {
    NAV.forEach((n) => router.prefetch(n.href));
  }, [router]);

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-8 bottom-0 w-56 z-30"
      style={{
        background: "rgba(6,6,17,0.95)",
        borderRight: "1px solid rgba(0,212,255,0.08)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Logo */}
      <div
        className="px-5 py-5 border-b"
        style={{ borderColor: "rgba(0,212,255,0.08)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <Image
              src="/logo.png"
              alt="LaunchPad Logo"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <p className="font-display font-bold text-sm tracking-wide text-text-primary">
              Sysfi
            </p>
          </div>
        </div>
      </div>

      {/* Chain switcher */}
      <div
        className="px-3 py-3 border-b"
        style={{ borderColor: "rgba(0,212,255,0.06)" }}
      >
        <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">
          Network
        </p>
        <ChainSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon, color }) => {
          const isActive =
            pathname === href || (href !== "/" && pathname.startsWith(href));
          const neonColor =
            color === "green" ? "var(--neon-green)" : "var(--neon-blue)";

          return (
            <Link
              key={href}
              href={href}
              prefetch
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
              style={
                isActive
                  ? {
                      background:
                        color === "green"
                          ? "rgba(0,255,135,0.08)"
                          : "rgba(0,212,255,0.08)",
                      border: `1px solid ${color === "green" ? "rgba(0,255,135,0.2)" : "rgba(0,212,255,0.2)"}`,
                    }
                  : {
                      background: "transparent",
                      border: "1px solid transparent",
                    }
              }
            >
              <Icon
                size={18}
                style={{
                  color: isActive ? neonColor : "#64748b",
                  filter: isActive
                    ? `drop-shadow(0 0 6px ${neonColor})`
                    : "none",
                  transition: "all 0.15s",
                }}
              />
              <span
                className="text-sm font-medium"
                style={{
                  color: isActive ? neonColor : "#64748b",
                  fontFamily: "'Outfit', sans-serif",
                  textShadow: isActive ? `0 0 10px ${neonColor}40` : "none",
                }}
              >
                {label}
              </span>
              {isActive && (
                <div
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{
                    background: neonColor,
                    boxShadow: `0 0 6px ${neonColor}`,
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Explorer link */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: "rgba(0,212,255,0.08)" }}
      >
        <a
          href={chainMeta.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-text-secondary hover:text-neon-blue transition-colors"
        >
          <ExternalLink size={11} />
          <span className="font-mono truncate">{chainMeta.explorerName}</span>
        </a>
        <p className="text-[10px] font-mono text-text-muted mt-1">
          Chain {chainMeta.chain.id}
        </p>
      </div>
    </aside>
  );
}
