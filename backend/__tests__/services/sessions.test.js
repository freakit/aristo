// __tests__/services/sessions.test.js
// sessions.repository 단위 테스트 (Firestore mock)

const mockDocRef = {
  id: "session-doc-id",
  set: jest.fn().mockResolvedValue(),
  update: jest.fn().mockResolvedValue(),
  delete: jest.fn().mockResolvedValue(),
  get: jest.fn(),
  collection: jest.fn(),
};

const mockMsgRef = {
  id: "msg-doc-id",
  set: jest.fn().mockResolvedValue(),
};

jest.mock("../../config/firebase", () => ({
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn(() => mockDocRef),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn(),
    batch: jest.fn(),
  },
}));

const { db } = require("../../config/firebase");
const sessionsRepo = require("../../repositories/sessions.repository");

describe("SessionsRepository", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("createSession", () => {
    it("세션 문서를 생성하고 sessionId를 포함한 데이터를 반환한다", async () => {
      const result = await sessionsRepo.createSession({
        uid: "uid1",
        title: "운영체제 공부",
        vectorDocIds: ["doc1"],
      });

      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: "uid1",
          title: "운영체제 공부",
          vectorDocIds: ["doc1"],
          status: "active",
        }),
      );
      expect(result).toMatchObject({
        sessionId: "session-doc-id",
        uid: "uid1",
        status: "active",
      });
    });

    it("title 없으면 기본값 '새 학습 세션' 적용", async () => {
      const result = await sessionsRepo.createSession({
        uid: "uid1",
        vectorDocIds: [],
      });
      expect(result.title).toBe("새 학습 세션");
    });
  });

  describe("getSessionById", () => {
    it("문서가 존재하면 데이터 반환", async () => {
      const fakeData = { uid: "uid1", title: "공부", status: "active" };
      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: "sess1",
        data: () => fakeData,
      });

      const result = await sessionsRepo.getSessionById("sess1");
      expect(result).toMatchObject({ sessionId: "sess1", ...fakeData });
    });

    it("문서가 없으면 null 반환", async () => {
      mockDocRef.get.mockResolvedValue({ exists: false });
      const result = await sessionsRepo.getSessionById("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("endSession", () => {
    it("status를 ended로 업데이트하고 최신 데이터를 반환한다", async () => {
      const fakeData = { uid: "uid1", status: "ended" };
      mockDocRef.update.mockResolvedValue();
      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: "sess1",
        data: () => fakeData,
      });

      const result = await sessionsRepo.endSession("sess1");

      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "ended" }),
      );
      expect(result.status).toBe("ended");
    });
  });

  describe("addMessage", () => {
    it("서브컬렉션에 메시지를 저장하고 msgId를 반환한다", async () => {
      const msgCollection = { doc: jest.fn(() => mockMsgRef) };
      mockDocRef.collection.mockReturnValue(msgCollection);
      // updatedAt 업데이트용
      mockDocRef.update.mockResolvedValue();

      const result = await sessionsRepo.addMessage("sess1", {
        role: "user",
        content: "페이징이 뭐야?",
        turn: 1,
      });

      expect(mockMsgRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "user",
          content: "페이징이 뭐야?",
          turn: 1,
        }),
      );
      expect(result).toMatchObject({
        msgId: "msg-doc-id",
        role: "user",
        turn: 1,
      });
    });
  });
});
