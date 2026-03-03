// backend/config/swagger.js

const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AI Tutor API",
      version: "2.0.0",
      description: "AI Tutor 백엔드 API (Firebase + Gemini Live)",
    },
    servers: [{ url: "http://localhost:3001", description: "로컬 개발 서버" }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Firebase ID Token",
          description:
            "Firebase Auth ID Token. 프론트에서 auth.currentUser.getIdToken()으로 발급",
        },
      },
    },
    tags: [
      { name: "Auth", description: "Firebase 기반 인증 API" },
      { name: "RAG", description: "학습 자료 업로드 및 관리" },
      { name: "Sessions", description: "튜터링 세션 및 메시지" },
      {
        name: "AI Proxy",
        description: "Python AI 서버 프록시 (WebSocket 전환 예정)",
      },
      { name: "Python", description: "Python 서버 연동" },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
