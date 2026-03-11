// __tests__/integration/users.repository.integration.test.js
// users.repository 통합 테스트 — 실제 Firestore에 연결

const { db } = require("./setup/firebaseAdmin");

// users.repository가 내부적으로 config/firebase.js를 require하는데,
// 해당 파일은 ESM이라 직접 require 불가 → Jest moduleNameMapper로 CJS 헬퍼를 주입
const usersRepository = require("../../repositories/users.repository");

const TEST_UID = "test_integ_user_001";

describe("[통합] UsersRepository — Firestore 연동", () => {
  // 테스트 후 Firestore에서 테스트 문서 삭제
  afterAll(async () => {
    await db.collection("users").doc(TEST_UID).delete();
  });

  describe("createUser", () => {
    it("유저 문서를 Firestore에 실제로 생성한다", async () => {
      const profile = {
        uid: TEST_UID,
        email: "integ@test.com",
        name: "통합테스트유저",
        photoURL: null,
        provider: "email",
        createdAt: new Date().toISOString(),
      };

      await usersRepository.createUser(TEST_UID, profile);

      // Firestore에서 직접 조회해서 저장 여부 확인
      const snap = await db.collection("users").doc(TEST_UID).get();
      expect(snap.exists).toBe(true);
      expect(snap.data()).toMatchObject({
        uid: TEST_UID,
        email: "integ@test.com",
        name: "통합테스트유저",
        provider: "email",
      });
    });
  });

  describe("getUser", () => {
    it("존재하는 uid로 조회하면 프로필 데이터를 반환한다", async () => {
      const result = await usersRepository.getUser(TEST_UID);
      expect(result).not.toBeNull();
      expect(result.uid).toBe(TEST_UID);
      expect(result.email).toBe("integ@test.com");
    });

    it("존재하지 않는 uid로 조회하면 null을 반환한다", async () => {
      const result = await usersRepository.getUser("test_integ_non_existent");
      expect(result).toBeNull();
    });
  });
});
