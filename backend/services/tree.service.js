// backend/services/tree.service.js

const treeRepository = require("../repositories/tree.repository");
const answerChangeRepository = require("../repositories/answer-change.repository");
const pool = require("../config/db");

class TreeService {
  /**
   * 시험 섹션 트리 초기화
   */
  /**
   * 시험 섹션 트리 초기화 (수정됨)
   */
  async initializeTree(initData) {
    const { examStudentId, sectionId, baseQuestionNodeData } = initData;

    if (!examStudentId || !sectionId || !baseQuestionNodeData) {
      const error = new Error(
        "examStudentId, sectionId, baseQuestionNodeData are required",
      );
      error.statusCode = 400;
      throw error;
    }

    if (!baseQuestionNodeData.qType) {
      baseQuestionNodeData.qType = "base_question";
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const rootNodeId = await treeRepository.createNode(
        { ntype: 0, contentText: "Root" },
        connection,
      );
      const bonusNodeId = await treeRepository.createNode(
        { ntype: 1, contentText: "Bonus" },
        connection,
      );
      const baseQuestionNodeId = await treeRepository.createNode(
        baseQuestionNodeData,
        connection,
      );

      await treeRepository.createEdge(
        rootNodeId,
        baseQuestionNodeId,
        0,
        0,
        connection,
      );
      await treeRepository.createEdge(
        rootNodeId,
        bonusNodeId,
        1,
        0,
        connection,
      );

      // 5) roots 등록 (수정됨)
      await treeRepository.createRoot(
        examStudentId, // attemptId 대신 사용
        sectionId,
        rootNodeId,
        connection,
      );

      await connection.commit();
      return { rootNodeId, baseQuestionNodeId, bonusNodeId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 후속 노드 추가
   * @param {object} nodeCreationData - { parentNodeId, siblingIndex?, newNodeData }
   */
  async addNodeToTree(nodeCreationData) {
    const { parentNodeId, siblingIndex, newNodeData } = nodeCreationData;

    if (!parentNodeId || !newNodeData) {
      const error = new Error("parentNodeId and newNodeData are required");
      error.statusCode = 400;
      throw error;
    }

    // qType 기본값 보정: follow_up
    const q = { ...newNodeData };
    if (!q.qType) q.qType = "follow_up";

    // 버킷 결정: bonus면 1, 아니면 0
    const bucketNtype = q.qType === "bonus_question" || q.ntype === 1 ? 1 : 0;

    // siblingIndex 자동 계산(버킷 단위)
    let index = siblingIndex;
    if (index === undefined || index === null) {
      index = await treeRepository.countChildren(parentNodeId, bucketNtype);
    }

    const newNodeId = await treeRepository.createNode(q);
    await treeRepository.createEdge(
      parentNodeId,
      newNodeId,
      bucketNtype,
      index,
    );

    return treeRepository.findNodeById(newNodeId);
  }

  /**
   * 학생 답변 실시간 업데이트
   */
  async updateNodeAnswer(nodeId, studentAnswer) {
    if (!nodeId) {
      const error = new Error("nodeId is required");
      error.statusCode = 400;
      throw error;
    }
    return treeRepository.updateStudentAnswer(nodeId, studentAnswer);
  }

  /**
   * QA 리스트 조회
   */
  async getQAListForExamStudent(examStudentId) {
    const nodes = await treeRepository.getTreeNodesInPreOrder(examStudentId);

    const modifiedTurns =
      await answerChangeRepository.getModifiedTurns(examStudentId);

    const qa = nodes
      .filter((n) => {
        // 답변이 없는 내용은 가져오지 않음
        return n.studentAnswer && n.studentAnswer.trim().length > 0;
      })
      .map((n, index) => {
        let question = n.contentText;
        if (
          (n.qType === "base_question" || n.qType === "follow_up") &&
          n.followUpQuestion
        ) {
          question = n.followUpQuestion;
        }

        return {
          question: question,
          answer: n.studentAnswer,
          qType: n.qType,
          isModified: modifiedTurns.includes(index + 1),
        };
      });

    return qa;
  }

  /**
   * 트리 JSON 전체 저장
   */
  async saveTreeJSON(saveData) {
    const { examStudentId, sectionId, treeJson } = saveData;

    if (!examStudentId || !sectionId || !treeJson) {
      const error = new Error(
        "examStudentId, sectionId, treeJson are required",
      );
      error.statusCode = 400;
      throw error;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Recursive helper
      const traverseAndSave = async (
        node,
        parentId = null,
        bucketNtype = 0,
        siblingIndex = 0,
      ) => {
        let contentText = null;
        let qType = null;
        let followUpQuestion = null;
        let followUpModelAnswer = null;
        let studentAnswer = null;
        let ntype = node.ntype ?? 0;

        if (node.value && typeof node.value === "string") {
          // Structural node: "Root", "Bonus"
          contentText = node.value;
        } else if (node.value && typeof node.value === "object") {
          const val = node.value;
          qType = val.q_type;
          studentAnswer = val.student_answer?.answer ?? null;

          if (val.follow_up) {
            followUpQuestion = val.follow_up.question ?? null;
            followUpModelAnswer = val.follow_up.model_answer ?? null;
          }

          if (val.missing_point) {
            // contentText maps to missing_point.content if available
            contentText = val.missing_point.content ?? null;
          }
        }

        const nodeData = {
          ntype,
          qType,
          contentText,
          followUpQuestion,
          followUpModelAnswer,
          studentAnswer,
        };

        // Create Node
        const nodeId = await treeRepository.createNode(nodeData, connection);

        // Create Edge (if not root)
        if (parentId) {
          await treeRepository.createEdge(
            parentId,
            nodeId,
            bucketNtype,
            siblingIndex,
            connection,
          );
        }

        // Process Children
        if (node.children) {
          for (const key of Object.keys(node.children)) {
            const bucketVal = parseInt(key, 10); // 0 or 1
            const bucketObj = node.children[key];
            const nodes = bucketObj.nodes || [];

            for (let i = 0; i < nodes.length; i++) {
              await traverseAndSave(nodes[i], nodeId, bucketVal, i);
            }
          }
        }
        return nodeId;
      };

      // Start traversal from Root
      // Assuming treeJson is the Root Node object
      const rootNodeId = await traverseAndSave(treeJson);

      // 1. Get existing rootId (if any)
      const oldRootId = await treeRepository.getRoot(
        examStudentId,
        sectionId,
        connection,
      );

      // 2. Register New Root (Updates roots table to point to new tree)
      await treeRepository.createRoot(
        examStudentId,
        sectionId,
        rootNodeId,
        connection,
      );

      // 3. Delete old tree (Now safe because roots point to new tree)
      if (oldRootId) {
        // Avoid deleting the NEW tree if something went wrong and rootId matches (unlikely but safe check)
        if (oldRootId !== rootNodeId) {
          await treeRepository.deleteTree(oldRootId, connection);
        }
      }

      await connection.commit();
      return { success: true, rootId: rootNodeId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new TreeService();
