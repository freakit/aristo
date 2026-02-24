// backend/routes/exam.routes.js

const express = require("express");
const router = express.Router();
const examController = require("../controllers/exam.controller");

/**
 * @swagger
 * /api/exams:
 *   post:
 *     tags: [Exams]
 *     summary: 새 시험 생성
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "중간고사"
 *               subject:
 *                 type: string
 *               visibleAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: 시험 생성 성공
 */
router.post("/", examController.createExam);

/**
 * @swagger
 * /api/exams:
 *   get:
 *     tags: [Exams]
 *     summary: 전체 시험 목록 조회
 *     responses:
 *       200:
 *         description: 시험 목록
 */
router.get("/", examController.getAllExams);

/**
 * @swagger
 * /api/exams/for-student/{studentId}:
 *   get:
 *     tags: [Exams]
 *     summary: 학생별 시험 목록 조회
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 학생에게 할당된 시험 목록
 */
router.get("/for-student/:studentId", examController.getExamsForStudent);

/**
 * @swagger
 * /api/exams/multi:
 *   post:
 *     tags: [Exams]
 *     summary: ExamSet 일괄 생성 (섹션들을 개별 시험으로)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, visibleAt, items]
 *             properties:
 *               name:
 *                 type: string
 *               visibleAt:
 *                 type: string
 *                 format: date-time
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: ExamSet 생성 성공
 */
router.post("/multi", examController.createMultipleExams);

/**
 * @swagger
 * /api/exams/session/{examStudentId}:
 *   get:
 *     tags: [Exams]
 *     summary: examStudentId로 세션 정보 조회
 *     parameters:
 *       - in: path
 *         name: examStudentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 세션 정보
 *       403:
 *         description: 세션을 찾을 수 없음
 */
router.get(
  "/session/:examStudentId",
  examController.getSessionInfoByExamStudentId,
);

/**
 * @swagger
 * /api/exams/complete/{examStudentId}:
 *   put:
 *     tags: [Exams]
 *     summary: 시험 완료 처리
 *     parameters:
 *       - in: path
 *         name: examStudentId
 *         required: true
 *         schema:
 *           type: integer
 */
router.put("/complete/:examStudentId", examController.completeExam);

/**
 * @swagger
 * /api/exams/student-exam:
 *   get:
 *     tags: [Exams]
 *     summary: 교사용 - 학생 시험 응시 정보 조회
 *     parameters:
 *       - in: query
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 */
router.get("/student-exam", examController.findExamStudentForTeacher);

/**
 * @swagger
 * /api/exams/{id}/attachments:
 *   get:
 *     tags: [Exams]
 *     summary: 시험 첨부파일 목록 조회
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get("/:id/attachments", examController.getExamAttachments);

/**
 * @swagger
 * /api/exams/{id}:
 *   get:
 *     tags: [Exams]
 *     summary: 시험 상세 조회
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get("/:id", examController.getExamById);

/**
 * @swagger
 * /api/exams/sets/student/{studentId}:
 *   get:
 *     tags: [Exams]
 *     summary: 학생의 ExamSet 목록 조회
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get("/sets/student/:studentId", examController.getExamSetsForStudent);

/**
 * @swagger
 * /api/exams/sets/{examSetId}/session:
 *   get:
 *     tags: [Exams]
 *     summary: ExamSet 세션 정보 조회
 *     parameters:
 *       - in: path
 *         name: examSetId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get("/sets/:examSetId/session", examController.getExamSetSession);

/**
 * @swagger
 * /api/exams/{id}:
 *   put:
 *     tags: [Exams]
 *     summary: 시험 정보 수정
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.put("/:id", examController.updateExam);

/**
 * @swagger
 * /api/exams/student/enter:
 *   post:
 *     tags: [Exams]
 *     summary: 학생 시험 입장 (토큰 발급)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, examId]
 *             properties:
 *               studentId:
 *                 type: integer
 *               examId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 입장 성공 (examStudentId 발급)
 * */
router.post("/student/enter", examController.enterExam);

/**
 * @swagger
 * /api/exams/sets/{examSetId}:
 *   delete:
 *     tags: [Exams]
 *     summary: ExamSet 삭제 (하위 시험 및 관련 데이터 포함)
 *     parameters:
 *       - in: path
 *         name: examSetId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       404:
 *         description: ExamSet을 찾을 수 없음
 */
router.delete("/sets/:examSetId", examController.deleteExamSet);

module.exports = router;
