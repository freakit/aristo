// backend/repositories/file.repository.js
const pool = require("../config/db");
const logger = require("../config/logger");

class FileRepository {
  async create(fileData) {
    const { fileName, fileUrl } = fileData;
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        "INSERT INTO files (fileName, fileUrl) VALUES (?, ?)",
        [fileName, fileUrl],
      );
      return result.insertId;
    } catch (error) {
      logger.error({ err: error }, "Failed to create file");
      throw error;
    } finally {
      connection.release();
    }
  }

  async findById(id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        "SELECT * FROM files WHERE id = ?",
        [id],
      );
      return rows[0];
    } catch (error) {
      logger.error({ id, err: error }, "Failed to find file by id");
      throw error;
    } finally {
      connection.release();
    }
  }
}
module.exports = new FileRepository();
