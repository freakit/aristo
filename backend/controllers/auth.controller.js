// backend/controllers/auth.controller.js
const { db, auth } = require("../config/firebase");
const logger = require("../config/logger");

class AuthController {
  // POST /api/auth/register
  // Firebase 로그인 후 Firestore에 프로필 없으면 등록
  async register(req, res, next) {
    try {
      const { name } = req.body;
      const uid = req.uid; // Firebase auth 미들웨어에서 주입

      const userRef = db.collection("users").doc(uid);
      const snap = await userRef.get();

      if (snap.exists) {
        return res.status(200).json(snap.data());
      }

      const firebaseUser = await auth.getUser(uid);
      const profile = {
        uid,
        email: firebaseUser.email,
        name: name || firebaseUser.displayName || "",
        photoURL: firebaseUser.photoURL || null,
        provider:
          firebaseUser.providerData?.[0]?.providerId === "google.com"
            ? "google"
            : "email",
        createdAt: new Date().toISOString(),
      };

      await userRef.set(profile);
      res.status(201).json(profile);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/auth/me
  async me(req, res, next) {
    try {
      const uid = req.uid;
      const snap = await db.collection("users").doc(uid).get();

      if (!snap.exists) {
        const err = new Error("유저를 찾을 수 없습니다.");
        err.statusCode = 404;
        return next(err);
      }

      res.status(200).json(snap.data());
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
