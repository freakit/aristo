import React from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button, Badge } from "@/common/styles/GlobalStyles";
import { LoadingSpinnerLarge } from "@/common/components/ui/Loading";
import AnswerCorrectionModal from "./components/AnswerCorrectionModal";
import { useExamDetailLogic } from "./hooks/useExamDetailLogic";
import * as S from "./Page.styles";

const ExamDetailPage: React.FC = () => {
  const {
    t,
    examId,
    exam,
    students,
    availableStudents,
    selectedNewStudents,
    selectedStudentForQA,
    setSelectedStudentForQA,
    selectedStudentQuestions,
    loading,
    loadingQuestions,
    searchTerm,
    setSearchTerm,
    sasUrls,
    isCorrectionModalOpen,
    setIsCorrectionModalOpen,
    currentCorrections,
    status,
    statusText,
    formatLocalDateTime,
    getStudentInfo,
    handleStudentViewClick,
    handleAddStudents,
    getDisplaySections,
    toggleNewStudentSelection,
    handleShowCorrections,
    navigate,
  } = useExamDetailLogic();

  if (loading) {
    return (
      <S.PageContainer>
        <S.LoadingContainer>
          <LoadingSpinnerLarge />
          <S.LoadingText>시험 정보를 불러오는 중...</S.LoadingText>
        </S.LoadingContainer>
      </S.PageContainer>
    );
  }

  if (!exam) {
    return null; // Hook redirects
  }

  return (
    <S.PageContainer>
      {/* 1. 헤더: 시험 제목, 상태, 액션 버튼 */}
      <S.PageHeader>
        <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
          <S.HeaderIcon>📝</S.HeaderIcon>
          <S.HeaderContent>
            <S.PageTitle>{exam.name}</S.PageTitle>
            <S.PageSubtitle>
              <S.StatBadge variant={status === "open" ? "success" : undefined}>
                {statusText[status]}
              </S.StatBadge>
              <S.InfoItem>
                📅 공개: {formatLocalDateTime(exam.visibleAt)}
              </S.InfoItem>
              <S.InfoItem>
                ⏱️ {exam.duration ? `${exam.duration}분` : "시간 제한 없음"}
              </S.InfoItem>
              <S.InfoItem>👥 {students.length}명 배정됨</S.InfoItem>
            </S.PageSubtitle>
          </S.HeaderContent>
        </div>

        <S.ActionButtons>
          <Button
            as={Link}
            to={`/exams/${examId}/edit`}
            variant="primary"
            size="medium"
          >
            수정
          </Button>
          <Button
            as={Link}
            to={`/exams/${examId}/report`}
            variant="ghost"
            size="medium"
          >
            리포트
          </Button>
        </S.ActionButtons>
      </S.PageHeader>

      <S.ContentArea>
        {/* 2. 왼쪽 패널: 학생 목록 및 QA 선택 */}
        <S.LeftPanel>
          <S.SectionTitle>
            <S.SectionIcon>👥</S.SectionIcon> 학생 명단
          </S.SectionTitle>

          <S.SearchInput
            placeholder="이름 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <S.StudentList>
            {students
              .filter((s) => s.name?.includes(searchTerm))
              .map((student) => {
                const isSelected = selectedStudentForQA === student.id;
                return (
                  <S.StudentItem
                    key={student.id}
                    isSelected={isSelected}
                    onClick={() => handleStudentViewClick(student.id)}
                  >
                    <S.StudentHeader>
                      <S.StudentName>
                        {student.name}
                        {isSelected && (
                          <span style={{ fontSize: "14px", color: "#333f66" }}>
                            (선택됨)
                          </span>
                        )}
                      </S.StudentName>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#64748b",
                          marginTop: "4px",
                        }}
                      >
                        {student.registrationNumber}
                      </div>
                    </S.StudentHeader>
                    <S.ButtonGroup>
                      <S.ViewButton
                        as={Link}
                        to={`/exams/${examId}/review/${student.id}`}
                        style={{
                          backgroundColor: "#0ea5e9", // Sky blue for monitor
                          textDecoration: "none",
                        }}
                        title="모니터링 / 리뷰"
                      >
                        🎥
                      </S.ViewButton>
                      <S.ViewButton
                        onClick={(e) => {
                          e.preventDefault();
                          handleStudentViewClick(student.id);
                        }}
                        title="빠른 QA 보기"
                      >
                        ➔
                      </S.ViewButton>
                    </S.ButtonGroup>
                  </S.StudentItem>
                );
              })}
          </S.StudentList>

          <S.AddStudentSection>
            <S.SectionTitle style={{ fontSize: "16px", marginBottom: "12px" }}>
              ➕ 학생 추가 배정
            </S.SectionTitle>
            <S.AvailableStudentsList>
              {availableStudents.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                  추가 가능한 학생이 없습니다.
                </div>
              ) : (
                availableStudents.map((st) => {
                  const isSel = selectedNewStudents.includes(st.id);
                  return (
                    <S.AvailableStudentItem
                      key={st.id}
                      isSelected={isSel}
                      onClick={() => toggleNewStudentSelection(st.id)}
                    >
                      <S.AvailableStudentName>
                        {st.name} {isSel && "✅"}
                      </S.AvailableStudentName>
                      <S.AvailableStudentInfo>
                        {st.school} / {st.registrationNumber}
                      </S.AvailableStudentInfo>
                    </S.AvailableStudentItem>
                  );
                })
              )}
            </S.AvailableStudentsList>
            <Button
              variant="primary"
              size="small"
              style={{ width: "100%", marginTop: "12px" }}
              disabled={selectedNewStudents.length === 0}
              onClick={handleAddStudents}
            >
              선택한 {selectedNewStudents.length}명 추가
            </Button>
          </S.AddStudentSection>
        </S.LeftPanel>

        {/* 3. 오른쪽 패널: 시험 내용 또는 선택된 학생의 QA */}
        <S.RightPanel>
          {selectedStudentForQA ? (
            // QA 보기 모드
            <S.QAContainer>
              <S.QAHeader>
                <S.QAHeaderContent>
                  <S.StudentNameHeader>
                    {getStudentInfo(selectedStudentForQA)?.name} 학생의 답변
                  </S.StudentNameHeader>
                  <S.QAStats>
                    학번:{" "}
                    {getStudentInfo(selectedStudentForQA)?.registrationNumber}
                  </S.QAStats>
                </S.QAHeaderContent>
                <S.BackButton
                  variant="ghost"
                  onClick={() => setSelectedStudentForQA(null)}
                >
                  시험 내용 보기
                </S.BackButton>
              </S.QAHeader>

              {loadingQuestions ? (
                <S.LoadingContainer>
                  <LoadingSpinnerLarge />
                  <S.LoadingText>답변을 불러오는 중...</S.LoadingText>
                </S.LoadingContainer>
              ) : !selectedStudentQuestions ? (
                <S.EmptyState>
                  <S.EmptyIcon>📭</S.EmptyIcon>
                  <S.EmptyTitle>제출된 답변이 없습니다</S.EmptyTitle>
                  <S.EmptyDescription>
                    아직 시험을 시작하지 않았거나 완료하지 않았습니다.
                  </S.EmptyDescription>
                </S.EmptyState>
              ) : (
                <S.QAList>
                  {selectedStudentQuestions.qaList &&
                  selectedStudentQuestions.qaList.length > 0
                    ? selectedStudentQuestions.qaList.map((qa, index) => (
                        <S.QASetItem key={index}>
                          <S.QASetHeader>
                            <S.QASetNumber>Question {index + 1}</S.QASetNumber>
                            <div
                              style={{ display: "flex", alignItems: "center" }}
                            >
                              <S.QASetTimestamp>
                                {new Date().toLocaleDateString()}
                              </S.QASetTimestamp>
                              {/* 수정 내역 보기 버튼 */}
                              {(qa as any).hasCorrections && (
                                <S.ModifiedTag
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowCorrections(index + 1);
                                  }}
                                >
                                  수정됨
                                </S.ModifiedTag>
                              )}
                            </div>
                          </S.QASetHeader>

                          <S.QuestionSection>
                            <S.QLabel>질문</S.QLabel>
                            <S.QText>{qa.question}</S.QText>
                          </S.QuestionSection>

                          <S.AnswerSection>
                            <S.ALabel>학생 답변</S.ALabel>
                            <S.AText>{qa.answer}</S.AText>
                          </S.AnswerSection>
                        </S.QASetItem>
                      ))
                    : // qaList가 없으면 legacy 방식(questions/answers 배열) 지원
                      selectedStudentQuestions.questions.map((q, i) => (
                        <S.QASetItem key={i}>
                          <S.QASetHeader>
                            <S.QASetNumber>Question {i + 1}</S.QASetNumber>
                          </S.QASetHeader>
                          <S.QuestionSection>
                            <S.QLabel>질문</S.QLabel>
                            <S.QText>{q}</S.QText>
                          </S.QuestionSection>
                          <S.AnswerSection>
                            <S.ALabel>교수님(테스트) 답변</S.ALabel>
                            <S.AText>
                              {selectedStudentQuestions.answers[i]}
                            </S.AText>
                          </S.AnswerSection>
                        </S.QASetItem>
                      ))}
                </S.QAList>
              )}
            </S.QAContainer>
          ) : (
            // 기본 모드: 시험 섹션/내용 표시
            <S.SectionList>
              {getDisplaySections().map((section, idx) => (
                <S.SectionItem key={section.id ?? idx}>
                  <S.SectionItemTitle>
                    <S.SectionNumber>{idx + 1}</S.SectionNumber>
                    {section.title}
                  </S.SectionItemTitle>

                  <S.MarkdownContainer>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {section.content}
                    </ReactMarkdown>
                  </S.MarkdownContainer>

                  {section.attachments && section.attachments.length > 0 && (
                    <S.AttachmentList>
                      {section.attachments.map((att) => {
                        const fileUrl =
                          att.file?.id && sasUrls[att.file.id]
                            ? sasUrls[att.file.id]
                            : att.file?.fileUrl;

                        const isImage =
                          att.file?.contentType?.startsWith("image/");

                        return (
                          <div key={att.id} style={{ marginTop: "10px" }}>
                            {isImage && fileUrl ? (
                              <img
                                src={fileUrl}
                                alt={att.file?.fileName}
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "300px",
                                  borderRadius: "8px",
                                  border: "1px solid #e2e8f0",
                                }}
                              />
                            ) : (
                              <S.AttachmentItem variant="info">
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    color: "inherit",
                                    textDecoration: "none",
                                  }}
                                >
                                  📎 {att.file?.fileName || "첨부파일"}
                                </a>
                              </S.AttachmentItem>
                            )}
                          </div>
                        );
                      })}
                    </S.AttachmentList>
                  )}
                </S.SectionItem>
              ))}
            </S.SectionList>
          )}
        </S.RightPanel>
      </S.ContentArea>

      <AnswerCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        corrections={currentCorrections}
      />
    </S.PageContainer>
  );
};

export default ExamDetailPage;
