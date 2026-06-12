"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Sidebar        from "./Sidebar";
import MobileNav      from "./MobileNav";
import TopBar         from "./TopBar";
import TrendingBanner from "./TrendingBanner";
import RightPanel     from "./RightPanel";
import MobileDrawer   from "./MobileDrawer";

// Routes that show the right contextual panel on desktop
function hasRightPanel(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/token") ||
    pathname.startsWith("/dao") ||
    pathname.startsWith("/swap")
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer  = useCallback(() => setDrawerOpen(true),  []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const showPanel = hasRightPanel(pathname);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      {/* Ambient glow blobs */}
      <div
        className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none z-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse, var(--blob-blue) 0%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />
      <div
        className="fixed bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none z-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse, var(--blob-green) 0%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />

      {/* Trending banner — topmost strip */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <TrendingBanner />
      </div>

      {/* Desktop sidebar (fixed left) */}
      <Sidebar />

      {/* Header */}
      <TopBar onMenuClick={openDrawer} />

      {/* Desktop right contextual panel (fixed right) */}
      <RightPanel />

      {/* Mobile slide-in drawer */}
      <MobileDrawer open={drawerOpen} onClose={closeDrawer} />

      {/* Main content */}
      <main
        className="relative z-10"
        style={{ paddingTop: "calc(2rem + 76px)", paddingBottom: "80px" }}
      >
        {/*
          Desktop: offset left by sidebar (w-56 = 224px) and conditionally offset
          right by the panel width (272px) so content sits in the center column.
          Mobile: no offsets — full width with bottom-nav padding.
        */}
        <div className={`lg:pl-72 ${showPanel ? "lg:pr-[288px]" : ""}`}>
          <div className="px-4 lg:px-8 py-6 max-w-full">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
