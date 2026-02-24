// backend/services/student.service.js

const studentRepository = require("../repositories/student.repository");

class StudentService {
  /**
   * 모든 학생 목록을 가져옵니다.
   */
  async getAllStudents() {
    const students = await studentRepository.findAll();
    return students;
  }

  /**
   * 학번으로 특정 학생 정보를 가져옵니다.
   * @param {string} registrationNumber
   */
  async getStudentByRegistrationNumber(registrationNumber) {
    const student =
      await studentRepository.findByRegistrationNumber(registrationNumber);
    if (!student) {
      const error = new Error(
        "Student with this registration number not found",
      );
      error.statusCode = 404;
      throw error;
    }
    return student;
  }

  /**
   * 학번으로 학생 존재 여부를 확인합니다.
   * @param {string} registrationNumber
   */
  async checkStudentExists(registrationNumber) {
    const student =
      await studentRepository.findByRegistrationNumber(registrationNumber);
    return { exists: !!student }; // student 객체가 있으면 true, 없으면(null) false
  }
}

module.exports = new StudentService();
