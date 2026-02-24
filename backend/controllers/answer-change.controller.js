const answerChangeService = require("../services/answer-change.service");

class AnswerChangeController {
  async createChange(req, res, next) {
    try {
      const { examStudentId, oldAnswer, newAnswer, audioUrl, turn } = req.body;
      const result = await answerChangeService.logChange({
        examStudentId,
        oldAnswer,
        newAnswer,
        audioUrl,
        turn,
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getChange(req, res, next) {
    try {
      const { examStudentId, turn } = req.params;
      const result = await answerChangeService.getChange({
        examStudentId: parseInt(examStudentId),
        turn: parseInt(turn),
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnswerChangeController();
