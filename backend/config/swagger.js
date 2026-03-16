// backend/config/swagger.js

const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AI Tutor API",
      version: "2.0.0",
      description: "AI Tutor Backend API (Firebase + Gemini Live)",
    },
    servers: [{ url: "http://localhost:3001", description: "Local development server" }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Firebase ID Token",
          description:
            "Firebase Auth ID Token. Issued via auth.currentUser.getIdToken() on the frontend",
        },
      },
    },
    tags: [
      { name: "Auth", description: "Firebase-based authentication API" },
      { name: "RAG", description: "Learning material upload and management" },
      { name: "Sessions", description: "Tutoring sessions and messages" },
      {
        name: "AI Proxy",
        description: "Python AI server proxy (WebSocket migration planned)",
      },
      { name: "Python", description: "Python server integration" },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
