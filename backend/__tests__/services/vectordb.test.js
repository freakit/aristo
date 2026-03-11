// __tests__/services/vectordb.test.js
// vectordb.repository unit tests (Firestore mock)

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
    it("creates a vector document in Firestore and returns docId", async () => {
      const result = await vectordbRepo.createVector({
        uid: "uid1",
        source: "lecture-materials.pdf",
        key: "rag-key-001",
        uploaded_at: "2026-02-25T00:00:00Z",
      });

      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: "uid1",
          source: "lecture-materials.pdf",
          key: "rag-key-001",
        }),
      );
      expect(result).toMatchObject({ docId: "vec-doc-id", uid: "uid1" });
    });
  });

  describe("getVectorsByUid", () => {
    it("returns vector list filtered by uid", async () => {
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
    it("batch deletes documents matching the key", async () => {
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
    it("extracts key list from docId list", async () => {
      mockDocRef.get = jest
        .fn()
        .mockResolvedValueOnce({ exists: true, data: () => ({ key: "k1" }) })
        .mockResolvedValueOnce({ exists: true, data: () => ({ key: "k2" }) });
      db.doc.mockReturnValue(mockDocRef);

      const keys = await vectordbRepo.getKeysByDocIds(["d1", "d2"]);
      expect(keys).toEqual(["k1", "k2"]);
    });

    it("excludes non-existent docIds from key list", async () => {
      mockDocRef.get = jest
        .fn()
        .mockResolvedValueOnce({ exists: true, data: () => ({ key: "k1" }) })
        .mockResolvedValueOnce({ exists: false });

      const keys = await vectordbRepo.getKeysByDocIds(["d1", "d_missing"]);
      expect(keys).toEqual(["k1"]);
    });

    it("returns empty array for empty array input", async () => {
      const keys = await vectordbRepo.getKeysByDocIds([]);
      expect(keys).toEqual([]);
    });
  });
});
