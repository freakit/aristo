// backend/controllers/azure.controller.js

const azureService = require("../services/azure.service");
const logger = require("../config/logger");

class AzureController {
  async generateSasToken(req, res) {
    try {
      const fileName = String(req.query.fileName || "").trim();
      const folder = String(req.query.folder || "recordings").trim();

      const sasUrl = await azureService.generateSasToken(fileName, folder);
      res.json({ success: true, sasUrl });
    } catch (error) {
      logger.error({ err: error }, "Azure SAS Error");
      res.status(500).json({ error: error.message || "SAS 토큰 발급 실패" });
    }
  }

  async listBlobs(req, res) {
    try {
      const folder = String(req.query.folder || "recordings").trim();
      const prefix = String(req.query.prefix || "").trim();

      const blobs = await azureService.listBlobs(folder, prefix);
      res.json({ success: true, blobs });
    } catch (error) {
      logger.error({ err: error }, "Azure List Error");
      res.status(500).json({ error: error.message || "블롭 목록 조회 실패" });
    }
  }
}

module.exports = new AzureController();
