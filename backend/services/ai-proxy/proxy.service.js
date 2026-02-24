// backend/services/ai-proxy/proxy.service.js

const AIWebSocketManager = require("./websocket-manager.service");
const logger = require("../../config/logger");

class AIProxyService {
  constructor() {
    this.sessionConnections = new Map();
    this.startCleanupInterval();
  }

  createManager() {
    return new AIWebSocketManager();
  }

  getSessionManager(sessionId) {
    return this.sessionConnections.get(sessionId);
  }

  setSessionManager(sessionId, manager) {
    this.sessionConnections.set(sessionId, manager);
  }

  deleteSession(sessionId) {
    const manager = this.sessionConnections.get(sessionId);
    if (manager) {
      manager.disconnect();
    }
    this.sessionConnections.delete(sessionId);
  }

  getActiveSessionCount() {
    return this.sessionConnections.size;
  }

  startCleanupInterval() {
    setInterval(
      () => {
        const now = Date.now();
        const TIMEOUT = 1000 * 60 * 30; // 30분 비활성

        for (const [sessionId, manager] of this.sessionConnections.entries()) {
          if (now - manager.lastActivity > TIMEOUT) {
            logger.info({ sessionId }, "Cleaning up inactive session");
            manager.disconnect();
            this.sessionConnections.delete(sessionId);
          }
        }
      },
      1000 * 60 * 5,
    ); // 5분마다 체크
  }
}

module.exports = AIProxyService;
