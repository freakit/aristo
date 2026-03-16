// backend/services/auth.service.js
const { auth } = require("../config/firebase");
const usersRepository = require("../repositories/users.repository");

class AuthService {
  // After Firebase login, register profile in Firestore if not exists
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

  // Retrieve own profile
  async getProfile(uid) {
    const profile = await usersRepository.getUser(uid);
    if (!profile) {
      const err = new Error("User not found.");
      err.statusCode = 404;
      throw err;
    }
    return profile;
  }
}

module.exports = new AuthService();
