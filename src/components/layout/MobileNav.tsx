"use client";

import Link           from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect }  from "react";
import { Rocket, LayoutGrid, Wallet } from "lucide-react";

const NAV = [
  { href: "/",          label: "Explore",   icon: LayoutGrid, color: "blue"  },
  { href: "/launch",    label: "Launch",    icon: Rocket,     color: "green" },
  { href: "/portfolio", label: "Portfolio", icon: Wallet,     color: "blue"  },
] as const;

export default function MobileNav() {
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => { NAV.forEach(n => router.prefetch(n.href)); }, [router]);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        background:    "rgba(6,6,17,0.98)",
        borderTop:     "1px solid rgba(0,212,255,0.12)",
        backdropFilter:"blur(24px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
      {NAV.map(({ href, label, icon: Icon, color }) => {
        const isActive  = pathname === href || (href !== "/" && pathname.startsWith(href));
        const neonColor = color === "green" ? "var(--neon-green)" : "var(--neon-blue)";
        return (
          <Link key={href} href={href} prefetch
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all active:scale-95">
            <div className="relative">
              {isActive && (
                <div className="absolute -inset-2 rounded-full opacity-20 blur-sm" style={{ background: neonColor }} />
              )}
              <Icon size={20} style={{ color: isActive ? neonColor : "#475569", filter: isActive ? `drop-shadow(0 0 8px ${neonColor})` : "none", transition: "all 0.15s" }} />
            </div>
            <span className="text-[10px] font-mono tracking-wide"
              style={{ color: isActive ? neonColor : "#475569", textShadow: isActive ? `0 0 8px ${neonColor}` : "none" }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
