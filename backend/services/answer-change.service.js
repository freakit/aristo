const answerChangeRepository = require("../repositories/answer-change.repository");
const fileService = require("./file.service");

class AnswerChangeService {
  async logChange({ examStudentId, oldAnswer, newAnswer, audioUrl, turn }) {
    if (!examStudentId) {
      const error = new Error("examStudentId is required");
      error.statusCode = 400;
      throw error;
    }

    let audioFileId = null;
    if (audioUrl) {
      // Create a file record for the audio URL
      // Extract filename from URL (remove query params if any, though cleanUrl is expected)
      const urlObj = new URL(audioUrl);
      const pathname = urlObj.pathname; // /container/filename
      const fileName = pathname.split("/").pop(); // filename
      const fileRecord = await fileService.saveFileRecord({
        fileName,
        fileUrl: audioUrl,
      });
      audioFileId = fileRecord.id;
    }

    const changeId = await answerChangeRepository.create({
      examStudentId,
      oldAnswer,
      newAnswer,
      audioFileId,
      turn,
    });

    return { changeId, audioFileId };
  }

  async getChange({ examStudentId, turn }) {
    if (!examStudentId) {
      const error = new Error("examStudentId is required");
      error.statusCode = 400;
      throw error;
    }

    if (turn === undefined || turn === null) {
      const error = new Error("turn is required");
      error.statusCode = 400;
      throw error;
    }

    const changes = await answerChangeRepository.findByExamStudentIdAndTurn(
      examStudentId,
      turn
    );

    const result = await Promise.all(
      changes.map(async (change) => {
        if (change.audio_file) {
          const file = await fileService.getFileById(change.audio_file);
          if (file) {
            return { ...change, fileName: file.fileName };
          }
        }
        return change;
      })
    );

    return result;
  }
}

module.exports = new AnswerChangeService();
