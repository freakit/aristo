// backend/repositories/vectordb.repository.js
const pool = require("../config/db");

class VectorDbRepository {
  // VectorDB 생성
  async createVector({ uid, source, key }) {
    const conn = await pool.getConnection();
    try {
      const query = `
        INSERT INTO vectordb (uid, source, uploaded_at, \`key\`)
        VALUES (?, ?, NOW(), ?)
      `;
      const [result] = await conn.query(query, [uid, source, key]);
      return result.insertId;
    } finally {
      conn.release();
    }
  }

  // 특정 유저의 Vector 목록 조회
  async getVectorsByUid(uid) {
    const conn = await pool.getConnection();
    try {
      const query = `
        SELECT * FROM vectordb WHERE uid = ? ORDER BY uploaded_at DESC
      `;
      const [rows] = await conn.query(query, [uid]);
      return rows;
    } finally {
      conn.release();
    }
  }

  // ExamVector 연결 생성 (다중 삽입)
  async createExamVectors(examId, fileIds) {
    if (!fileIds || fileIds.length === 0) return;
    const conn = await pool.getConnection();
    try {
      const query = `
        INSERT INTO exam_vector (exam_id, file_id)
        VALUES ?
      `;
      const values = fileIds.map((fileId) => [examId, fileId]);
      await conn.query(query, [values]);
    } finally {
      conn.release();
    }
  }

  // 특정 시험의 Vector 목록 조회 (키 포함)
  async getVectorsByExamId(examId) {
    const conn = await pool.getConnection();
    try {
      const query = `
        SELECT v.* 
        FROM vectordb v
        JOIN exam_vector ev ON v.file_id = ev.file_id
        WHERE ev.exam_id = ?
      `;
      const [rows] = await conn.query(query, [examId]);
      return rows;
    } finally {
      conn.release();
    }
  }
  
  async deleteVectorByKey(key) {
    const conn = await pool.getConnection();
    try {
      const query = `DELETE FROM vectordb WHERE \`key\` = ?`;
      const [result] = await conn.execute(query, [key]);
      return result;
    } finally {
      conn.release();
    }
  } 
}

module.exports = new VectorDbRepository();
