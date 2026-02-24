// routes/azure.js

const express = require("express");
const router = express.Router();
const azureController = require("../controllers/azure.controller");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * /api/azure/generate-sas-token:
 *   get:
 *     tags: [Azure]
 *     summary: Azure Blob Storage SAS 토큰 발급
 *     description: 파일 업로드를 위한 SAS 토큰 생성
 *     parameters:
 *       - in: query
 *         name: containerName
 *         schema:
 *           type: string
 *       - in: query
 *         name: blobName
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SAS 토큰 및 URL
 */
router.get(
  "/generate-sas-token",
  asyncHandler(azureController.generateSasToken),
);

/**
 * @swagger
 * /api/azure/list-blobs:
 *   get:
 *     tags: [Azure]
 *     summary: Blob 목록 조회
 *     parameters:
 *       - in: query
 *         name: containerName
 *         schema:
 *           type: string
 *       - in: query
 *         name: prefix
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blob 목록
 */
router.get("/list-blobs", asyncHandler(azureController.listBlobs));

module.exports = router;
