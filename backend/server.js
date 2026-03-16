// server.js (Refactored with Pino Logger)

require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const logger = require("./config/logger");
const { createProxyMiddleware } = require("http-proxy-middleware");
// const pinoHttp = require("pino-http")({ logger });

const mainApiRouter = require("./routes");

const app = express();
const server = http.createServer(app);

// Allowed origins list
const allowedOrigins = [
  "https://aristo.freakit.co.kr",
  "https://aristo.netlify.app",
  "https://aristotest.netlify.app",
  "https://aristotest.freakit.co.kr",
  "http://localhost:3000",
  "http://localhost:3001", // Swagger UI
  "http://localhost:5173", // Vite frontend
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

// Proxy /api/live-question to Python Server
const PYTHON_API_URL = process.env.AI_SERVER_URL || "http://localhost:8000";
app.use(
  "/api/live-question",
  createProxyMiddleware({
    target: PYTHON_API_URL,
    changeOrigin: true,
    ws: true,
    pathRewrite: (path, req) => req.originalUrl, // Ensure original path is kept
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// app.use(pinoHttp);

app.use("/api", mainApiRouter);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.status(200).send("ARISTO AI-Tutor Backend Server is running!");
});

// Central error handler
app.use((err, req, res, next) => {
  logger.error({ method: req.method, path: req.path, err }, "Unhandled Error");

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error.";

  res.status(statusCode).json({ error: message });
});

// ⭐ Global exception handler — prevent process crash
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  // Keep process running without exiting
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled promise rejection");
  // Keep process running without exiting
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info({ port: PORT }, "ARISTO server is running");
});

// Server error handling
server.on("error", (error) => {
  logger.fatal({ err: error }, "Server Error");
});
