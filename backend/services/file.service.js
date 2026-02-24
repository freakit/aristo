// backend/services/file.service.js
const fileRepository = require("../repositories/file.repository");

class FileService {
  async saveFileRecord(fileData) {
    const newFileId = await fileRepository.create(fileData);
    return { id: newFileId, ...fileData };
  }

  async getFileById(id) {
    return fileRepository.findById(id);
  }
}
module.exports = new FileService();
