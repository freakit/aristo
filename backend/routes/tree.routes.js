// backend/routes/tree.routes.js

const express = require("express");
const router = express.Router();
const treeController = require("../controllers/tree.controller");

/**
 * @swagger
 * /api/trees/init:
 *   post:
 *     tags: [Trees]
 *     summary: 시험 응시 시작 시 트리 구조 초기화
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [examStudentId, sectionId, baseQuestionNodeData]
 *             properties:
 *               examStudentId:
 *                 type: integer
 *               sectionId:
 *                 type: integer
 *               baseQuestionNodeData:
 *                 type: object
 *     responses:
 *       201:
 *         description: 트리 초기화 성공
 */
router.post("/init", treeController.initializeTree);

/**
 * @swagger
 * /api/trees/nodes:
 *   post:
 *     tags: [Trees]
 *     summary: 기존 트리에 새 노드 추가
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [parentNodeId, newNodeData]
 *             properties:
 *               parentNodeId:
 *                 type: integer
 *               siblingIndex:
 *                 type: integer
 *               newNodeData:
 *                 type: object
 */
router.post("/nodes", treeController.addNode);

/**
 * @swagger
 * /api/trees/nodes/{nodeId}/answer:
 *   patch:
 *     tags: [Trees]
 *     summary: 학생 답변 실시간 업데이트
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentAnswer:
 *                 type: string
 */
router.patch("/nodes/:nodeId/answer", treeController.updateNodeAnswer);

/**
 * @swagger
 * /api/trees/save:
 *   post:
 *     tags: [Trees]
 *     summary: 트리 전체 저장
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [examStudentId, sectionId, treeJson]
 *             properties:
 *               examStudentId:
 *                 type: integer
 *               sectionId:
 *                 type: integer
 *               treeJson:
 *                 type: object
 */
router.post("/save", treeController.saveTreeJSON);

/**
 * @swagger
 * /api/trees/qa-list/{examStudentId}:
 *   get:
 *     tags: [Trees]
 *     summary: QA 리스트 조회
 *     parameters:
 *       - in: path
 *         name: examStudentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: QA 리스트
 */
router.get("/qa-list/:examStudentId", treeController.getQAList);

module.exports = router;
