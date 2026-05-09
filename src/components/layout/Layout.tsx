"use client";

import Sidebar       from "./Sidebar";
import MobileNav     from "./MobileNav";
import TopBar        from "./TopBar";
import TrendingBanner from "./TrendingBanner";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      {/* Grid background texture */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)",
          backgroundSize:  "40px 40px",
        }}
      />

      {/* Ambient glow blobs */}
      <div
        className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none z-0 opacity-30"
        style={{
          background: "radial-gradient(ellipse, rgba(0,212,255,0.08) 0%, transparent 70%)",
          filter:     "blur(40px)",
        }}
      />
      <div
        className="fixed bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none z-0 opacity-30"
        style={{
          background: "radial-gradient(ellipse, rgba(0,255,135,0.08) 0%, transparent 70%)",
          filter:     "blur(40px)",
        }}
      />

      {/* Trending banner — full width, fixed at very top */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <TrendingBanner />
      </div>

      {/* Desktop sidebar (below trending banner) */}
      <Sidebar />

      {/* Top bar (below trending, right of sidebar on desktop) */}
      <TopBar />

      {/* Main content area */}
      <main
        className="relative z-10 pt-8"
        style={{
          paddingTop:    "calc(2rem + 56px)", // trending (32px) + topbar (56px)
          paddingLeft:   "0",
          paddingBottom: "80px", // space for mobile nav
        }}
      >
        <div className="lg:pl-56">
          <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
