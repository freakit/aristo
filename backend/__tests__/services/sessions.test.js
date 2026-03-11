// __tests__/services/sessions.test.js
// sessions.service unit tests

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
  title: "Operating Systems Study",
  status: "active",
};

describe("SessionsService", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("createSession", () => {
    it("creates and returns a session", async () => {
      sessionsRepository.createSession.mockResolvedValue(fakeSession);

      const result = await sessionsService.createSession({
        uid: OWNER_UID,
        title: "Operating Systems Study",
        vectorDocIds: ["doc1"],
      });

      expect(sessionsRepository.createSession).toHaveBeenCalledWith({
        uid: OWNER_UID,
        title: "Operating Systems Study",
        vectorDocIds: ["doc1"],
      });
      expect(result).toEqual(fakeSession);
    });
  });

  describe("getSession", () => {
    it("throws statusCode 404 if session not found", async () => {
      sessionsRepository.getSessionById.mockResolvedValue(null);

      await expect(
        sessionsService.getSession(SESSION_ID, OWNER_UID),
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws statusCode 403 if different user uid", async () => {
      sessionsRepository.getSessionById.mockResolvedValue(fakeSession);

      await expect(
        sessionsService.getSession(SESSION_ID, OTHER_UID),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("returns session + messages on valid request", async () => {
      const messages = [{ msgId: "m1", role: "user", content: "Hello" }];
      sessionsRepository.getSessionById.mockResolvedValue(fakeSession);
      sessionsRepository.getMessages.mockResolvedValue(messages);

      const result = await sessionsService.getSession(SESSION_ID, OWNER_UID);

      expect(result).toMatchObject({ ...fakeSession, messages });
    });
  });

  describe("endSession", () => {
    it("throws statusCode 404 if session not found", async () => {
      sessionsRepository.getSessionById.mockResolvedValue(null);

      await expect(
        sessionsService.endSession(SESSION_ID, OWNER_UID),
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws statusCode 403 if no permission", async () => {
      sessionsRepository.getSessionById.mockResolvedValue(fakeSession);

      await expect(
        sessionsService.endSession(SESSION_ID, OTHER_UID),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("ends and returns session on valid request", async () => {
      const ended = { ...fakeSession, status: "ended" };
      sessionsRepository.getSessionById.mockResolvedValue(fakeSession);
      sessionsRepository.endSession.mockResolvedValue(ended);

      const result = await sessionsService.endSession(SESSION_ID, OWNER_UID);
      expect(result.status).toBe("ended");
    });
  });

  describe("deleteSession", () => {
    it("throws statusCode 403 if no permission", async () => {
      sessionsRepository.getSessionById.mockResolvedValue(fakeSession);

      await expect(
        sessionsService.deleteSession(SESSION_ID, OTHER_UID),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("deletes session on valid request", async () => {
      sessionsRepository.getSessionById.mockResolvedValue(fakeSession);
      sessionsRepository.deleteSession.mockResolvedValue();

      await sessionsService.deleteSession(SESSION_ID, OWNER_UID);
      expect(sessionsRepository.deleteSession).toHaveBeenCalledWith(SESSION_ID);
    });
  });
});
