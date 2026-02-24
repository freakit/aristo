// backend/controllers/student.controller.js

const studentService = require("../services/student.service");

class StudentController {
  async getAllStudents(req, res, next) {
    try {
      const students = await studentService.getAllStudents();
      res.status(200).json(students);
    } catch (error) {
      next(error);
    }
  }

  async getStudentByRegistrationNumber(req, res, next) {
    try {
      const { registrationNumber } = req.params;
      const student = await studentService.getStudentByRegistrationNumber(
        registrationNumber
      );
      res.status(200).json(student);
    } catch (error) {
      next(error);
    }
  }

  async checkStudentExists(req, res, next) {
    try {
      const { registrationNumber } = req.params;
      const result = await studentService.checkStudentExists(
        registrationNumber
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StudentController();
