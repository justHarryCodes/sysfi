import type { Metadata } from "next";
import TokenPageClient from "./TokenPageClient";
import { getDb, METADATA_COL } from "@/lib/mongodb";

interface Props {
  params: { address: string };
}

// ─── Dynamic metadata for social share cards ──────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pool = params.address.toLowerCase();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com";

  // Defaults — shown if MongoDB lookup fails
  let name = "Token on Sysfi";
  let symbol = "TOKEN";
  let description =
    "Trade this token on Sysfi — the bonding-curve launchpad on Base.";

  try {
    const db = await getDb();
    const doc = await db
      .collection(METADATA_COL)
      .findOne(
        { poolAddress: pool },
        { projection: { name: 1, symbol: 1, description: 1, _id: 0 } },
      );

    if (doc) {
      if (doc.name) name = doc.name;
      if (doc.symbol) symbol = doc.symbol;
      if (doc.description) description = doc.description;
    }
  } catch {
    /* MongoDB not available — use defaults */
  }

  const title = `${name} ($${symbol}) | Sysfi`;
  const ogImgUrl = `${appUrl}/api/og/token/${pool}`;
  const pageUrl = `${appUrl}/token/${pool}`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "Sysfi",
      title,
      description,
      url: pageUrl,
      images: [
        {
          url: ogImgUrl,
          width: 1200,
          height: 630,
          alt: `${name} on Sysfi`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImgUrl],
      site: "@sysfi", // ← change to your Twitter handle
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TokenPage() {
  return <TokenPageClient />;
}
