// backend/__tests__/services/tree.test.js

const mockCreateNode = jest.fn();
const mockCreateEdge = jest.fn();
const mockCreateRoot = jest.fn();
const mockCountChildren = jest.fn();
const mockFindNodeById = jest.fn();
const mockUpdateStudentAnswer = jest.fn();
const mockGetTreeNodesInPreOrder = jest.fn();
const mockGetRoot = jest.fn();
const mockDeleteTree = jest.fn();

const mockGetModifiedTurns = jest.fn();

// pool mock: connection 객체를 반환
const mockConnection = {
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
};
jest.mock("../../config/db", () => ({
  getConnection: jest.fn().mockResolvedValue(mockConnection),
}));

jest.mock("../../repositories/tree.repository", () => ({
  createNode: mockCreateNode,
  createEdge: mockCreateEdge,
  createRoot: mockCreateRoot,
  countChildren: mockCountChildren,
  findNodeById: mockFindNodeById,
  updateStudentAnswer: mockUpdateStudentAnswer,
  getTreeNodesInPreOrder: mockGetTreeNodesInPreOrder,
  getRoot: mockGetRoot,
  deleteTree: mockDeleteTree,
}));

jest.mock("../../repositories/answer-change.repository", () => ({
  getModifiedTurns: mockGetModifiedTurns,
}));

const treeService = require("../../services/tree.service");

beforeEach(() => {
  jest.clearAllMocks();
  mockConnection.beginTransaction.mockResolvedValue();
  mockConnection.commit.mockResolvedValue();
  mockConnection.rollback.mockResolvedValue();
  mockConnection.release.mockResolvedValue();
});

// ── initializeTree ───────────────────────────────────────────────────────────

describe("TreeService.initializeTree", () => {
  it("성공: root/bonus/baseQuestion 노드를 생성한다", async () => {
    mockCreateNode
      .mockResolvedValueOnce(1) // rootNodeId
      .mockResolvedValueOnce(2) // bonusNodeId
      .mockResolvedValueOnce(3); // baseQuestionNodeId
    mockCreateEdge.mockResolvedValue();
    mockCreateRoot.mockResolvedValue();

    const result = await treeService.initializeTree({
      examStudentId: 10,
      sectionId: 20,
      baseQuestionNodeData: { contentText: "Q1" },
    });

    expect(result).toEqual({
      rootNodeId: 1,
      baseQuestionNodeId: 3,
      bonusNodeId: 2,
    });
    expect(mockCreateNode).toHaveBeenCalledTimes(3);
    expect(mockCreateEdge).toHaveBeenCalledTimes(2);
    expect(mockCreateRoot).toHaveBeenCalledWith(10, 20, 1, mockConnection);
  });

  it("실패: 필드 누락 시 400 에러 (connection 취득 전 검증)", async () => {
    // 유효성 검사는 pool.getConnection() 이전에 실행되므로 rollback은 호출되지 않음
    await expect(
      treeService.initializeTree({ examStudentId: 10 }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockConnection.rollback).not.toHaveBeenCalled();
  });
});

// ── addNodeToTree ─────────────────────────────────────────────────────────────

describe("TreeService.addNodeToTree", () => {
  it("성공: 노드를 추가하고 반환한다", async () => {
    mockCountChildren.mockResolvedValue(0);
    mockCreateNode.mockResolvedValue(55);
    mockCreateEdge.mockResolvedValue();
    mockFindNodeById.mockResolvedValue({ id: 55, qType: "follow_up" });

    const result = await treeService.addNodeToTree({
      parentNodeId: 1,
      newNodeData: { contentText: "follow up Q" },
    });
    expect(result.id).toBe(55);
  });

  it("성공: bonus_question이면 bucketNtype=1 사용", async () => {
    mockCountChildren.mockResolvedValue(1);
    mockCreateNode.mockResolvedValue(56);
    mockCreateEdge.mockResolvedValue();
    mockFindNodeById.mockResolvedValue({ id: 56 });

    await treeService.addNodeToTree({
      parentNodeId: 1,
      newNodeData: { qType: "bonus_question", contentText: "Bonus Q" },
    });
    expect(mockCreateEdge).toHaveBeenCalledWith(1, 56, 1, 1);
  });

  it("실패: parentNodeId 누락 시 400 에러", async () => {
    await expect(
      treeService.addNodeToTree({ newNodeData: { contentText: "Q" } }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ── updateNodeAnswer ─────────────────────────────────────────────────────────

describe("TreeService.updateNodeAnswer", () => {
  it("성공: 노드 답변을 업데이트한다", async () => {
    mockUpdateStudentAnswer.mockResolvedValue({ id: 1, studentAnswer: "답변" });
    const result = await treeService.updateNodeAnswer(1, "답변");
    expect(mockUpdateStudentAnswer).toHaveBeenCalledWith(1, "답변");
    expect(result.studentAnswer).toBe("답변");
  });

  it("실패: nodeId 누락 시 400 에러", async () => {
    await expect(
      treeService.updateNodeAnswer(null, "답변"),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ── getQAListForExamStudent ───────────────────────────────────────────────────

describe("TreeService.getQAListForExamStudent", () => {
  it("성공: studentAnswer가 있는 노드만 반환한다", async () => {
    mockGetTreeNodesInPreOrder.mockResolvedValue([
      {
        contentText: "Q1",
        followUpQuestion: "FQ1",
        studentAnswer: "A1",
        qType: "base_question",
      },
      {
        contentText: "Q2",
        followUpQuestion: null,
        studentAnswer: "",
        qType: "follow_up",
      }, // 빈 답변 → 제외
      {
        contentText: "Q3",
        followUpQuestion: null,
        studentAnswer: "A3",
        qType: "bonus_question",
      },
    ]);
    mockGetModifiedTurns.mockResolvedValue([1]);

    const result = await treeService.getQAListForExamStudent(10);
    expect(result).toHaveLength(2);
    expect(result[0].question).toBe("FQ1"); // followUpQuestion 우선
    expect(result[0].isModified).toBe(true); // turn 1
    expect(result[1].isModified).toBe(false); // turn 2
  });
});
