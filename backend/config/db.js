// db.js

const mysql = require("mysql2/promise");
const logger = require("./logger");

/**
 * MySQL 데이터베이스 연결 풀을 생성하고 관리합니다.
 * 환경 변수(.env)에서 데이터베이스 연결 정보를 가져옵니다.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "3306", 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 날짜를 '문자열' 그대로 받는다 (DATETIME/TIMESTAMP 모두)
  dateStrings: true,

  // 드라이버의 내부 타임존 보정 비활성화 (UTC로 고정)
  timezone: "Z",
});

// 애플리케이션 시작 시 연결 테스트
pool
  .getConnection()
  .then((conn) => {
    logger.info("MySQL database connected successfully");
    conn.release();
  })
  .catch((err) => {
    logger.fatal({ err }, "MySQL database connection failed");
    // 연결 실패 시 프로세스를 종료하여 문제를 즉시 인지하도록 함
    process.exit(1);
  });

module.exports = pool;
