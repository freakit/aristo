// backend/repositories/sessions.repository.js
const { db } = require("../config/firebase");

class SessionsRepository {
  // 세션 생성
  async createSession({ uid, title, vectorDocIds }) {
    const docRef = db.collection("sessions").doc();
    const now = new Date().toISOString();
    const data = {
      uid,
      title: title || "새 학습 세션",
      vectorDocIds: vectorDocIds || [],
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await docRef.set(data);
    return { sessionId: docRef.id, ...data };
  }

  // 내 세션 목록 조회 (최신순, 페이지네이션)
  async getSessionsByUid(uid, { limit = 20, before = null } = {}) {
    let query = db
      .collection("sessions")
      .where("uid", "==", uid);

    const snap = await query.get();
    let docs = snap.docs.map((doc) => ({ sessionId: doc.id, ...doc.data() }));
    docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (before) {
      const idx = docs.findIndex(d => d.sessionId === before);
      if (idx !== -1) {
        docs = docs.slice(idx + 1);
      }
    }

    return docs.slice(0, limit);
  }

  // 세션 단건 조회
  async getSessionById(sessionId) {
    const snap = await db.collection("sessions").doc(sessionId).get();
    if (!snap.exists) return null;
    return { sessionId: snap.id, ...snap.data() };
  }

  // 세션 종료
  async endSession(sessionId) {
    const ref = db.collection("sessions").doc(sessionId);
    await ref.update({ status: "ended", updatedAt: new Date().toISOString() });
    const snap = await ref.get();
    return { sessionId: snap.id, ...snap.data() };
  }

  // 세션 삭제 (메시지 서브컬렉션 포함)
  async deleteSession(sessionId) {
    const sessionRef = db.collection("sessions").doc(sessionId);

    // 서브컬렉션 메시지 일괄 삭제
    const messagesSnap = await sessionRef.collection("messages").get();
    const batch = db.batch();
    messagesSnap.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(sessionRef);
    await batch.commit();
  }

  // 메시지 추가
  async addMessage(sessionId, { role, content, turn }) {
    const msgRef = db
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .doc();
    const data = {
      role,
      content,
      turn,
      createdAt: new Date().toISOString(),
    };
    await msgRef.set(data);

    // 세션 updatedAt 갱신
    await db
      .collection("sessions")
      .doc(sessionId)
      .update({ updatedAt: data.createdAt });

    return { msgId: msgRef.id, ...data };
  }

  // 세션의 전체 메시지 조회 (순서대로)
  async getMessages(sessionId) {
    const snap = await db
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .orderBy("turn", "asc")
      .get();
    return snap.docs.map((doc) => ({ msgId: doc.id, ...doc.data() }));
  }
}

module.exports = new SessionsRepository();
