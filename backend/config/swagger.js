// backend/config/swagger.js

const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ARISTO AI-Tutor API",
      version: "1.0.0",
      description: "ARISTO 백엔드 API 문서",
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "로컬 개발 서버",
      },
      {
        url: "https://aristo.freakit.co.kr",
        description: "프로덕션 서버",
      },
    ],
    tags: [
      { name: "Auth", description: "인증 관련 API" },
      { name: "Exams", description: "시험 관련 API" },
      { name: "Students", description: "학생 관련 API" },
      { name: "AI Proxy", description: "AI 프록시 API" },
      { name: "Azure", description: "Azure Storage API" },
      { name: "Trees", description: "트리 구조 API" },
      { name: "Answer Changes", description: "답변 수정 API" },
      { name: "Deepgram", description: "Deepgram STT API" },
      { name: "OpenAI", description: "OpenAI TTS/STT API" },
      { name: "Files", description: "파일 메타데이터 API" },
    ],
  },
  apis: ["./routes/*.js"], // route 파일들에서 주석 읽기
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
