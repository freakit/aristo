// backend/repositories/vectordb.repository.js
const { db } = require("../config/firebase");

class VectorDbRepository {
  // Create Firestore vectordb document
  async createVector({ uid, source, key, uploaded_at }) {
    const docRef = db.collection("vectordb").doc();
    const data = {
      uid,
      source,
      key,
      uploadedAt: uploaded_at || new Date().toISOString(),
    };
    await docRef.set(data);
    return { docId: docRef.id, ...data };
  }

  // Get vector list by uid
  async getVectorsByUid(uid) {
    const snap = await db
      .collection("vectordb")
      .where("uid", "==", uid)
      .get();

    const docs = snap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }));
    docs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    return docs;
  }

  // Delete vector document by key
  async deleteVectorByKey(key) {
    const snap = await db.collection("vectordb").where("key", "==", key).get();

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return snap.size;
  }

  // Get single vector document by docId
  async getVectorDocById(docId) {
    const snap = await db.collection("vectordb").doc(docId).get();
    if (!snap.exists) return null;
    return { docId: snap.id, ...snap.data() };
  }

  // Delete vector document by docId
  async deleteVectorByDocId(docId) {
    await db.collection("vectordb").doc(docId).delete();
  }

  // Get key list from docId list (passed to RAG server on session start)
  async getKeysByDocIds(docIds) {
    if (!docIds || docIds.length === 0) return [];
    const snaps = await Promise.all(
      docIds.map((id) => db.collection("vectordb").doc(id).get()),
    );
    return snaps.filter((s) => s.exists).map((s) => s.data().key);
  }
}

module.exports = new VectorDbRepository();
