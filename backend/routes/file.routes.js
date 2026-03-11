// backend/routes/file.routes.js

const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");

/**
 * @swagger
 * /api/files:
 *   post:
 *     tags: [Files]
 *     summary: Create file metadata record
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
 *         description: File record created successfully
 */
router.post("/", fileController.createFileRecord);

module.exports = router;
