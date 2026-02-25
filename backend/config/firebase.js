import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../serviceAccountKey.json"), "utf8"),
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
