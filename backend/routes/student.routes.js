// backend/routes/student.routes.js

const express = require("express");
const router = express.Router();
const studentController = require("../controllers/student.controller");

/**
 * @swagger
 * /api/students:
 *   get:
 *     tags: [Students]
 *     summary: 전체 학생 목록 조회
 *     responses:
 *       200:
 *         description: 학생 목록
 */
router.get("/", studentController.getAllStudents);

/**
 * @swagger
 * /api/students/by-reg/{registrationNumber}:
 *   get:
 *     tags: [Students]
 *     summary: 학번으로 학생 정보 조회
 *     parameters:
 *       - in: path
 *         name: registrationNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 학생 정보
 *       404:
 *         description: 학생 없음
 */
router.get(
  "/by-reg/:registrationNumber",
  studentController.getStudentByRegistrationNumber,
);

/**
 * @swagger
 * /api/students/exists/{registrationNumber}:
 *   get:
 *     tags: [Students]
 *     summary: 학번으로 학생 존재 여부 확인
 *     parameters:
 *       - in: path
 *         name: registrationNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 존재 여부 반환
 */
router.get("/exists/:registrationNumber", studentController.checkStudentExists);

module.exports = router;
