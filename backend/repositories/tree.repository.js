// backend/repositories/tree.repository.js

const pool = require("../config/db");
const logger = require("../config/logger");

class TreeRepository {
  /**
   * 새로운 노드를 생성합니다.
   * (connection을 인자로 받던 부분을 내부적으로 처리하도록 수정)
   */
  async createNode(nodeData, externalConnection = null) {
    const connection = externalConnection || (await pool.getConnection());
    try {
      const {
        ntype,
        qType,
        contentText,
        followUpQuestion,
        followUpModelAnswer,
        studentAnswer,
      } = nodeData;

      const sql = `
        INSERT INTO node (
          ntype, qType, contentText, 
          followUpQuestion, followUpModelAnswer, studentAnswer
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(sql, [
        ntype ?? null,
        qType ?? null,
        contentText ?? null,
        followUpQuestion ?? null,
        followUpModelAnswer ?? null,
        studentAnswer ?? null,
      ]);

      return result.insertId;
    } catch (error) {
      logger.error({ err: error }, "Failed to create node");
      throw error;
    } finally {
      if (!externalConnection) connection.release();
    }
  }

  /**
   * 부모-자식 간선 생성
   * (connection을 인자로 받던 부분을 내부적으로 처리하도록 수정)
   */
  async createEdge(
    parentId,
    childId,
    bucketNtype,
    siblingIndex,
    externalConnection = null,
  ) {
    const connection = externalConnection || (await pool.getConnection());
    try {
      const sql = `INSERT INTO edge (parentId, childId, bucketNtype, siblingIndex) VALUES (?, ?, ?, ?)`;
      await connection.execute(sql, [
        parentId,
        childId,
        bucketNtype,
        siblingIndex,
      ]);
    } catch (error) {
      logger.error({ err: error }, "Failed to create edge");
      throw error;
    } finally {
      if (!externalConnection) connection.release();
    }
  }

  /**
   * roots 등록
   * (connection을 인자로 받던 부분을 내부적으로 처리하도록 수정)
   */
  async createRoot(
    examStudentId,
    sectionId,
    rootNodeId,
    externalConnection = null,
  ) {
    const connection = externalConnection || (await pool.getConnection());
    try {
      // Check if root already exists for this examStudentId and sectionId
      // If so, update it? Or duplicate key error?
      // Schema says PRIMARY KEY (`examStudentId`, `sectionId`)
      // So use ON DUPLICATE KEY UPDATE or INSERT IGNORE
      const sql = `
        INSERT INTO roots (examStudentId, sectionId, rootId) 
        VALUES (?, ?, ?) 
        ON DUPLICATE KEY UPDATE rootId = VALUES(rootId)
      `;
      await connection.execute(sql, [examStudentId, sectionId, rootNodeId]);
    } catch (error) {
      logger.error(
        { examStudentId, err: error },
        "Failed to create/update root",
      );
      throw error;
    } finally {
      if (!externalConnection) connection.release();
    }
  }

  async findNodeById(nodeId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        "SELECT * FROM node WHERE id = ?",
        [nodeId],
      );
      return rows[0];
    } catch (error) {
      logger.error({ nodeId, err: error }, "Failed to find node by id");
      throw error;
    } finally {
      connection.release();
    }
  }

  async findChildNodes(parentId) {
    const connection = await pool.getConnection();
    try {
      const sql = `
        SELECT n.* FROM node n
        JOIN edge e ON n.id = e.childId
        WHERE e.parentId = ?
        ORDER BY e.bucketNtype ASC, e.siblingIndex ASC
      `;
      const [rows] = await connection.execute(sql, [parentId]);
      return rows;
    } catch (error) {
      logger.error({ parentId, err: error }, "Failed to find child nodes");
      throw error;
    } finally {
      connection.release();
    }
  }

  async countChildren(parentId, bucketNtype) {
    const connection = await pool.getConnection();
    try {
      const sql = `SELECT COUNT(*) AS cnt FROM edge WHERE parentId = ? AND bucketNtype = ?`;
      const [rows] = await connection.execute(sql, [parentId, bucketNtype]);
      return rows?.[0]?.cnt ?? 0;
    } catch (error) {
      logger.error({ parentId, err: error }, "Failed to count children");
      throw error;
    } finally {
      connection.release();
    }
  }

  async getTreeNodesInPreOrder(examStudentId) {
    const connection = await pool.getConnection();
    try {
      const sql = `
      WITH RECURSIVE TT AS (
        SELECT 
          n.id,
          n.qType,
          n.contentText,
          n.followUpQuestion,
          n.studentAnswer,
          n.ntype,
          CAST(NULL AS SIGNED) AS parentId,
          0 AS bucketNtype,
          0 AS siblingIndex,
          0 AS depth
        FROM roots r
        JOIN node n ON r.rootId = n.id
        WHERE r.examStudentId = ?

        UNION ALL

        SELECT
          c.id,
          c.qType,
          c.contentText,
          c.followUpQuestion,
          c.studentAnswer,
          c.ntype,
          e.parentId,
          e.bucketNtype,
          e.siblingIndex,
          TT.depth + 1
        FROM edge e
        JOIN node c ON e.childId = c.id
        JOIN TT ON e.parentId = TT.id
      )
      SELECT 
        id, qType, contentText, followUpQuestion, studentAnswer, ntype,
        parentId, bucketNtype, siblingIndex, depth
      FROM TT
      ORDER BY depth, parentId, bucketNtype, siblingIndex;
    `;
      const [rows] = await connection.execute(sql, [examStudentId]);
      return rows;
    } catch (error) {
      logger.error({ examStudentId, err: error }, "Failed to get tree nodes");
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateStudentAnswer(nodeId, studentAnswer) {
    const connection = await pool.getConnection();
    try {
      const sql = `UPDATE node SET studentAnswer = ? WHERE id = ?`;
      await connection.execute(sql, [studentAnswer ?? null, nodeId]);
      // findNodeById는 내부적으로 connection을 다시 열므로, 여기서는 그냥 반환합니다.
      // 필요하다면 이 connection을 findNodeById에 넘겨주도록 수정할 수도 있습니다.
      return this.findNodeById(nodeId);
    } catch (error) {
      logger.error({ nodeId, err: error }, "Failed to update student answer");
      throw error;
    } finally {
      connection.release();
    }
  }

  async getRoot(examStudentId, sectionId, externalConnection = null) {
    const connection = externalConnection || (await pool.getConnection());
    try {
      const sql = `SELECT rootId FROM roots WHERE examStudentId = ? AND sectionId = ?`;
      const [rows] = await connection.execute(sql, [examStudentId, sectionId]);
      return rows[0] ? rows[0].rootId : null;
    } catch (error) {
      logger.error({ examStudentId, err: error }, "Failed to get root");
      throw error;
    } finally {
      if (!externalConnection) connection.release();
    }
  }

  async deleteTree(rootId, externalConnection = null) {
    const connection = externalConnection || (await pool.getConnection());
    try {
      // 1. Get all node IDs in the tree
      const getNodesSql = `
        WITH RECURSIVE Tree AS (
          SELECT id FROM node WHERE id = ?
          UNION ALL
          SELECT e.childId FROM edge e INNER JOIN Tree t ON e.parentId = t.id
        )
        SELECT id FROM Tree;
      `;
      const [rows] = await connection.execute(getNodesSql, [rootId]);

      if (rows.length === 0) return;

      const ids = rows.map((r) => r.id);

      // 2. Delete nodes (edges will cascade or we can rely on node deletion)
      // MySQL 'IN' clause limit is large enough for this use case
      const placeholders = ids.map(() => "?").join(",");
      const deleteSql = `DELETE FROM node WHERE id IN (${placeholders})`;

      await connection.execute(deleteSql, ids);
    } catch (error) {
      logger.error({ rootId, err: error }, "Failed to delete tree");
      throw error;
    } finally {
      if (!externalConnection) connection.release();
    }
  }
}

module.exports = new TreeRepository();
