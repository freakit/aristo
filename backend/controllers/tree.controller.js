// backend/controllers/tree.controller.js

const treeService = require("../services/tree.service");

class TreeController {
  async initializeTree(req, res, next) {
    try {
      const initData = req.body;
      const result = await treeService.initializeTree(initData);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async addNode(req, res, next) {
    try {
      const data = req.body; // { parentNodeId, newNodeData, siblingIndex? }
      const created = await treeService.addNodeToTree(data);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }

  async updateNodeAnswer(req, res, next) {
    try {
      const { nodeId } = req.params;
      const { studentAnswer } = req.body;
      const updated = await treeService.updateNodeAnswer(
        Number(nodeId),
        studentAnswer
      );
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * QA 리스트 조회 (수정됨)
   * GET /api/trees/qa-list/:examStudentId
   */
  async getQAList(req, res, next) {
    try {
      const { examStudentId } = req.params;
      const qaList = await treeService.getQAListForExamStudent(examStudentId);
      res.status(200).json(qaList);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 트리 저장 (JSON Import)
   * POST /api/trees/save
   */
  async saveTreeJSON(req, res, next) {
    try {
      const { examStudentId, sectionId, treeJson } = req.body;
      const result = await treeService.saveTreeJSON({
        examStudentId,
        sectionId,
        treeJson,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TreeController();
