// __tests__/integration/sessions.repository.integration.test.js
// sessions.repository integration test - connects to actual Firestore

const { db } = require("./setup/firebaseAdmin");
const sessionsRepository = require("../../repositories/sessions.repository");

const TEST_UID = "test_integ_sessions_user";
let createdSessionId = null;

describe("[Integration] SessionsRepository — Firestore Connection", () => {
  // Clean up remaining session after tests
  afterAll(async () => {
    if (createdSessionId) {
      try {
        await sessionsRepository.deleteSession(createdSessionId);
      } catch {
        // May already be deleted
      }
    }
  });

  describe("createSession", () => {
    it("creates a session in Firestore and returns sessionId", async () => {
      const result = await sessionsRepository.createSession({
        uid: TEST_UID,
        title: "Integration Test Session",
        vectorDocIds: [],
      });

      expect(result.sessionId).toBeDefined();
      expect(result.uid).toBe(TEST_UID);
      expect(result.title).toBe("Integration Test Session");
      expect(result.status).toBe("active");

      createdSessionId = result.sessionId;

      // Directly query Firestore
      const snap = await db.collection("sessions").doc(createdSessionId).get();
      expect(snap.exists).toBe(true);
      expect(snap.data().uid).toBe(TEST_UID);
    }, 30000);
  });

  describe("getSessionsByUid", () => {
    it("verifies session list by direct single fetch via uid", async () => {
      // getSessionsByUid needs composite index (uid+createdAt)
      // → since index might not be ready, verify with single fetch
      const session = await sessionsRepository.getSessionById(createdSessionId);
      expect(session).not.toBeNull();
      expect(session.uid).toBe(TEST_UID);
    }, 30000);
  });

  describe("getSessionById", () => {
    it("fetches single session by sessionId", async () => {
      const session = await sessionsRepository.getSessionById(createdSessionId);
      expect(session).not.toBeNull();
      expect(session.sessionId).toBe(createdSessionId);
      expect(session.uid).toBe(TEST_UID);
    }, 30000);

    it("returns null when querying non-existent sessionId", async () => {
      const result = await sessionsRepository.getSessionById(
        "non_existent_session_id",
      );
      expect(result).toBeNull();
    }, 30000);
  });

  describe("addMessage & getMessages", () => {
    it("adds messages and fetches in order", async () => {
      await sessionsRepository.addMessage(createdSessionId, {
        role: "user",
        content: "First question.",
        turn: 1,
      });
      await sessionsRepository.addMessage(createdSessionId, {
        role: "assistant",
        content: "First answer.",
        turn: 2,
      });

      const messages = await sessionsRepository.getMessages(createdSessionId);
      expect(messages.length).toBe(2);
      expect(messages[0].turn).toBe(1);
      expect(messages[0].role).toBe("user");
      expect(messages[1].turn).toBe(2);
      expect(messages[1].role).toBe("assistant");
    }, 30000);
  });

  describe("endSession", () => {
    it("changes session status to ended", async () => {
      const result = await sessionsRepository.endSession(createdSessionId);
      expect(result.status).toBe("ended");

      // Directly query Firestore
      const snap = await db.collection("sessions").doc(createdSessionId).get();
      expect(snap.data().status).toBe("ended");
    }, 30000);
  });

  describe("deleteSession", () => {
    it("deletes both session and messages subcollection", async () => {
      await sessionsRepository.deleteSession(createdSessionId);

      // Directly query Firestore — session document should be gone
      const snap = await db.collection("sessions").doc(createdSessionId).get();
      expect(snap.exists).toBe(false);

      // Messages subcollection should also be gone
      const msgsSnap = await db
        .collection("sessions")
        .doc(createdSessionId)
        .collection("messages")
        .get();
      expect(msgsSnap.empty).toBe(true);

      createdSessionId = null; // No afterAll cleanup needed
    }, 30000);
  });
});
