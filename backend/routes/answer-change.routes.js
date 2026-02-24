// backend/routes/answer-change.routes.js

const express = require("express");
const router = express.Router();
const answerChangeController = require("../controllers/answer-change.controller");

/**
 * @swagger
 * /api/answer-changes:
 *   post:
 *     tags: [Answer Changes]
 *     summary: 답변 수정 기록 생성
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               examStudentId:
 *                 type: integer
 *               turn:
 *                 type: integer
 *               updated_answer:
 *                 type: string
 *     responses:
 *       201:
 *         description: 수정 기록 생성 성공
 */
router.post("/", answerChangeController.createChange);

/**
 * @swagger
 * /api/answer-changes/{examStudentId}/{turn}:
 *   get:
 *     tags: [Answer Changes]
 *     summary: 특정 턴의 답변 수정 내역 조회
 *     parameters:
 *       - in: path
 *         name: examStudentId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: turn
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 수정 내역
 */
router.get("/:examStudentId/:turn", answerChangeController.getChange);

module.exports = router;
