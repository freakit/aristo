// __tests__/services/auth.test.js
// auth.controller의 register, me 엔드포인트 테스트

jest.mock("../../config/firebase", () => ({
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
  },
  auth: {
    getUser: jest.fn(),
  },
}));

const { db, auth } = require("../../config/firebase");
const authController = require("../../controllers/auth.controller");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("AuthController", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("register", () => {
    it("유저 문서가 이미 있으면 200 반환", async () => {
      const existingData = { uid: "uid1", email: "a@a.com", name: "홍길동" };
      db.get.mockResolvedValue({ exists: true, data: () => existingData });

      const req = { uid: "uid1", body: { name: "홍길동" } };
      const res = mockRes();
      await authController.register(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(existingData);
    });

    it("신규 유저면 Firestore에 저장 후 201 반환", async () => {
      db.get.mockResolvedValue({ exists: false });
      db.set.mockResolvedValue();
      auth.getUser.mockResolvedValue({
        email: "new@a.com",
        displayName: "김철수",
        photoURL: null,
        providerData: [{ providerId: "password" }],
      });

      const req = { uid: "uid2", body: { name: "김철수" } };
      const res = mockRes();
      await authController.register(req, res, jest.fn());

      expect(db.set).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ uid: "uid2", email: "new@a.com" }),
      );
    });

    it("Firebase 오류 시 next(error) 호출", async () => {
      db.get.mockRejectedValue(new Error("Firestore error"));
      const req = { uid: "uid3", body: {} };
      const next = jest.fn();
      await authController.register(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("me", () => {
    it("유저 문서가 존재하면 200 반환", async () => {
      const data = { uid: "uid1", email: "a@a.com", name: "홍길동" };
      db.get.mockResolvedValue({ exists: true, data: () => data });

      const req = { uid: "uid1" };
      const res = mockRes();
      await authController.me(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(data);
    });

    it("유저 문서 없으면 404", async () => {
      db.get.mockResolvedValue({ exists: false });
      const next = jest.fn();
      await authController.me({ uid: "uid_none" }, mockRes(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 }),
      );
    });
  });
});
