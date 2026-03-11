// __tests__/services/auth.test.js
// auth.service unit tests

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
    it("returns existing profile with created:false if user doc already exists", async () => {
      const existingProfile = { uid: "uid1", email: "a@a.com", name: "Hong Gildong" };
      usersRepository.getUser.mockResolvedValue(existingProfile);

      const result = await authService.registerUser({
        uid: "uid1",
        name: "Hong Gildong",
      });

      expect(usersRepository.createUser).not.toHaveBeenCalled();
      expect(result).toEqual({ profile: existingProfile, created: false });
    });

    it("looks up Firebase Auth for new user, saves to Firestore, returns created:true", async () => {
      usersRepository.getUser.mockResolvedValue(null);
      usersRepository.createUser.mockResolvedValue();
      auth.getUser.mockResolvedValue({
        email: "new@a.com",
        displayName: "Kim Chulsoo",
        photoURL: null,
        providerData: [{ providerId: "password" }],
      });

      const result = await authService.registerUser({
        uid: "uid2",
        name: "Kim Chulsoo",
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

    it("Google account has provider set to google", async () => {
      usersRepository.getUser.mockResolvedValue(null);
      usersRepository.createUser.mockResolvedValue();
      auth.getUser.mockResolvedValue({
        email: "g@gmail.com",
        displayName: "Google User",
        photoURL: "http://photo.url",
        providerData: [{ providerId: "google.com" }],
      });

      const { profile } = await authService.registerUser({ uid: "uid3" });
      expect(profile.provider).toBe("google");
    });

    it("throws error on Firebase Auth failure", async () => {
      usersRepository.getUser.mockResolvedValue(null);
      auth.getUser.mockRejectedValue(new Error("Firebase error"));

      await expect(authService.registerUser({ uid: "uid4" })).rejects.toThrow(
        "Firebase error",
      );
    });
  });

  describe("getProfile", () => {
    it("returns profile if user doc exists", async () => {
      const profile = { uid: "uid1", email: "a@a.com", name: "Hong Gildong" };
      usersRepository.getUser.mockResolvedValue(profile);

      const result = await authService.getProfile("uid1");
      expect(result).toEqual(profile);
    });

    it("throws statusCode 404 error if user doc not found", async () => {
      usersRepository.getUser.mockResolvedValue(null);

      await expect(authService.getProfile("uid_none")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
