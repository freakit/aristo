// backend/routes/file.routes.js

const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");

/**
 * @swagger
 * /api/files:
 *   post:
 *     tags: [Files]
 *     summary: 파일 메타데이터 기록 생성
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileName:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *               fileType:
 *                 type: string
 *     responses:
 *       201:
 *         description: 파일 기록 생성 성공
 */
router.post("/", fileController.createFileRecord);

module.exports = router;
