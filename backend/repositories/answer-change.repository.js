const pool = require("../config/db");
const logger = require("../config/logger");

class AnswerChangeRepository {
  async create(changeData) {
    const { examStudentId, oldAnswer, newAnswer, audioFileId } = changeData;
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO answer_changes 
        (exam_student_id, old_answer, new_answer, audio_file, turn) 
        VALUES (?, ?, ?, ?, ?)`,
        [
          examStudentId,
          oldAnswer,
          newAnswer,
          audioFileId || null,
          changeData.turn,
        ],
      );
      return result.insertId;
    } catch (error) {
      logger.error({ err: error }, "Failed to insert answer change");
      throw error;
    } finally {
      connection.release();
    }
  }
  async findByExamStudentIdAndTurn(examStudentId, turn) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT old_answer, new_answer, audio_file 
         FROM answer_changes 
         WHERE exam_student_id = ? AND turn = ? 
         ORDER BY created_at ASC`,
        [examStudentId, turn],
      );
      return rows;
    } catch (error) {
      logger.error({ err: error }, "Failed to find answer change");
      throw error;
    } finally {
      connection.release();
    }
  }

  async getModifiedTurns(examStudentId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT DISTINCT turn FROM answer_changes WHERE exam_student_id = ?`,
        [examStudentId],
      );
      return rows.map((r) => r.turn); // [1, 3, 5]
    } catch (error) {
      logger.error({ err: error }, "Failed to get modified turns");
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new AnswerChangeRepository();
