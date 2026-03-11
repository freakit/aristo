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
      // Unit tests — use mocks, no Firebase connection
      displayName: "unit",
      testEnvironment: "node",
      testMatch: ["**/__tests__/services/**/*.test.js"],
      testTimeout: 10000,
    },
    {
      // Integration tests — connects to real Firestore
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["**/__tests__/integration/**/*.integration.test.js"],
      testTimeout: 30000,
      // Replace ESM config/firebase.js with CJS helper
      moduleNameMapper: {
        "^../config/firebase$":
          "<rootDir>/__tests__/integration/setup/firebaseAdmin.js",
        "^../../config/firebase$":
          "<rootDir>/__tests__/integration/setup/firebaseAdmin.js",
      },
    },
  ],
};
