// backend/repositories/users.repository.js
const { db } = require("../config/firebase");

class UsersRepository {
  // uid로 유저 문서 조회
  async getUser(uid) {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return null;
    return snap.data();
  }

  // 유저 문서 생성
  async createUser(uid, profile) {
    await db.collection("users").doc(uid).set(profile);
    return profile;
  }
}

module.exports = new UsersRepository();
