// backend/repositories/users.repository.js
const { db } = require("../config/firebase");

class UsersRepository {
  // Get user document by uid
  async getUser(uid) {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return null;
    return snap.data();
  }

  // Create user document
  async createUser(uid, profile) {
    await db.collection("users").doc(uid).set(profile);
    return profile;
  }
}

module.exports = new UsersRepository();
