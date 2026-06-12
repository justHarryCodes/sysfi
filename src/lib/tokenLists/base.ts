// tokenLists/base.js
// Single source of truth for Base mainnet (8453) swap tokens.
// Data lives in tokens/base.json — do not duplicate it here.

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const baseTokens = require("../tokens/base.json");
export default baseTokens;
