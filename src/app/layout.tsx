import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/providers";
import Layout from "@/components/layout/Layout";
import { ThemeProvider } from "@/lib/theme";

export const metadata: Metadata = {
  title: {
    default: "Sysfi — Token Launchpad",
    template: "%s | Sysfi", // individual pages can set their own title
  },
  description:
    "Launch and trade tokens on Base with a bonding curve. " +
    "Tokens automatically graduate to Uniswap V3 when they reach 10 ETH.",
  keywords: [
    "token launchpad",
    "bonding curve",
    "defi",
    "base",
    "uniswap",
    "meme coins",
  ],
  authors: [{ name: "Sysfi" }],

  // ── Open Graph (WhatsApp, Telegram, Discord link previews) ─────────────────
  openGraph: {
    type: "website",
    siteName: "Sysfi",
    title: "Sysfi — Token Launchpad",
    description:
      "Launch tokens with a bonding curve on Base. Auto-graduates to Uniswap V3.",
    url: "https://app.sysfidao.com", // ← change to your domain
    images: [
      {
        url: "/og-image.png", // put a 1200×630 image in /public/
        width: 1200,
        height: 630,
        alt: "Sysfi Token Launchpad",
      },
    ],
  },

  // ── Twitter / X card ───────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "Sysfi — Token Launchpad",
    description: "Launch tokens with a bonding curve on Base.",
    images: ["/og-image.png"],

  },

  // ── Favicon + app icons ────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-16.jpg", sizes: "16x16", type: "image/png" },
      { url: "/icon-32.jpg", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.jpg", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png", // 180×180 for iOS home screen
  },

  // ── PWA manifest ───────────────────────────────────────────────────────────
  manifest: "/site.webmanifest",

  // ── Misc ───────────────────────────────────────────────────────────────────
  metadataBase: new URL("https://app.sysfidao.com"), // ← change to your domain
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Providers>
            <Layout>{children}</Layout>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
