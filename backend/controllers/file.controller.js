// backend/controllers/file.controller.js
const fileService = require("../services/file.service");

class FileController {
  async createFileRecord(req, res, next) {
    try {
      const fileData = req.body;
      const newFile = await fileService.saveFileRecord(fileData);
      res.status(201).json(newFile);
    } catch (error) {
      next(error);
    }
  }
}
module.exports = new FileController();
