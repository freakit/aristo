// __tests__/services/auth.test.js
// auth.service 단위 테스트

jest.mock("../../config/firebase", () => ({
  auth: {
    getUser: jest.fn(),
  },
}));

jest.mock("../../repositories/users.repository", () => ({
  getUser: jest.fn(),
  createUser: jest.fn(),
}));

const { auth } = require("../../config/firebase");
const usersRepository = require("../../repositories/users.repository");
const authService = require("../../services/auth.service");

describe("AuthService", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("registerUser", () => {
    it("유저 문서가 이미 있으면 created:false로 기존 프로필 반환", async () => {
      const existingProfile = { uid: "uid1", email: "a@a.com", name: "홍길동" };
      usersRepository.getUser.mockResolvedValue(existingProfile);

      const result = await authService.registerUser({
        uid: "uid1",
        name: "홍길동",
      });

      expect(usersRepository.createUser).not.toHaveBeenCalled();
      expect(result).toEqual({ profile: existingProfile, created: false });
    });

    it("신규 유저면 Firebase Auth 조회 후 Firestore에 저장하고 created:true 반환", async () => {
      usersRepository.getUser.mockResolvedValue(null);
      usersRepository.createUser.mockResolvedValue();
      auth.getUser.mockResolvedValue({
        email: "new@a.com",
        displayName: "김철수",
        photoURL: null,
        providerData: [{ providerId: "password" }],
      });

      const result = await authService.registerUser({
        uid: "uid2",
        name: "김철수",
      });

      expect(usersRepository.createUser).toHaveBeenCalledWith(
        "uid2",
        expect.objectContaining({
          uid: "uid2",
          email: "new@a.com",
          provider: "email",
        }),
      );
      expect(result.created).toBe(true);
      expect(result.profile).toMatchObject({ uid: "uid2", email: "new@a.com" });
    });

    it("Google 계정은 provider가 google", async () => {
      usersRepository.getUser.mockResolvedValue(null);
      usersRepository.createUser.mockResolvedValue();
      auth.getUser.mockResolvedValue({
        email: "g@gmail.com",
        displayName: "구글유저",
        photoURL: "http://photo.url",
        providerData: [{ providerId: "google.com" }],
      });

      const { profile } = await authService.registerUser({ uid: "uid3" });
      expect(profile.provider).toBe("google");
    });

    it("Firebase Auth 오류 시 에러를 throw", async () => {
      usersRepository.getUser.mockResolvedValue(null);
      auth.getUser.mockRejectedValue(new Error("Firebase error"));

      await expect(authService.registerUser({ uid: "uid4" })).rejects.toThrow(
        "Firebase error",
      );
    });
  });

  describe("getProfile", () => {
    it("유저 문서가 존재하면 프로필 반환", async () => {
      const profile = { uid: "uid1", email: "a@a.com", name: "홍길동" };
      usersRepository.getUser.mockResolvedValue(profile);

      const result = await authService.getProfile("uid1");
      expect(result).toEqual(profile);
    });

    it("유저 문서 없으면 statusCode 404 에러 throw", async () => {
      usersRepository.getUser.mockResolvedValue(null);

      await expect(authService.getProfile("uid_none")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
