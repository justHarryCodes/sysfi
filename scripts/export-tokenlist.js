/**
 * Generates the curated token list from tokenlist/tokens/ and writes it to
 * public/tokenlist.json so it can be served as a static file.
 *
 * Usage:
 *   node scripts/export-tokenlist.js
 *   node scripts/export-tokenlist.js --chainId 8453
 *
 * The output is a fully compliant Uniswap Token List (tokenlists.org).
 * Run this before deploying or whenever you update tokenlist/tokens/*.json.
 */

const path = require("path");
const fs   = require("fs");

const args    = process.argv.slice(2);
const cidFlag = args.indexOf("--chainId");
const chainId = cidFlag !== -1 ? Number(args[cidFlag + 1]) : null;

const buildList = require("../tokenlist/buildList");

async function main() {
  const list = await buildList();

  // Filter to a single chain if requested
  if (chainId) {
    list.tokens = list.tokens.filter((t) => t.chainId === chainId);
    list.name   = `${list.name} (Chain ${chainId})`;
  }

  const outPath = path.join(__dirname, "..", "public", "tokenlist.json");
  fs.writeFileSync(outPath, JSON.stringify(list, null, 2), "utf8");

  const count = list.tokens.length;
  console.log(`✓ Wrote ${count} tokens to public/tokenlist.json`);
  if (chainId) {
    console.log(`  (filtered to chainId ${chainId})`);
  }
}

main().catch((err) => {
  console.error("export-tokenlist failed:", err);
  process.exit(1);
});
