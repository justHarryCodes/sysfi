/**
 * MongoDB connection — singleton with hot-reload-safe globalThis caching.
 *
 * Collections
 * ───────────
 *  token_metadata  – one document per (poolAddress, chainId)
 *                    stores name, symbol, description, socials, AND image data URLs
 *  (images are embedded directly to avoid extra round-trips)
 *
 * Indexes created on first write:
 *   token_metadata: unique (poolAddress, chainId)
 */

import { MongoClient, type MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error(
    "MONGODB_URI is not set in .env.local\n" +
    "Example: mongodb+srv://user:pass@cluster.mongodb.net/launchpad"
  );
}

const options: MongoClientOptions = {
  maxPoolSize:             10,
  serverSelectionTimeoutMS:5_000,
  socketTimeoutMS:         45_000,
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!globalThis._mongoClientPromise) {
    globalThis._mongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = globalThis._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri, options).connect();
}

export default clientPromise;

export const METADATA_COL = "token_metadata";

/** Primary DB — all writes go here. */
export async function getDb() {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME ?? "mongodb-database-sysfi");
}

/**
 * Legacy / default DB — the MongoDB "test" db that was used before
 * MONGODB_DB_NAME was set. Used only as a read fallback for images.
 */
export async function getLegacyDb() {
  const client = await clientPromise;
  return client.db("test");
}

/** Shape of a document in token_metadata */
export interface MetadataDoc {
  poolAddress:    string;
  chainId:        number;
  tokenAddress:   string;
  creatorAddress: string;
  name:           string;
  symbol:         string;
  description:    string;
  logoUrl:        string;   // Cloudinary CDN URL — preferred
  bannerUrl:      string;   // Cloudinary CDN URL — preferred
  logoData:       string;   // base64 JPEG data URL — legacy fallback
  bannerData:     string;   // base64 JPEG data URL — legacy fallback
  website:        string;
  twitter:        string;
  telegram:       string;
  discord:        string;
  createdAt:      Date;
  updatedAt:      Date;
}
