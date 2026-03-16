// backend/services/ai-proxy/websocket-manager.js

const WebSocket = require("ws");
const treeService = require("../tree.service");
const logger = require("../../config/logger");

class AIWebSocketManager {
  ws = null;
  isConnecting = false;
  connectionPromise = null;
  pingInterval = null;
  messageQueue = [];
  reconnectAttempts = 0;
  maxReconnectAttempts = 3;
  isClosing = false;
  lastActivity = Date.now();

  constructor() {
    this.aiServerUrl = process.env.AI_SERVER_URL;
    this.modelName = process.env.EXTERNAL_AI_MODEL_NAME;
    this.apiKey = process.env.OPENAI_API_KEY;

    if (!this.aiServerUrl || !this.modelName || !this.apiKey) {
      logger.error("External AI server environment variables not configured");
    }

    // Derive WebSocket URL from AI_SERVER_URL
    this.websocketUrl = this.aiServerUrl.replace(/^http/, "ws");
  }

  async initialize() {
    logger.info("Force cleanup and reconnect existing WebSocket");
    this.forceCleanup();

    this.connectionPromise = this.connect();
    return this.connectionPromise;
  }

  forceCleanup() {
    this.isConnecting = false;
    this.isClosing = true;
    this.reconnectAttempts = 0;

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.messageQueue.forEach((request) => {
      this.clearTimeouts(request);
      request.reject(new Error("Connection was forcefully restarted"));
    });
    this.messageQueue = [];

    if (this.ws) {
      try {
        const currentWs = this.ws;
        this.ws = null;

        // ⭐ Remove all event listeners (important!)
        currentWs.removeAllListeners();

        if (currentWs.readyState === WebSocket.OPEN) {
          currentWs.close(1000, "Force cleanup");
        } else if (currentWs.readyState === WebSocket.CONNECTING) {
          currentWs.terminate();
        }
      } catch (error) {
        logger.warn({ err: error }, "Error during WebSocket force termination");
        this.ws = null;
      }
    }

    this.connectionPromise = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.isConnecting = true;
        this.isClosing = false;

        const wsUrl = `${this.websocketUrl}/realtime?model=${this.modelName}`;
        const protocols = [
          "realtime",
          `openai-insecure-api-key.${this.apiKey}`,
        ];

        logger.info({ wsUrl }, "Creating new WebSocket connection");

        this.ws = new WebSocket(wsUrl, protocols);

        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            logger.warn("WebSocket connection timeout");
            this.ws.terminate();
            this.isConnecting = false;
            const timeoutError = new Error("WebSocket connection timeout");
            reject(timeoutError);
          }
        }, 10000);

        this.ws.on("open", () => {
          clearTimeout(connectionTimeout);
          logger.info("WebSocket connected successfully");
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startPingInterval();
          resolve();
        });

        this.ws.on("message", (data) => {
          this.lastActivity = Date.now();
          try {
            const response = JSON.parse(data.toString());
            this.handleServerMessage(response);
          } catch (error) {
            logger.error({ err: error }, "Message parsing error");
          }
        });

        // ⭐ Improved error handler
        this.ws.on("error", (error) => {
          clearTimeout(connectionTimeout);
          logger.error(
            {
              message: error.message,
              code: error.code,
              address: error.address,
              port: error.port,
            },
            "WebSocket error",
          );

          this.isConnecting = false;
          this.handleConnectionError(error);

          // Only calls reject, does not throw
          reject(new Error(`WebSocket error: ${error.message}`));
        });

        this.ws.on("close", (code, reason) => {
          clearTimeout(connectionTimeout);
          logger.info(
            { code, reason: reason?.toString() },
            "WebSocket connection closed",
          );
          this.isConnecting = false;
          this.cleanup();
        });
      } catch (error) {
        logger.error({ err: error }, "WebSocket creation exception");
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  context = { examStudentId: null, sectionId: null };

  setContext(examStudentId, sectionId) {
    this.context = { examStudentId, sectionId };
  }

  handleServerMessage(response) {
    if (response.type === "tree") {
      if (this.context.examStudentId && this.context.sectionId) {
        logger.info(
          { examStudentId: this.context.examStudentId },
          "Saving tree",
        );
        treeService
          .saveTreeJSON({
            examStudentId: this.context.examStudentId,
            sectionId: this.context.sectionId,
            treeJson: response.data,
          })
          .then((r) =>
            logger.info({ rootId: r.rootId }, "Tree saved successfully"),
          )
          .catch((e) => logger.error({ err: e }, "Tree save failed"));
      } else {
        logger.warn("Received tree but context is missing IDs");
      }
      return;
    }

    if (response.type === "pong") {
      return;
    }

    const pendingRequest = this.messageQueue.shift();
    if (!pendingRequest) {
      return;
    }

    this.clearTimeouts(pendingRequest);

    if (response.type === "finish") {
      pendingRequest.resolve({
        type: "finish",
        message: response.reason || "Finished",
      });
    } else if (response.message) {
      pendingRequest.resolve({
        type: response.type,
        message: response.message,
      });
    } else if (response.error || response.type === "error") {
      pendingRequest.reject(
        new Error(response.error || response.message || "Unknown server error"),
      );
    }
  }

  clearTimeouts(queuedMessage) {
    if (queuedMessage.timeoutId) clearTimeout(queuedMessage.timeoutId);
  }

  handleConnectionError(error) {
    logger.error({ err: error }, "Connection error handling");
    this.messageQueue.forEach((req) => {
      this.clearTimeouts(req);
      req.reject(new Error(`WebSocket connection error: ${error.message}`));
    });
    this.messageQueue = [];
  }

  startPingInterval() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      } else {
        clearInterval(this.pingInterval);
      }
    }, 20000);
  }

  async sendMessage(
    userInput,
    studentInfo = null,
    examInfo = null,
    attachments = null,
    resumeAnswer = null,
  ) {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected.");
    }

    return new Promise((resolve, reject) => {
      const messageId = `msg_${Date.now()}`;
      const isSessionStart = userInput === "START_SESSION";
      const isSessionEnd = userInput === "END_SESSION";

      const queuedMessage = { id: messageId, resolve, reject, timeoutId: null };
      this.messageQueue.push(queuedMessage);

      let messagePayload;
      if (isSessionStart) {
        // ⬇️ Attach documents only at session start
        messagePayload = {
          type: "test_start",
          id: messageId,
          student_info: studentInfo,
          exam_info: examInfo,
          attachments:
            Array.isArray(attachments) && attachments.length > 0
              ? attachments
              : undefined,
        };
      } else if (isSessionEnd) {
        messagePayload = { type: "end", id: messageId };
      } else if (userInput === "CONTINUE_SESSION") {
        // ⬇️ Session resume - include info + answer
        messagePayload = {
          type: "continue_session",
          id: messageId,
          student_info: studentInfo,
          exam_info: examInfo,
          data: resumeAnswer ? { user_input: resumeAnswer } : undefined,
          attachments:
            Array.isArray(attachments) && attachments.length > 0
              ? attachments
              : undefined,
        };
      } else {
        messagePayload = {
          type: "start",
          id: messageId,
          data: { user_input: userInput },
        };
      }

      try {
        this.ws.send(JSON.stringify(messagePayload));
        this.lastActivity = Date.now();

        queuedMessage.timeoutId = setTimeout(() => {
          const index = this.messageQueue.findIndex(
            (req) => req.id === messageId,
          );
          if (index !== -1) {
            this.messageQueue.splice(index, 1);
            reject(new Error(`Message response timeout (ID: ${messageId})`));
          }
        }, 300000);
      } catch (error) {
        logger.error({ err: error }, "Message send failed");
        const index = this.messageQueue.findIndex(
          (req) => req.id === messageId,
        );
        if (index !== -1) this.messageQueue.splice(index, 1);
        reject(error);
      }
    });
  }

  sendRawMessage(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
        this.lastActivity = Date.now();
      } catch (error) {
        logger.error({ err: error }, "Error sending raw message");
      }
    } else {
      logger.warn("Cannot send raw message, WebSocket is not open");
    }
  }

  cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  disconnect() {
    this.isClosing = true;
    this.cleanup();
    this.messageQueue.forEach((req) => {
      this.clearTimeouts(req);
      req.resolve({
        type: "canceled",
        message: "WebSocket connection manually disconnected.",
      });
    });
    this.messageQueue = [];
  }

  isConnected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

module.exports = AIWebSocketManager;
