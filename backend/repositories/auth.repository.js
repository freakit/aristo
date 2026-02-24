// backend/repositories/auth.repository.js

const pool = require("../config/db");
const logger = require("../config/logger");

class AuthRepository {
  async findStudentByLoginInfo(school, registrationNumber) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT u.*, s.id as studentId, s.school, s.registrationNumber, s.significant, u.sessionId
         FROM users u JOIN students s ON u.id = s.userId
         WHERE s.school = ? AND s.registrationNumber = ?`,
        [school, registrationNumber],
      );
      return rows[0];
    } catch (error) {
      logger.error({ err: error }, "Failed to find student by login info");
      throw error;
    } finally {
      connection.release();
    }
  }

  async findUserByEmail(email) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        "SELECT * FROM users WHERE email = ?",
        [email],
      );
      return rows[0];
    } catch (error) {
      logger.error({ email, err: error }, "Failed to find user by email");
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateSessionId(userId, sessionId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        "UPDATE users SET sessionId = ? WHERE id = ?",
        [sessionId, userId],
      );
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      logger.error({ err: error }, "Failed to update session ID");
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateUserPassword(userId, hashedPassword) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, userId],
      );
      return result.affectedRows > 0;
    } catch (error) {
      logger.error({ userId, err: error }, "Failed to update password");
      throw error;
    } finally {
      connection.release();
    }
  }

  async createStudent(userData) {
    const {
      password,
      name,
      age,
      gender,
      email,
      phoneNumber,
      school,
      registrationNumber,
      significant,
    } = userData;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [userResult] = await connection.execute(
        "INSERT INTO users (password, name, age, gender, email, phoneNumber) VALUES (?, ?, ?, ?, ?, ?)",
        [
          password,
          name,
          age || null,
          gender || null,
          email || null,
          phoneNumber || null,
        ],
      );
      const newUserId = userResult.insertId;
      await connection.execute(
        "INSERT INTO students (userId, school, registrationNumber, significant) VALUES (?, ?, ?, ?)",
        [newUserId, school, registrationNumber, significant || null],
      );
      await connection.commit();
      return newUserId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findProfessorByEmail(email) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        "SELECT * FROM users WHERE email = ? AND isStudent = 0",
        [email],
      );
      return rows[0];
    } catch (error) {
      logger.error({ email, err: error }, "Failed to find professor by email");
      throw error;
    } finally {
      connection.release();
    }
  }

  async createProfessor(userData) {
    const { password, name, age, gender, email, phoneNumber } = userData;
    const connection = await pool.getConnection();
    try {
      const [userResult] = await connection.execute(
        `INSERT INTO users (password, name, age, gender, email, phoneNumber, isStudent)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [
          password,
          name,
          age || null,
          gender || null,
          email,
          phoneNumber || null,
        ],
      );
      return userResult.insertId;
    } catch (error) {
      logger.error({ err: error }, "Failed to create professor");
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new AuthRepository();
