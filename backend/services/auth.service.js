// backend/services/auth.service.js
const { auth } = require("../config/firebase");
const usersRepository = require("../repositories/users.repository");

class AuthService {
  // Firebase 로그인 후 Firestore에 프로필 없으면 등록
  async registerUser({ uid, name }) {
    const existing = await usersRepository.getUser(uid);
    if (existing) return { profile: existing, created: false };

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

    await usersRepository.createUser(uid, profile);
    return { profile, created: true };
  }

  // 내 프로필 조회
  async getProfile(uid) {
    const profile = await usersRepository.getUser(uid);
    if (!profile) {
      const err = new Error("유저를 찾을 수 없습니다.");
      err.statusCode = 404;
      throw err;
    }
    return profile;
  }
}

module.exports = new AuthService();
