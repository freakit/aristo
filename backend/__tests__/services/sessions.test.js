// __tests__/services/sessions.test.js
// sessions.service 단위 테스트

jest.mock("../../repositories/sessions.repository", () => ({
  createSession: jest.fn(),
  getSessionsByUid: jest.fn(),
  getSessionById: jest.fn(),
  getMessages: jest.fn(),
  endSession: jest.fn(),
  deleteSession: jest.fn(),
}));

const sessionsRepository = require("../../repositories/sessions.repository");
const sessionsService = require("../../services/sessions.service");

const OWNER_UID = "uid1";
const OTHER_UID = "uid2";
const SESSION_ID = "sess1";

const fakeSession = {
  sessionId: SESSION_ID,
  uid: OWNER_UID,
  title: "운영체제 공부",
  status: "active",
};

describe("SessionsService", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("createSession", () => {
    it("세션을 생성하고 반환한다", async () => {
      sessionsRepository.createSession.mockResolvedValue(fakeSession);

      const result = await sessionsService.createSession({
        uid: OWNER_UID,
        title: "운영체제 공부",
        vectorDocIds: ["doc1"],
      });

      expect(sessionsRepository.createSession).toHaveBeenCalledWith({
        uid: OWNER_UID,
        title: "운영체제 공부",
        vectorDocIds: ["doc1"],
      });
      expect(result).toEqual(fakeSession);
    });
  });

  describe("getSession", () => {
    it("세션이 없으면 statusCode 404 throw", async () => {
      sessionsRepository.getSessionById.mockResolvedValue(null);

      await expect(
        sessionsService.getSession(SESSION_ID, OWNER_UID),
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("다른 유저 uid면 statusCode 403 throw", async () => {
      sessionsRepository.getSessionById.mockResolvedValue(fakeSession);

      await expect(
        sessionsService.getSession(SESSION_ID, OTHER_UID),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("정상 요청이면 세션 + 메시지 반환", async () => {
      const messages = [{ msgId: "m1", role: "user", content: "안녕" }];
      sessionsRepository.getSessionById.mockResolvedValue(fakeSession);
      sessionsRepository.getMessages.mockResolvedValue(messages);

      const result = await sessionsService.getSession(SESSION_ID, OWNER_UID);

      expect(result).toMatchObject({ ...fakeSession, messages });
    });
  });

  describe("endSession", () => {
    it("세션이 없으면 statusCode 404 throw", async () => {
      sessionsRepository.getSessionById.mockResolvedValue(null);

      await expect(
        sessionsService.endSession(SESSION_ID, OWNER_UID),
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("권한 없으면 statusCode 403 throw", async () => {
      sessionsRepository.getSessionById.mockResolvedValue(fakeSession);

      await expect(
        sessionsService.endSession(SESSION_ID, OTHER_UID),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("정상 요청이면 세션을 종료하고 반환", async () => {
      const ended = { ...fakeSession, status: "ended" };
      sessionsRepository.getSessionById.mockResolvedValue(fakeSession);
      sessionsRepository.endSession.mockResolvedValue(ended);

      const result = await sessionsService.endSession(SESSION_ID, OWNER_UID);
      expect(result.status).toBe("ended");
    });
  });

  describe("deleteSession", () => {
    it("권한 없으면 statusCode 403 throw", async () => {
      sessionsRepository.getSessionById.mockResolvedValue(fakeSession);

      await expect(
        sessionsService.deleteSession(SESSION_ID, OTHER_UID),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("정상 요청이면 세션 삭제", async () => {
      sessionsRepository.getSessionById.mockResolvedValue(fakeSession);
      sessionsRepository.deleteSession.mockResolvedValue();

      await sessionsService.deleteSession(SESSION_ID, OWNER_UID);
      expect(sessionsRepository.deleteSession).toHaveBeenCalledWith(SESSION_ID);
    });
  });
});
