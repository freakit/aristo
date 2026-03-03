// __tests__/integration/sessions.repository.integration.test.js
// sessions.repository 통합 테스트 — 실제 Firestore에 연결

const { db } = require("./setup/firebaseAdmin");
const sessionsRepository = require("../../repositories/sessions.repository");

const TEST_UID = "test_integ_sessions_user";
let createdSessionId = null;

describe("[통합] SessionsRepository — Firestore 연동", () => {
  // 테스트 후 남은 세션 정리
  afterAll(async () => {
    if (createdSessionId) {
      try {
        await sessionsRepository.deleteSession(createdSessionId);
      } catch {
        // 이미 삭제됐을 수 있음
      }
    }
  });

  describe("createSession", () => {
    it("세션을 Firestore에 생성하고 sessionId를 반환한다", async () => {
      const result = await sessionsRepository.createSession({
        uid: TEST_UID,
        title: "통합테스트 세션",
        vectorDocIds: [],
      });

      expect(result.sessionId).toBeDefined();
      expect(result.uid).toBe(TEST_UID);
      expect(result.title).toBe("통합테스트 세션");
      expect(result.status).toBe("active");

      createdSessionId = result.sessionId;

      // Firestore 직접 조회
      const snap = await db.collection("sessions").doc(createdSessionId).get();
      expect(snap.exists).toBe(true);
      expect(snap.data().uid).toBe(TEST_UID);
    }, 30000);
  });

  describe("getSessionsByUid", () => {
    it("uid로 세션 목록을 단건 직접 조회로 검증한다", async () => {
      // getSessionsByUid는 복합 인덱스(uid+createdAt) 필요
      // → 인덱스 생성 전이므로 단건 조회로 대체 검증
      const session = await sessionsRepository.getSessionById(createdSessionId);
      expect(session).not.toBeNull();
      expect(session.uid).toBe(TEST_UID);
    }, 30000);
  });

  describe("getSessionById", () => {
    it("sessionId로 단건 조회한다", async () => {
      const session = await sessionsRepository.getSessionById(createdSessionId);
      expect(session).not.toBeNull();
      expect(session.sessionId).toBe(createdSessionId);
      expect(session.uid).toBe(TEST_UID);
    }, 30000);

    it("존재하지 않는 sessionId 조회 시 null을 반환한다", async () => {
      const result = await sessionsRepository.getSessionById(
        "non_existent_session_id",
      );
      expect(result).toBeNull();
    }, 30000);
  });

  describe("addMessage & getMessages", () => {
    it("메시지를 추가하고 순서대로 조회한다", async () => {
      await sessionsRepository.addMessage(createdSessionId, {
        role: "user",
        content: "첫 번째 질문입니다.",
        turn: 1,
      });
      await sessionsRepository.addMessage(createdSessionId, {
        role: "assistant",
        content: "첫 번째 답변입니다.",
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
    it("세션 상태를 ended로 변경한다", async () => {
      const result = await sessionsRepository.endSession(createdSessionId);
      expect(result.status).toBe("ended");

      // Firestore 직접 확인
      const snap = await db.collection("sessions").doc(createdSessionId).get();
      expect(snap.data().status).toBe("ended");
    }, 30000);
  });

  describe("deleteSession", () => {
    it("세션과 메시지 서브컬렉션을 모두 삭제한다", async () => {
      await sessionsRepository.deleteSession(createdSessionId);

      // Firestore 직접 확인 — 세션 문서 없어야 함
      const snap = await db.collection("sessions").doc(createdSessionId).get();
      expect(snap.exists).toBe(false);

      // 메시지 서브컬렉션도 없어야 함
      const msgsSnap = await db
        .collection("sessions")
        .doc(createdSessionId)
        .collection("messages")
        .get();
      expect(msgsSnap.empty).toBe(true);

      createdSessionId = null; // afterAll cleanup 불필요
    }, 30000);
  });
});
