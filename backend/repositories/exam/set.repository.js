// backend/repositories/exam/set.repository.js
// ExamSet 관련 DB 쿼리

const pool = require("../../config/db");
const logger = require("../../config/logger");

// '+09:00' 또는 'Z' 등으로 들어온 입력 → UTC DATETIME 문자열로 고정
function toUtcMysqlDatetime(input) {
  const d = new Date(input);
  if (isNaN(d.getTime())) throw new Error(`Invalid datetime: ${input}`);
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  const YYYY = d.getUTCFullYear();
  const MM = pad(d.getUTCMonth() + 1);
  const DD = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${YYYY}-${MM}-${DD} ${hh}:${mi}:${ss}`; // MySQL DATETIME(UTC)
}

class ExamSetRepository {
  /**
   * ExamSet과 관련된 모든 레코드를 트랜잭션으로 삭제
   * @param {number} examSetId
   */
  async deleteExamSet(examSetId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 해당 세트의 exam_id 목록 조회
      const [examRows] = await connection.execute(
        "SELECT id FROM exams WHERE examSetId = ?",
        [examSetId],
      );
      const examIds = examRows.map((r) => r.id);

      if (examIds.length > 0) {
        // 1. exam_vector 삭제
        await connection.query("DELETE FROM exam_vector WHERE exam_id IN (?)", [
          examIds,
        ]);

        // 2. exam_students 조회 (응시 기록 ID 수집)
        const [examStudentRows] = await connection.query(
          "SELECT id FROM exam_students WHERE examId IN (?)",
          [examIds],
        );
        const examStudentIds = examStudentRows.map((r) => r.id);

        if (examStudentIds.length > 0) {
          // 2a. roots 조회 후 rootId 목록 수집
          const [rootRows] = await connection.query(
            "SELECT rootId FROM roots WHERE examStudentId IN (?)",
            [examStudentIds],
          );
          const rootIds = rootRows.map((r) => r.rootId);

          // 2b. roots 먼저 삭제 (roots.rootId → node FK, roots.sectionId → sections FK)
          await connection.query(
            "DELETE FROM roots WHERE examStudentId IN (?)",
            [examStudentIds],
          );

          // 2c. 각 트리의 node/edge 삭제
          for (const rootId of rootIds) {
            const [nodeRows] = await connection.execute(
              `WITH RECURSIVE Tree AS (
                SELECT id FROM node WHERE id = ?
                UNION ALL
                SELECT e.childId FROM edge e INNER JOIN Tree t ON e.parentId = t.id
              )
              SELECT id FROM Tree`,
              [rootId],
            );
            const nodeIds = nodeRows.map((r) => r.id);
            if (nodeIds.length > 0) {
              const ph = nodeIds.map(() => "?").join(",");
              await connection.execute(
                `DELETE FROM edge WHERE parentId IN (${ph}) OR childId IN (${ph})`,
                [...nodeIds, ...nodeIds],
              );
              await connection.execute(
                `DELETE FROM node WHERE id IN (${ph})`,
                nodeIds,
              );
            }
          }

          // 2d. answer_changes 삭제
          await connection.query(
            "DELETE FROM answer_changes WHERE exam_student_id IN (?)",
            [examStudentIds],
          );
        }

        // 3. sections 조회 후 attachments 삭제
        const [sectionRows] = await connection.query(
          "SELECT id FROM sections WHERE examId IN (?)",
          [examIds],
        );
        const sectionIds = sectionRows.map((r) => r.id);
        if (sectionIds.length > 0) {
          await connection.query(
            "DELETE FROM attachments WHERE sectionId IN (?)",
            [sectionIds],
          );
        }

        // 4. sections 삭제
        await connection.query("DELETE FROM sections WHERE examId IN (?)", [
          examIds,
        ]);

        // 5. exam_students 삭제
        await connection.query(
          "DELETE FROM exam_students WHERE examId IN (?)",
          [examIds],
        );

        // 6. exams 삭제
        await connection.query("DELETE FROM exams WHERE examSetId = ?", [
          examSetId,
        ]);
      }

      // 7. exam_sets 삭제
      const [result] = await connection.execute(
        "DELETE FROM exam_sets WHERE id = ?",
        [examSetId],
      );

      await connection.commit();

      if (result.affectedRows === 0) {
        const err = new Error("Exam set not found");
        err.statusCode = 404;
        throw err;
      }

      return { deleted: true, examSetId };
    } catch (err) {
      await connection.rollback();
      logger.error({ err }, "Failed to delete exam set");
      throw err;
    } finally {
      connection.release();
    }
  }

  async createExamSetWithExams(setPayload) {
    const { name, visibleAt, studentIds = [], items = [], uid } = setPayload;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 레거시나 uid 없는 경우 default 49
      const ownerUid = uid ? uid : 49;
      const setVisibleAtUtc = toUtcMysqlDatetime(visibleAt);
      const [setResult] = await connection.execute(
        "INSERT INTO exam_sets (name, visibleAt, uid) VALUES (?, ?, ?)",
        [name, setVisibleAtUtc, ownerUid],
      );
      const examSetId = setResult.insertId;

      const examIds = [];

      let validStudentDbIds = [];
      if (studentIds.length > 0) {
        const [studentRows] = await connection.query(
          "SELECT id FROM students WHERE userId IN (?)",
          [studentIds],
        );
        validStudentDbIds = studentRows.map((r) => r.id);
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const openUtc = toUtcMysqlDatetime(item.openAt);
        const blockUtc = toUtcMysqlDatetime(item.blockAt);

        const [examResult] = await connection.execute(
          `INSERT INTO exams (examSetId, name, duration, openAt, blockAt, chapter, set_index, visibleAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            examSetId,
            item.title,
            Number(item.duration ?? 60),
            openUtc,
            blockUtc,
            item.chapter == null ? null : Number(item.chapter),
            i + 1,
            setVisibleAtUtc,
          ],
        );
        const examId = examResult.insertId;
        examIds.push(examId);

        // Handle Exam Vectors for Set Item
        if (Array.isArray(item.ragSourceIds) && item.ragSourceIds.length > 0) {
          const vectorValues = item.ragSourceIds.map((fileId) => [
            examId,
            fileId,
          ]);
          await connection.query(
            "INSERT INTO exam_vector (exam_id, file_id) VALUES ?",
            [vectorValues],
          );
        }

        const [sectionResult] = await connection.execute(
          "INSERT INTO sections (examId, sectionIndex, title, content) VALUES (?, ?, ?, ?)",
          [examId, 0, item.title, item.content || ""],
        );
        const sectionId = sectionResult.insertId;

        if (
          Array.isArray(item.attachmentFileIds) &&
          item.attachmentFileIds.length > 0
        ) {
          const vals = item.attachmentFileIds.map((fileId) => [
            sectionId,
            fileId,
          ]);
          await connection.query(
            "INSERT INTO attachments (sectionId, fileId) VALUES ?",
            [vals],
          );
        }

        if (validStudentDbIds.length > 0) {
          const links = validStudentDbIds.map((sid) => [examId, sid]);
          await connection.query(
            "INSERT INTO exam_students (examId, studentId) VALUES ?",
            [links],
          );
        }
      }

      await connection.commit();
      return { examSetId, examIds };
    } catch (err) {
      await connection.rollback();
      logger.error({ err }, "Failed to create exam set with exams");
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = ExamSetRepository;
