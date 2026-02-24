// backend/__tests__/services/answerChange.test.js

const mockRepoCreate = jest.fn();
const mockFindByExamStudentIdAndTurn = jest.fn();

const mockSaveFileRecord = jest.fn();
const mockGetFileById = jest.fn();

jest.mock("../../repositories/answer-change.repository", () => ({
  create: mockRepoCreate,
  findByExamStudentIdAndTurn: mockFindByExamStudentIdAndTurn,
}));

jest.mock("../../services/file.service", () => ({
  saveFileRecord: mockSaveFileRecord,
  getFileById: mockGetFileById,
}));

const answerChangeService = require("../../services/answer-change.service");

beforeEach(() => jest.clearAllMocks());

// ── logChange ────────────────────────────────────────────────────────────────

describe("AnswerChangeService.logChange", () => {
  it("성공: audioUrl 없이 기록을 저장한다", async () => {
    mockRepoCreate.mockResolvedValue(1);
    const result = await answerChangeService.logChange({
      examStudentId: 10,
      oldAnswer: "이전",
      newAnswer: "새로운",
      turn: 1,
    });
    expect(result).toEqual({ changeId: 1, audioFileId: null });
    expect(mockSaveFileRecord).not.toHaveBeenCalled();
  });

  it("성공: audioUrl이 있으면 파일을 저장하고 audioFileId도 반환한다", async () => {
    mockSaveFileRecord.mockResolvedValue({ id: 99 });
    mockRepoCreate.mockResolvedValue(2);

    const result = await answerChangeService.logChange({
      examStudentId: 10,
      oldAnswer: "이전",
      newAnswer: "새로운",
      audioUrl: "https://storage.example.com/container/audio.wav",
      turn: 2,
    });

    expect(mockSaveFileRecord).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "audio.wav" }),
    );
    expect(result.audioFileId).toBe(99);
  });

  it("실패: examStudentId 누락 시 400 에러", async () => {
    await expect(
      answerChangeService.logChange({
        oldAnswer: "x",
        newAnswer: "y",
        turn: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ── getChange ────────────────────────────────────────────────────────────────

describe("AnswerChangeService.getChange", () => {
  it("성공: 변경 기록을 반환한다", async () => {
    mockFindByExamStudentIdAndTurn.mockResolvedValue([
      { audio_file: null, oldAnswer: "이전" },
    ]);
    const result = await answerChangeService.getChange({
      examStudentId: 10,
      turn: 1,
    });
    expect(result).toHaveLength(1);
  });

  it("성공: audio_file이 있으면 fileName을 붙여 반환한다", async () => {
    mockFindByExamStudentIdAndTurn.mockResolvedValue([{ audio_file: 5 }]);
    mockGetFileById.mockResolvedValue({ fileName: "audio.wav" });

    const result = await answerChangeService.getChange({
      examStudentId: 10,
      turn: 1,
    });
    expect(result[0].fileName).toBe("audio.wav");
  });

  it("실패: examStudentId 누락 시 400 에러", async () => {
    await expect(
      answerChangeService.getChange({ turn: 1 }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("실패: turn 누락 시 400 에러", async () => {
    await expect(
      answerChangeService.getChange({ examStudentId: 10 }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
