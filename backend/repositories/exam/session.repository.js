// backend/repositories/exam/session.repository.js
// 시험 세션 관련 DB 쿼리

const pool = require("../../config/db");
const logger = require("../../config/logger");

class ExamSessionRepository {
  /**
   * 학생의 examStudentId를 조회합니다.
   */
  async findExamStudentId(examId, studentId) {
    const connection = await pool.getConnection();
    try {
      const [examStudentRows] = await connection.execute(
        "SELECT id, status FROM exam_students WHERE examId = ? AND studentId = ?",
        [examId, studentId],
      );

      if (examStudentRows.length === 0) {
        throw new Error("Student is not assigned to this exam");
      }

      const examStudent = examStudentRows[0];

      if (examStudent.status === "completed") {
        throw new Error("Exam already completed");
      }

      return examStudent.id;
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * examStudentId로 세션 정보 조회
   */
  async findSessionInfoByExamStudentId(examStudentId) {
    const connection = await pool.getConnection();
    try {
      const sql = `
        SELECT 
          e.id AS examId, e.name AS examName, e.duration, e.createdAt AS examCreatedAt, e.updatedAt AS examUpdatedAt,
          s.id AS studentId, s.userId, s.school, s.registrationNumber, s.significant,
          u.name AS studentName, u.age, u.gender, u.email, u.phoneNumber,
          es.id as examStudentId, es.status, es.startAt, es.endAt
        FROM exam_students es
        JOIN exams e ON es.examId = e.id
        JOIN students s ON es.studentId = s.id
        JOIN users u ON s.userId = u.id
        WHERE es.id = ?
        LIMIT 1
      `;
      const [rows] = await connection.execute(sql, [examStudentId]);

      if (rows.length === 0) return null;
      const sessionInfo = rows[0];

      // Fetch Vector Keys
      const [vectorRows] = await connection.execute(
        `
        SELECT v.key 
        FROM exam_vector ev
        JOIN vectordb v ON ev.file_id = v.file_id
        WHERE ev.exam_id = ?
      `,
        [sessionInfo.examId],
      );

      sessionInfo.vector_keys = vectorRows.map((r) => r.key);

      return sessionInfo;
    } catch (error) {
      logger.error(
        { err: error },
        "Failed to find session info by examStudentId",
      );
      throw error;
    } finally {
      connection.release();
    }
  }

  async startExam(examStudentId) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        "UPDATE exam_students SET status = 'in_progress', startAt = NOW() WHERE id = ? AND status = 'pending'",
        [examStudentId],
      );
      return result.affectedRows > 0;
    } catch (error) {
      logger.error({ examStudentId, err: error }, "Failed to start exam");
      throw error;
    } finally {
      connection.release();
    }
  }

  async completeExam(examStudentId) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        "UPDATE exam_students SET status = 'completed', endAt = NOW() WHERE id = ?",
        [examStudentId],
      );
      return result.affectedRows > 0;
    } catch (error) {
      logger.error({ examStudentId, err: error }, "Failed to complete exam");
      throw error;
    } finally {
      connection.release();
    }
  }

  async findExamStudentForTeacher(examId, studentId, status) {
    const connection = await pool.getConnection();
    try {
      const params = [examId, studentId];
      const statusClause = status ? "AND es.status = ?" : "";
      if (status) params.push(status);

      const sql = `
        SELECT 
          e.id AS examId, e.name AS examName,
          s.id AS studentId, s.registrationNumber,
          u.name AS studentName,
          es.id AS examStudentId, es.status, es.startAt, es.endAt
        FROM exam_students es
        JOIN exams e ON es.examId = e.id
        JOIN students s ON es.studentId = s.id
        JOIN users u ON s.userId = u.id
        WHERE es.examId = ? AND es.studentId = ? ${statusClause}
        LIMIT 1
      `;
      const [rows] = await connection.execute(sql, params);
      return rows[0];
    } catch (error) {
      logger.error(
        { examId, studentId, err: error },
        "Failed to find exam student for teacher",
      );
      throw error;
    } finally {
      connection.release();
    }
  }

  async findAllExamSetsByStudentId(studentId) {
    const connection = await pool.getConnection();
    try {
      const sql = `
        SELECT 
          eset.id, 
          eset.name, 
          eset.visibleAt,
          COUNT(e.id) AS examCount,
          SUM(e.duration) AS totalDuration,
          SUM(CASE WHEN e.blockAt > UTC_TIMESTAMP() AND (est.status IS NULL OR est.status != 'completed') THEN 1 ELSE 0 END) AS availableExamCount,
          SUM(CASE WHEN est.status IN ('in_progress', 'completed') THEN 1 ELSE 0 END) AS startedExamCount,
          GROUP_CONCAT(e.id ORDER BY e.set_index ASC) as allExamIds,
          GROUP_CONCAT(CASE WHEN est.status = 'completed' THEN e.id END) as completedIds
        FROM exam_sets eset
        JOIN exams e ON eset.id = e.examSetId
        JOIN exam_students est ON e.id = est.examId
        WHERE est.studentId = ?
          AND eset.visibleAt <= UTC_TIMESTAMP()
        GROUP BY eset.id
        HAVING availableExamCount > 0
        ORDER BY eset.visibleAt DESC
      `;

      const [rows] = await connection.execute(sql, [studentId]);

      return rows.map((row) => {
        const examIds = row.allExamIds
          ? row.allExamIds.toString().split(",").map(Number)
          : [];
        const completedExamIds = row.completedIds
          ? row.completedIds.toString().split(",").map(Number)
          : [];

        // Frontend expects: "active" | "completed" | "upcoming" | "expired"
        // Query filters ensure we only get visible sets with available exams or completed ones that confuse available count logic?
        // Actually query has HAVING availableExamCount > 0.
        // If all exams are completed, availableExamCount (status != completed) would be 0?
        // Wait, availableExamCount condition is: (est.status IS NULL OR est.status != 'completed').
        // So if ALL exams are completed, availableExamCount is 0.
        // So fully completed sets are FILTERED OUT by the query?!
        // That means completed sets won't show up in the list!
        // I should fix the SQL HAVING clause too if we want to show completed sets.

        let status = "active";
        if (examIds.length > 0 && examIds.length === completedExamIds.length) {
          status = "completed";
        }

        return {
          id: row.id,
          name: row.name,
          visibleAt: row.visibleAt,
          startDate: row.visibleAt,
          examCount: row.examCount,
          totalDuration: row.totalDuration,
          status: status,
          examIds: examIds,
          completedExamIds: completedExamIds,
        };
      });
    } catch (error) {
      logger.error(
        { studentId, err: error },
        "Failed to find exam sets for student",
      );
      throw error;
    } finally {
      connection.release();
    }
  }

  async findExamSetDetails(examSetId, studentId) {
    const connection = await pool.getConnection();
    try {
      const [setRows] = await connection.execute(
        "SELECT * FROM exam_sets WHERE id = ?",
        [examSetId],
      );
      if (setRows.length === 0) return null;
      const examSet = setRows[0];

      const sql = `
        SELECT 
          e.id, e.name, e.duration, e.openAt, e.blockAt, e.set_index, e.chapter,
          est.id AS examStudentId, est.status, est.startAt, est.endAt
        FROM exams e
        JOIN exam_students est ON e.id = est.examId
        WHERE e.examSetId = ? AND est.studentId = ?
        ORDER BY e.set_index ASC
      `;
      const [examRows] = await connection.execute(sql, [examSetId, studentId]);

      return {
        id: examSet.id,
        name: examSet.name,
        visibleAt: examSet.visibleAt,
        items: examRows.map((r) => ({
          ...r,
          // DB에서 가져온 날짜 등을 필요한 포맷으로 변환 가능
        })),
      };
    } catch (error) {
      logger.error({ err: error }, "Failed to find exam set details");
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = ExamSessionRepository;
