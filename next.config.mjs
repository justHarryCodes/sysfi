import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],

  runtimeCaching: [
    // ── Next.js static assets — cache first (they have content hashes) ────
    {
      urlPattern: /\/_next\/static\/.*/,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static",
        expiration: { maxEntries: 256, maxAgeSeconds: 365 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // ── Next.js image optimisation route ─────────────────────────────────
    {
      urlPattern: /\/_next\/image\?.*/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-images",
        expiration: { maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // ── Our MongoDB token images (/api/images/*) ──────────────────────────
    {
      urlPattern: /\/api\/images\/.*/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "token-images",
        expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // ── OG image route — skip SW, always go to network ───────────────────
    // These are server-rendered images; caching them breaks share cards
    {
      urlPattern: /\/api\/og\/.*/,
      handler: "NetworkOnly",
    },

    // ── Our token/metadata API routes — network first ─────────────────────
    {
      urlPattern: /\/api\/(tokens|metadata|tokenlist).*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-data",
        networkTimeoutSeconds: 8,
        expiration: { maxEntries: 64, maxAgeSeconds: 5 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // ── CoinGecko price + trending data ──────────────────────────────────
    {
      urlPattern: /^https:\/\/api\.coingecko\.com\/.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "coingecko",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 32, maxAgeSeconds: 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // ── Chain icons + public images (/public/*.png etc.) ─────────────────
    {
      urlPattern: /\.(png|jpg|jpeg|svg|ico|webp|gif)(\?.*)?$/,
      handler: "CacheFirst",
      options: {
        cacheName: "static-images",
        expiration: { maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // ── HTML pages — network first, fall back to cache ────────────────────
    // Keep this LAST — it's the broadest pattern
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  serverComponentsExternalPackages: ["mongodb"],

  // Allow clients that call /daos/... instead of /api/daos/... (e.g. mobile app)
  async rewrites() {
    const prefixes = [
      "daos", "proposals", "activity", "guilds",
      "tokens", "metadata", "swap", "feed", "chat",
      "mint", "stats", "health", "chains", "images",
      "tokenlist",
    ];
    return prefixes.map((p) => ({
      source: `/${p}/:path*`,
      destination: `/api/${p}/:path*`,
    }));
  },

  // Cache headers for OG images and the token list endpoint
  async headers() {
    return [
      {
        source: "/api/og/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, stale-while-revalidate=600",
          },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
      {
        source: "/api/tokenlist.json",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
          },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default pwaConfig(nextConfig);
