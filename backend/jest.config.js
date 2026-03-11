module.exports = {
  verbose: true,
  collectCoverageFrom: [
    "services/**/*.js",
    "controllers/**/*.js",
    "repositories/**/*.js",
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  projects: [
    {
      // 단위 테스트 — mock 사용, firebase 연결 없음
      displayName: "unit",
      testEnvironment: "node",
      testMatch: ["**/__tests__/services/**/*.test.js"],
      testTimeout: 10000,
    },
    {
      // 통합 테스트 — 실제 Firestore 연결
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["**/__tests__/integration/**/*.integration.test.js"],
      testTimeout: 30000,
      // ESM인 config/firebase.js를 CJS 헬퍼로 교체
      moduleNameMapper: {
        "^../config/firebase$":
          "<rootDir>/__tests__/integration/setup/firebaseAdmin.js",
        "^../../config/firebase$":
          "<rootDir>/__tests__/integration/setup/firebaseAdmin.js",
      },
    },
  ],
};
