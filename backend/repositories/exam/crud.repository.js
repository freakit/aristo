// backend/repositories/exam/crud.repository.js
const pool = require("../../config/db");
const logger = require("../../config/logger");

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
  return `${YYYY}-${MM}-${DD} ${hh}:${mi}:${ss}`;
}

class ExamCrudRepository {
  async create(examData) {
    const {
      name,
      duration,
      chapter = null,
      sections = [],
      studentIds = [],
      vectorIds = [], // ✅ RAG 소스 ID 배열
    } = examData;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const visibleUtc = toUtcMysqlDatetime(examData.visibleAt);
      const openUtc = toUtcMysqlDatetime(examData.openAt);
      const blockUtc = toUtcMysqlDatetime(examData.blockAt);

      const [examResult] = await connection.execute(
        "INSERT INTO exams (name, duration, visibleAt, openAt, blockAt, chapter) VALUES (?, ?, ?, ?, ?, ?)",
        [name, duration, visibleUtc, openUtc, blockUtc, chapter],
      );
      const examId = examResult.insertId;

      // ✅ exam_vector 테이블에 RAG 소스 저장
      if (Array.isArray(vectorIds) && vectorIds.length > 0) {
        const vectorValues = vectorIds.map((fileId) => [examId, fileId]);
        await connection.query(
          "INSERT INTO exam_vector (exam_id, file_id) VALUES ?",
          [vectorValues],
        );
      }

      const first =
        Array.isArray(sections) && sections.length > 0 ? sections[0] : null;
      if (first) {
        const [sectionResult] = await connection.execute(
          "INSERT INTO sections (examId, sectionIndex, title, content) VALUES (?, ?, ?, ?)",
          [examId, 0, first.title || "", first.content || ""],
        );
        const sectionId = sectionResult.insertId;

        if (
          Array.isArray(first.attachmentFileIds) &&
          first.attachmentFileIds.length > 0
        ) {
          const vals = first.attachmentFileIds.map((fileId) => [
            sectionId,
            fileId,
          ]);
          await connection.query(
            "INSERT INTO attachments (sectionId, fileId) VALUES ?",
            [vals],
          );
        }
      }

      if (studentIds.length > 0) {
        const [studentRows] = await connection.query(
          "SELECT id FROM students WHERE userId IN (?)",
          [studentIds],
        );
        const validStudentIds = studentRows.map((row) => row.id);
        if (validStudentIds.length > 0) {
          const studentValues = validStudentIds.map((studentId) => [
            examId,
            studentId,
          ]);
          await connection.query(
            "INSERT INTO exam_students (examId, studentId) VALUES ?",
            [studentValues],
          );
        }
      }

      await connection.commit();
      return examId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findAll(uid) {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT
          e.id, e.name, e.duration, e.createdAt, e.updatedAt, e.chapter, e.examSetId,
          e.visibleAt AS visibleAt,
          e.openAt    AS openAt,
          e.blockAt   AS blockAt,
          CASE
            WHEN UTC_TIMESTAMP() < e.visibleAt THEN 'hidden'
            WHEN UTC_TIMESTAMP() >= e.visibleAt AND UTC_TIMESTAMP() < e.openAt THEN 'visible'
            WHEN UTC_TIMESTAMP() >= e.openAt AND UTC_TIMESTAMP() < e.blockAt THEN 'open'
            ELSE 'blocked'
          END AS status,
          COUNT(DISTINCT s.id)              AS sectionCount,
          GROUP_CONCAT(DISTINCT st.userId)  AS studentUserIds,
          eset.name                         AS examSetName,
          eset.uid                          AS examSetUid
        FROM exams AS e
        LEFT JOIN sections       AS s    ON e.id = s.examId
        LEFT JOIN exam_students  AS es   ON e.id = es.examId
        LEFT JOIN students       AS st   ON es.studentId = st.id
        LEFT JOIN exam_sets      AS eset ON e.examSetId = eset.id
      `;

      const params = [];
      if (uid) {
        query += " WHERE eset.uid = ? ";
        params.push(uid);
      }

      query += `
        GROUP BY e.id
        ORDER BY e.createdAt DESC
      `;

      const [rows] = await connection.execute(query, params);
      return rows;
    } catch (error) {
      logger.error({ err: error }, "Failed to find all exams");
      throw error;
    } finally {
      connection.release();
    }
  }

  async findById(id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `
        SELECT
          e.*,
          CASE
            WHEN UTC_TIMESTAMP() < e.visibleAt THEN 'hidden'
            WHEN UTC_TIMESTAMP() >= e.visibleAt AND UTC_TIMESTAMP() < e.openAt THEN 'visible'
            WHEN UTC_TIMESTAMP() >= e.openAt AND UTC_TIMESTAMP() < e.blockAt THEN 'open'
            ELSE 'blocked'
          END AS status
        FROM exams e
        WHERE e.id = ?
      `,
        [id],
      );

      const exam = rows[0];
      if (exam) {
        // ✅ exam_vector 테이블에서 RAG 소스 ID 가져오기
        const [vectorRows] = await connection.execute(
          "SELECT file_id FROM exam_vector WHERE exam_id = ?",
          [id],
        );
        exam.ragSourceIds = vectorRows.map((r) => r.file_id);
      }

      return exam;
    } catch (error) {
      logger.error({ id, err: error }, "Failed to find exam by id");
      throw error;
    } finally {
      connection.release();
    }
  }

  async findAllByStudentId(studentId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `
        SELECT
          e.id, e.name, e.duration, e.createdAt, e.updatedAt, e.chapter,
          e.visibleAt AS visibleAt,
          e.openAt    AS openAt,
          e.blockAt   AS blockAt,
          CASE
            WHEN UTC_TIMESTAMP() < e.visibleAt THEN 'hidden'
            WHEN UTC_TIMESTAMP() >= e.visibleAt AND UTC_TIMESTAMP() < e.openAt THEN 'visible'
            WHEN UTC_TIMESTAMP() >= e.openAt AND UTC_TIMESTAMP() < e.blockAt THEN 'open'
            ELSE 'blocked'
          END AS status
        FROM exams e
        JOIN exam_students es ON e.id = es.examId
        WHERE es.studentId = ?
          AND UTC_TIMESTAMP() >= e.visibleAt
          AND UTC_TIMESTAMP() <  e.blockAt
        ORDER BY e.createdAt DESC
      `,
        [studentId],
      );
      return rows;
    } catch (error) {
      logger.error(
        { studentId, err: error },
        "Failed to find exams for student",
      );
      throw error;
    } finally {
      connection.release();
    }
  }

  async update(id, examData) {
    const {
      name,
      duration,
      sections = [],
      studentIds = [],
      chapter = null,
      vectorIds = [], // ✅ RAG 소스 ID 배열
    } = examData;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const visibleUtc = toUtcMysqlDatetime(examData.visibleAt);
      const openUtc = toUtcMysqlDatetime(examData.openAt);
      const blockUtc = toUtcMysqlDatetime(examData.blockAt);

      await connection.execute(
        "UPDATE exams SET name = ?, duration = ?, visibleAt = ?, openAt = ?, blockAt = ?, chapter = ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?",
        [name, duration, visibleUtc, openUtc, blockUtc, chapter, id],
      );

      // ✅ exam_vector 업데이트
      await connection.execute("DELETE FROM exam_vector WHERE exam_id = ?", [
        id,
      ]);
      if (Array.isArray(vectorIds) && vectorIds.length > 0) {
        const vectorValues = vectorIds.map((fileId) => [id, fileId]);
        await connection.query(
          "INSERT INTO exam_vector (exam_id, file_id) VALUES ?",
          [vectorValues],
        );
      }

      // 기존 섹션 처리 로직...
      const [existingSections] = await connection.execute(
        "SELECT id FROM sections WHERE examId = ?",
        [id],
      );
      const existingSectionIds = existingSections.map((s) => s.id);

      let finalSectionId = null;
      const incoming = sections.length > 0 ? sections[0] : null;

      if (incoming) {
        if (existingSectionIds.length > 0) {
          finalSectionId = existingSectionIds[0];
          await connection.execute(
            "UPDATE sections SET title = ?, content = ? WHERE id = ?",
            [incoming.title || "", incoming.content || "", finalSectionId],
          );
          await connection.execute(
            "DELETE FROM attachments WHERE sectionId = ?",
            [finalSectionId],
          );
          if (
            Array.isArray(incoming.attachmentFileIds) &&
            incoming.attachmentFileIds.length > 0
          ) {
            const vals = incoming.attachmentFileIds.map((fileId) => [
              finalSectionId,
              fileId,
            ]);
            await connection.query(
              "INSERT INTO attachments (sectionId, fileId) VALUES ?",
              [vals],
            );
          }
        } else {
          const [sectionResult] = await connection.execute(
            "INSERT INTO sections (examId, sectionIndex, title, content) VALUES (?, ?, ?, ?)",
            [id, 0, incoming.title || "", incoming.content || ""],
          );
          finalSectionId = sectionResult.insertId;
          if (
            Array.isArray(incoming.attachmentFileIds) &&
            incoming.attachmentFileIds.length > 0
          ) {
            const vals = incoming.attachmentFileIds.map((fileId) => [
              finalSectionId,
              fileId,
            ]);
            await connection.query(
              "INSERT INTO attachments (sectionId, fileId) VALUES ?",
              [vals],
            );
          }
        }
      }

      // 학생 목록 업데이트...
      const [existingStudentLinks] = await connection.execute(
        "SELECT studentId FROM exam_students WHERE examId = ?",
        [id],
      );
      const existingStudentIds = existingStudentLinks.map(
        (link) => link.studentId,
      );
      const [studentRows] = await connection.query(
        "SELECT id FROM students WHERE userId IN (?)",
        [studentIds.length > 0 ? studentIds : [null]],
      );
      const incomingStudentIds = studentRows.map((row) => row.id);

      const studentsToRemove = existingStudentIds.filter(
        (sid) => !incomingStudentIds.includes(sid),
      );
      if (studentsToRemove.length > 0) {
        const [attemptsToRemove] = await connection.query(
          "SELECT id FROM attempts WHERE examId = ? AND studentId IN (?)",
          [id, studentsToRemove],
        );
        const attemptIdsToRemove = attemptsToRemove.map((a) => a.id);
        if (attemptIdsToRemove.length > 0) {
          const [rootsInAttempt] = await connection.query(
            "SELECT id FROM roots WHERE attemptId IN (?)",
            [attemptIdsToRemove],
          );
          const rootIdsInAttempt = rootsInAttempt.map((r) => r.id);
          if (rootIdsInAttempt.length > 0) {
            await connection.query("DELETE FROM nodes WHERE rootId IN (?)", [
              rootIdsInAttempt,
            ]);
            await connection.query("DELETE FROM roots WHERE id IN (?)", [
              rootIdsInAttempt,
            ]);
          }
          await connection.query("DELETE FROM attempts WHERE id IN (?)", [
            attemptIdsToRemove,
          ]);
        }
        await connection.query(
          "DELETE FROM exam_students WHERE examId = ? AND studentId IN (?)",
          [id, studentsToRemove],
        );
      }

      const studentsToAdd = incomingStudentIds.filter(
        (sid) => !existingStudentIds.includes(sid),
      );
      if (studentsToAdd.length > 0) {
        const studentValues = studentsToAdd.map((studentId) => [id, studentId]);
        await connection.query(
          "INSERT INTO exam_students (examId, studentId) VALUES ?",
          [studentValues],
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      logger.error({ err: error }, "Exam update transaction failed");
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = ExamCrudRepository;
