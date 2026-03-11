// __tests__/integration/setup/firebaseAdmin.js
// 통합 테스트 전용 Firebase Admin 초기화 (CommonJS)
// firebase.js는 ESM이라 Jest에서 직접 require 불가 → 이 헬퍼 사용

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// 이미 초기화된 앱이면 재사용
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
