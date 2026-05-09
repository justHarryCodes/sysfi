#!/usr/bin/env node
/**
 * Exports the current token list to public/tokenlist.json
 *
 * Usage:
 *   node scripts/export-tokenlist.js
 *   node scripts/export-tokenlist.js --chainId 84532
 *
 * The output file follows the Uniswap Token List standard and can be
 * submitted to https://tokenlists.org or used as a custom list in any
 * DEX that supports the standard (Uniswap, 1inch, Matcha, etc.)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");

// ── Load .env.local ───────────────────────────────────────────────────────────
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) return;
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    });
}

const args = process.argv.slice(2);
const cidxArg = args.indexOf("--chainId");
const chainId = cidxArg >= 0 ? args[cidxArg + 1] : "";

const port = process.env.PORT ?? 3000;
const url = chainId
  ? `http://localhost:${port}/api/tokenlist.json?chainId=${chainId}`
  : `http://localhost:${port}/api/tokenlist.json`;

console.log(`\n📋  Exporting token list from ${url} …`);

http
  .get(url, (res) => {
    let body = "";
    res.on("data", (chunk) => {
      body += chunk;
    });
    res.on("end", () => {
      try {
        const json = JSON.parse(body);
        const outPath = path.join(__dirname, "..", "public", "tokenlist.json");
        fs.writeFileSync(outPath, JSON.stringify(json, null, 2), "utf8");

        console.log(`✅  Exported ${json.tokens.length} tokens`);
        console.log(
          `    version  : ${json.version.major}.${json.version.minor}.${json.version.patch}`,
        );
        console.log(`    timestamp: ${json.timestamp}`);
        console.log(`    saved to : public/tokenlist.json\n`);
      } catch (e) {
        console.error("❌  Failed to parse response:", e.message);
        console.error("    Make sure the dev server is running: npm run dev");
        process.exit(1);
      }
    });
  })
  .on("error", (err) => {
    console.error("❌  Request failed:", err.message);
    console.error("    Make sure the dev server is running: npm run dev");
    process.exit(1);
  });
