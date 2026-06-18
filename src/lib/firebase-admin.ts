import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _app:  App       | null = null;
let _auth: Auth      | null = null;
let _db:   Firestore | null = null;

function initApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY must be set in .env"
    );
  }

  _app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return _app;
}

export function getAdminAuth(): Auth {
  if (!_auth) _auth = getAuth(initApp());
  return _auth;
}

/** Firestore Admin instance — reads/writes the same 'users' collection as the mobile app */
export function getAdminDb(): Firestore {
  if (!_db) _db = getFirestore(initApp());
  return _db;
}
