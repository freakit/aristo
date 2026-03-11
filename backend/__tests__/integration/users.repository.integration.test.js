// __tests__/integration/users.repository.integration.test.js
// users.repository integration tests — connects to real Firestore

const { db } = require("./setup/firebaseAdmin");

// users.repository requires config/firebase.js internally,
// which is ESM and cannot be required directly → inject CJS helper via Jest moduleNameMapper
const usersRepository = require("../../repositories/users.repository");

const TEST_UID = "test_integ_user_001";

describe("[Integration] UsersRepository — Firestore Connection", () => {
  // Clean up test document from Firestore after tests
  afterAll(async () => {
    await db.collection("users").doc(TEST_UID).delete();
  });

  describe("createUser", () => {
    it("actually creates a user document in Firestore", async () => {
      const profile = {
        uid: TEST_UID,
        email: "integ@test.com",
        name: "IntegrationTestUser",
        photoURL: null,
        provider: "email",
        createdAt: new Date().toISOString(),
      };

      await usersRepository.createUser(TEST_UID, profile);

      // Directly query Firestore to verify save
      const snap = await db.collection("users").doc(TEST_UID).get();
      expect(snap.exists).toBe(true);
      expect(snap.data()).toMatchObject({
        uid: TEST_UID,
        email: "integ@test.com",
        name: "IntegrationTestUser",
        provider: "email",
      });
    });
  });

  describe("getUser", () => {
    it("returns profile data when queried with existing uid", async () => {
      const result = await usersRepository.getUser(TEST_UID);
      expect(result).not.toBeNull();
      expect(result.uid).toBe(TEST_UID);
      expect(result.email).toBe("integ@test.com");
    });

    it("returns null when queried with non-existent uid", async () => {
      const result = await usersRepository.getUser("test_integ_non_existent");
      expect(result).toBeNull();
    });
  });
});
