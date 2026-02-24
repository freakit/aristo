// backend/repositories/exam/section.repository.js
// 시험 섹션 및 첨부파일 관련 DB 쿼리

const pool = require("../../config/db");
const logger = require("../../config/logger");

class ExamSectionRepository {
  async findSectionsByExamId(examId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT s.*, 
                GROUP_CONCAT(a.fileId) AS attachmentFileIds
         FROM sections s
         LEFT JOIN attachments a ON s.id = a.sectionId
         WHERE s.examId = ?
         GROUP BY s.id
         ORDER BY s.sectionIndex ASC`,
        [examId],
      );
      return rows.map((r) => ({
        ...r,
        attachmentFileIds: r.attachmentFileIds
          ? r.attachmentFileIds.split(",")
          : [],
      }));
    } catch (error) {
      logger.error({ examId, err: error }, "Failed to find sections");
      throw error;
    } finally {
      connection.release();
    }
  }

  async findStudentIdsByExamId(examId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        "SELECT s.userId FROM exam_students es JOIN students s ON es.studentId = s.id WHERE es.examId = ?",
        [examId],
      );
      return rows.map((r) => r.userId);
    } catch (error) {
      logger.error({ examId, err: error }, "Failed to find student IDs");
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * [신규] 특정 시험에 첨부된 모든 파일 정보를 조회합니다.
   * @param {number} examId - 시험 ID
   * @returns {Promise<any[]>} - 파일 객체 배열
   */
  async findAttachmentsByExamId(examId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `
        SELECT f.id, f.fileName, f.fileUrl
        FROM files AS f
        JOIN attachments AS a ON f.id = a.fileId
        JOIN sections AS s ON a.sectionId = s.id
        WHERE s.examId = ?
        `,
        [examId],
      );
      return rows;
    } catch (error) {
      logger.error({ examId, err: error }, "Failed to find attachments");
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = ExamSectionRepository;
