// __tests__/services/vectordb.test.js
// vectordb.repository 단위 테스트 (Firestore mock)

const mockDocRef = { id: "vec-doc-id", set: jest.fn().mockResolvedValue() };
const mockBatch = {
  delete: jest.fn(),
  commit: jest.fn().mockResolvedValue(),
};

jest.mock("../../config/firebase", () => ({
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn(() => mockDocRef),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    get: jest.fn(),
    batch: jest.fn(() => mockBatch),
  },
}));

const { db } = require("../../config/firebase");
const vectordbRepo = require("../../repositories/vectordb.repository");

describe("VectorDbRepository", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("createVector", () => {
    it("Firestore에 벡터 문서를 생성하고 docId를 반환한다", async () => {
      const result = await vectordbRepo.createVector({
        uid: "uid1",
        source: "강의자료.pdf",
        key: "rag-key-001",
        uploaded_at: "2026-02-25T00:00:00Z",
      });

      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: "uid1",
          source: "강의자료.pdf",
          key: "rag-key-001",
        }),
      );
      expect(result).toMatchObject({ docId: "vec-doc-id", uid: "uid1" });
    });
  });

  describe("getVectorsByUid", () => {
    it("uid로 필터된 벡터 목록을 반환한다", async () => {
      const fakeRows = [
        { id: "d1", data: () => ({ uid: "uid1", source: "a.pdf", key: "k1" }) },
        { id: "d2", data: () => ({ uid: "uid1", source: "b.pdf", key: "k2" }) },
      ];
      db.get.mockResolvedValue({ docs: fakeRows });

      const result = await vectordbRepo.getVectorsByUid("uid1");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ docId: "d1", source: "a.pdf" });
    });
  });

  describe("deleteVectorByKey", () => {
    it("key에 해당하는 문서를 배치 삭제한다", async () => {
      const fakeSnap = {
        docs: [{ ref: "ref1" }, { ref: "ref2" }],
        size: 2,
      };
      db.get.mockResolvedValue(fakeSnap);

      const deleted = await vectordbRepo.deleteVectorByKey("rag-key-001");

      expect(mockBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(deleted).toBe(2);
    });
  });

  describe("getKeysByDocIds", () => {
    it("docId 목록에서 key 목록을 추출한다", async () => {
      mockDocRef.get = jest
        .fn()
        .mockResolvedValueOnce({ exists: true, data: () => ({ key: "k1" }) })
        .mockResolvedValueOnce({ exists: true, data: () => ({ key: "k2" }) });
      db.doc.mockReturnValue(mockDocRef);

      const keys = await vectordbRepo.getKeysByDocIds(["d1", "d2"]);
      expect(keys).toEqual(["k1", "k2"]);
    });

    it("존재하지 않는 docId는 key 목록에서 제외한다", async () => {
      mockDocRef.get = jest
        .fn()
        .mockResolvedValueOnce({ exists: true, data: () => ({ key: "k1" }) })
        .mockResolvedValueOnce({ exists: false });

      const keys = await vectordbRepo.getKeysByDocIds(["d1", "d_missing"]);
      expect(keys).toEqual(["k1"]);
    });

    it("빈 배열 입력이면 빈 배열 반환", async () => {
      const keys = await vectordbRepo.getKeysByDocIds([]);
      expect(keys).toEqual([]);
    });
  });
});
