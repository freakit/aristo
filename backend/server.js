// server.js (Refactored with Pino Logger)

require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const logger = require("./config/logger");
// const pinoHttp = require("pino-http")({ logger });

const mainApiRouter = require("./routes");

const app = express();
const server = http.createServer(app);

// 허용할 출처 목록
const allowedOrigins = [
  "https://aristo.freakit.co.kr",
  "https://aristo.netlify.app",
  "https://aristotest.netlify.app",
  "https://aristotest.freakit.co.kr",
  "http://localhost:3000",
  "http://localhost:3001", // Swagger UI
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// app.use(pinoHttp);

app.use("/api", mainApiRouter);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.status(200).send("ARISTO AI-Tutor Backend Server is running!");
});

// 중앙 에러 핸들러
app.use((err, req, res, next) => {
  if (req.path === "/api/trees/init") {
    logger.error({ path: req.path }, "Error in /api/trees/init");
  } else {
    logger.error(
      { method: req.method, path: req.path, err },
      "Unhandled Error",
    );
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "서버 내부 오류가 발생했습니다.";

  res.status(statusCode).json({ error: message });
});

// ⭐ 전역 예외 핸들러 추가 - 프로세스 크래시 방지
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  // 프로세스를 종료하지 않고 계속 실행
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled promise rejection");
  // 프로세스를 종료하지 않고 계속 실행
});

// 서버 시작
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info({ port: PORT }, "ARISTO server is running");
});

// 서버 에러 핸들링
server.on("error", (error) => {
  logger.fatal({ err: error }, "Server Error");
});
