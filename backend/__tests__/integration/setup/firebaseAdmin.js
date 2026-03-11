// __tests__/integration/setup/firebaseAdmin.js
// Firebase Admin initialization for integration tests only (CommonJS)
// firebase.js is ESM and cannot be required directly in Jest → use this helper

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Reuse if already initialized
let db, auth;

function initFirebase() {
  if (admin.apps.length > 0) {
    const app = admin.apps[0];
    db = admin.firestore(app);
    auth = admin.auth(app);
    return { db, auth };
  }

  const keyPath = path.join(__dirname, "../../../serviceAccountKey.json");
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  db = admin.firestore(app);
  auth = admin.auth(app);
  return { db, auth };
}

module.exports = initFirebase();
