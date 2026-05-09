import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getDb, METADATA_COL } from "@/lib/mongodb";
import { hasPG, query } from "@/lib/postgres";

export const runtime = "nodejs"; // nodejs so we can hit MongoDB

export async function GET(
  req: NextRequest,
  { params }: { params: { pool: string } },
) {
  const pool = params.pool.toLowerCase();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  // ── Fetch token data ───────────────────────────────────────────────────────
  let name = "Unknown Token";
  let symbol = "???";
  let description = "";
  let priceStr = "";
  let fdvStr = "";
  let progressPct = 0;
  let graduated = false;
  let hasLogo = false;
  let logoSrc = "";

  try {
    // MongoDB metadata
    const db = await getDb();
    const doc = await db
      .collection(METADATA_COL)
      .findOne(
        { poolAddress: pool },
        { projection: { name: 1, symbol: 1, description: 1, logoData: 1 } },
      );

    if (doc) {
      if (doc.name) name = doc.name;
      if (doc.symbol) symbol = doc.symbol;
      if (doc.description) description = doc.description.slice(0, 120);
      if (doc.logoData && doc.logoData.length > 0) {
        hasLogo = true;
        logoSrc = doc.logoData; // data URL — works directly in <img>
      }
    }
  } catch {
    /* ignore */
  }

  try {
    // PostgreSQL pool stats for price + progress
    if (hasPG()) {
      const rows = await query<{
        price_wei: string;
        pool_eth: string;
        graduated: boolean;
        name: string | null;
        symbol: string | null;
      }>(
        `SELECT ps.price_wei, ps.pool_eth, ps.graduated, t.name, t.symbol
         FROM pool_stats ps
         JOIN tokens t ON t.pool_address = ps.pool_address AND t.chain_id = ps.chain_id
         WHERE ps.pool_address = $1
         LIMIT 1`,
        [pool],
      );

      if (rows && rows[0]) {
        const r = rows[0];
        if (!name || name === "Unknown Token") name = r.name ?? name;
        if (symbol === "???") symbol = r.symbol ?? symbol;

        graduated = r.graduated;

        const priceETH = Number(r.price_wei) / 1e18;
        const poolETH = Number(r.pool_eth) / 1e18;

        // Format price
        if (priceETH > 0) {
          if (priceETH < 0.000001)
            priceStr = `${priceETH.toExponential(2)} ETH`;
          else priceStr = `${priceETH.toPrecision(4)} ETH`;
        }

        // FDV (1B supply)
        const fdvETH = priceETH * 1_000_000_000;
        if (fdvETH >= 1e6) fdvStr = `$${(fdvETH / 1e6).toFixed(2)}M FDV`;
        else if (fdvETH >= 1e3) fdvStr = `$${(fdvETH / 1e3).toFixed(2)}K FDV`;
        else if (fdvETH > 0) fdvStr = `$${fdvETH.toFixed(2)} FDV`;

        // Progress toward 10 ETH graduation
        progressPct = Math.min(100, (poolETH / 10) * 100);
      }
    }
  } catch {
    /* ignore */
  }

  // ── Render OG image ────────────────────────────────────────────────────────
  return new ImageResponse(
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        background: "#060611",
        fontFamily: "sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow blobs */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          left: "-100px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(0,212,255,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-100px",
          right: "-100px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(0,255,135,0.1) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Card container */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "48px 56px",
        }}
      >
        {/* Top row: logo + name + symbol */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "28px",
            marginBottom: "32px",
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: "96px",
              height: "96px",
              borderRadius: "20px",
              overflow: "hidden",
              border: graduated
                ? "2px solid rgba(0,255,135,0.5)"
                : "2px solid rgba(0,212,255,0.4)",
              background: "rgba(0,212,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={symbol}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span
                style={{ fontSize: "36px", fontWeight: 800, color: "#00d4ff" }}
              >
                {symbol.slice(0, 2)}
              </span>
            )}
          </div>

          {/* Name + symbol + graduated badge */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{
                  fontSize: "42px",
                  fontWeight: 800,
                  color: "#e2e8f0",
                  lineHeight: 1,
                }}
              >
                {name}
              </span>
              {graduated && (
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: "8px",
                    background: "rgba(0,255,135,0.15)",
                    border: "1px solid rgba(0,255,135,0.4)",
                    color: "#00ff87",
                  }}
                >
                  🎓 Graduated
                </span>
              )}
            </div>
            <span
              style={{ fontSize: "22px", color: "#64748b", fontWeight: 600 }}
            >
              ${symbol}
            </span>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p
            style={{
              fontSize: "18px",
              color: "#94a3b8",
              lineHeight: 1.5,
              marginBottom: "28px",
              maxWidth: "800px",
            }}
          >
            {description}
          </p>
        )}

        {/* Stats row */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "32px" }}>
          {priceStr && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "16px 24px",
                borderRadius: "14px",
                background: "rgba(0,212,255,0.06)",
                border: "1px solid rgba(0,212,255,0.15)",
                minWidth: "180px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "4px",
                }}
              >
                Price
              </span>
              <span
                style={{ fontSize: "20px", fontWeight: 700, color: "#00d4ff" }}
              >
                {priceStr}
              </span>
            </div>
          )}
          {fdvStr && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "16px 24px",
                borderRadius: "14px",
                background: "rgba(0,255,135,0.06)",
                border: "1px solid rgba(0,255,135,0.15)",
                minWidth: "180px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "4px",
                }}
              >
                FDV
              </span>
              <span
                style={{ fontSize: "20px", fontWeight: 700, color: "#00ff87" }}
              >
                {fdvStr}
              </span>
            </div>
          )}
          {!graduated && progressPct > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "16px 24px",
                borderRadius: "14px",
                background: "rgba(0,212,255,0.06)",
                border: "1px solid rgba(0,212,255,0.15)",
                minWidth: "220px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "8px",
                }}
              >
                Graduation {progressPct.toFixed(1)}%
              </span>
              {/* Progress bar */}
              <div
                style={{
                  height: "8px",
                  borderRadius: "4px",
                  background: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progressPct}%`,
                    borderRadius: "4px",
                    background: "linear-gradient(90deg, #00d4ff, #00ff87)",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom: branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background:
                  "linear-gradient(135deg, rgba(0,255,135,0.3), rgba(0,212,255,0.3))",
                border: "1px solid rgba(0,255,135,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "14px" }}>⚡</span>
            </div>
            <span
              style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0" }}
            >
              Sysfi
            </span>
            <span style={{ fontSize: "14px", color: "#475569" }}>
              · Token Launchpad
            </span>
          </div>
          <span
            style={{
              fontSize: "13px",
              color: "#334155",
              fontFamily: "monospace",
            }}
          >
            {pool.slice(0, 6)}…{pool.slice(-4)}
          </span>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
