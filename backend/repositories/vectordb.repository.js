// backend/repositories/vectordb.repository.js
const { db } = require("../config/firebase");

class VectorDbRepository {
  // Firestore vectordb 문서 생성
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

  // 특정 유저의 Vector 목록 조회
  async getVectorsByUid(uid) {
    const snap = await db
      .collection("vectordb")
      .where("uid", "==", uid)
      .get();

    const docs = snap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }));
    docs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    return docs;
  }

  // key로 벡터 문서 삭제
  async deleteVectorByKey(key) {
    const snap = await db.collection("vectordb").where("key", "==", key).get();

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return snap.size;
  }

  // docId로 벡터 문서 단건 조회
  async getVectorDocById(docId) {
    const snap = await db.collection("vectordb").doc(docId).get();
    if (!snap.exists) return null;
    return { docId: snap.id, ...snap.data() };
  }

  // docId로 벡터 문서 삭제
  async deleteVectorByDocId(docId) {
    await db.collection("vectordb").doc(docId).delete();
  }

  // docId 목록으로 key 목록 조회 (세션 시작 시 RAG 서버에 전달)
  async getKeysByDocIds(docIds) {
    if (!docIds || docIds.length === 0) return [];
    const snaps = await Promise.all(
      docIds.map((id) => db.collection("vectordb").doc(id).get()),
    );
    return snaps.filter((s) => s.exists).map((s) => s.data().key);
  }
}

module.exports = new VectorDbRepository();
