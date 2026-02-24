// backend/repositories/student.repository.js

const pool = require("../config/db");
const logger = require("../config/logger");

class StudentRepository {
  async findAll() {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT
           u.id, u.userId, u.name, u.age, u.gender, u.email, u.phoneNumber,
           s.id AS studentId, s.school, s.registrationNumber, s.significant
         FROM users u
         JOIN students s ON u.id = s.userId
         ORDER BY u.name ASC`,
      );
      return rows;
    } catch (error) {
      logger.error({ err: error }, "Failed to find all students");
      throw error;
    } finally {
      connection.release();
    }
  }

  async findByRegistrationNumber(registrationNumber) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT
           u.id, u.userId, u.name, u.age, u.gender, u.email, u.phoneNumber,
           s.id AS studentId, s.school, s.registrationNumber, s.significant
         FROM users u
         JOIN students s ON u.id = s.userId
         WHERE s.registrationNumber = ?`,
        [registrationNumber],
      );
      return rows[0];
    } catch (error) {
      logger.error(
        { registrationNumber, err: error },
        "Failed to find student by registration number",
      );
      throw error;
    } finally {
      connection.release();
    }
  }

  async findById(id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT
           u.id, u.userId, u.name, u.age, u.gender, u.email, u.phoneNumber,
           s.id AS studentId, s.school, s.registrationNumber, s.significant
         FROM users u
         JOIN students s ON u.id = s.userId
         WHERE s.id = ?`,
        [id],
      );
      return rows[0];
    } catch (error) {
      logger.error({ id, err: error }, "Failed to find student by id");
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new StudentRepository();
