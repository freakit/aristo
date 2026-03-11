// backend/config/firebase.js
const admin = require("firebase-admin");
const { readFileSync } = require("fs");
const path = require("path");

const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, "../serviceAccountKey.json"), "utf8"),
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = { db, auth, storage };
