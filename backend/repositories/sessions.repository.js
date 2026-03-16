// backend/repositories/sessions.repository.js
const { db } = require("../config/firebase");

class SessionsRepository {
  // Create session
  async createSession({ uid, title, vectorDocIds, vectorKeys, studyGoals }) {
    const docRef = db.collection("sessions").doc();
    const now = new Date().toISOString();
    const data = {
      uid,
      title: title || "New Learning Session",
      vectorDocIds: vectorDocIds || [],
      vectorKeys: vectorKeys || [],
      studyGoals: studyGoals || [],
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await docRef.set(data);
    return { sessionId: docRef.id, ...data };
  }

  // Get session list by uid (latest first, paginated)
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

  // Get single session by ID
  async getSessionById(sessionId) {
    const snap = await db.collection("sessions").doc(sessionId).get();
    if (!snap.exists) return null;
    return { sessionId: snap.id, ...snap.data() };
  }

  // End session
  async endSession(sessionId) {
    const ref = db.collection("sessions").doc(sessionId);
    await ref.update({ status: "ended", updatedAt: new Date().toISOString() });
    const snap = await ref.get();
    return { sessionId: snap.id, ...snap.data() };
  }

  // Delete session (including messages subcollection)
  async deleteSession(sessionId) {
    const sessionRef = db.collection("sessions").doc(sessionId);

    // Batch delete subcollection messages
    const messagesSnap = await sessionRef.collection("messages").get();
    const batch = db.batch();
    messagesSnap.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(sessionRef);
    await batch.commit();
  }

  // Add message
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

    // Update session updatedAt
    await db
      .collection("sessions")
      .doc(sessionId)
      .update({ updatedAt: data.createdAt });

    return { msgId: msgRef.id, ...data };
  }

  // Get all messages in a session (ordered)
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
