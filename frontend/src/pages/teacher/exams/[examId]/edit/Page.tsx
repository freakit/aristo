import React from "react";
import { useExamEditLogic } from "./hooks/useExamEditLogic";
import * as S from "./Page.styles";
import { Button, LoadingSpinner } from "@/common/styles/GlobalStyles";

const ExamFormPage: React.FC = () => {
  const {
    examName,
    setExamName,
    sections,
    updateSection,
    visibleAtInput,
    setVisibleAtInput,
    filteredStudents,
    selectedStudents,
    searchTerm,
    setSearchTerm,
    areAllFilteredStudentsSelected,
    handleStudentSelect,
    handleToggleAllStudents,
    handleFileInputChange,
    handleRemoveAttachment,
    handleFileAddClick,
    handleSubmit,
    handleCancel,
    loading,
    isSubmitting,
    error,
    success,
    sasUrls,
  } = useExamEditLogic();

  if (loading) {
    return (
      <S.PageContainer>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "400px",
            gap: "24px",
          }}
        >
          <LoadingSpinner size="large" />
          <div style={{ fontSize: "16px", fontWeight: 500, color: "#6b7280" }}>
            시험 정보를 불러오는 중...
          </div>
        </div>
      </S.PageContainer>
    );
  }

  return (
    <S.PageContainer>
      <form onSubmit={handleSubmit}>
        <S.PageHeader>
          <S.HeaderContent>
            <S.HeaderIcon>✏️</S.HeaderIcon>
            <S.HeaderText>
              <S.PageTitle>시험 수정</S.PageTitle>
              <S.PageSubtitle>
                기존 시험의 내용을 수정하고 관리합니다.
              </S.PageSubtitle>
            </S.HeaderText>
          </S.HeaderContent>
          <S.ActionButtons>
            <Button
              type="button"
              variant="ghost"
              size="medium"
              onClick={handleCancel}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? "저장 중..." : "수정 완료"}
            </Button>
          </S.ActionButtons>
        </S.PageHeader>

        <S.ContentArea>
          {/* 왼쪽: 학생 선택 사이드바 */}
          <S.StudentSearch>
            <S.Label>
              <S.LabelIcon>👥</S.LabelIcon> 대상 학생 선택
            </S.Label>
            <S.SearchInput
              type="text"
              placeholder="이름 또는 학번 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "#64748b" }}>
                검색된 학생 ({filteredStudents.length}명)
              </span>
              <button
                type="button"
                onClick={handleToggleAllStudents}
                style={{
                  background: "none",
                  border: "none",
                  color: "#333f66",
                  cursor: "pointer",
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                {areAllFilteredStudentsSelected ? "전체 해제" : "전체 선택"}
              </button>
            </div>

            <S.StudentList>
              {filteredStudents.map((student) => {
                const isSelected = selectedStudents.includes(student.id);
                return (
                  <S.StudentItem
                    key={student.id}
                    isSelected={isSelected}
                    onClick={() => handleStudentSelect(student.id)}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <S.StudentName>{student.name}</S.StudentName>
                        <S.StudentInfo>
                          {student.school} · {student.grade}학년
                        </S.StudentInfo>
                        <S.StudentInfo>
                          {student.registrationNumber}
                        </S.StudentInfo>
                      </div>
                      {isSelected && (
                        <div style={{ color: "#333f66", fontSize: "20px" }}>
                          ✓
                        </div>
                      )}
                    </div>
                  </S.StudentItem>
                );
              })}
              {filteredStudents.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#94a3b8",
                    fontSize: "14px",
                  }}
                >
                  검색 결과가 없습니다.
                </div>
              )}
            </S.StudentList>

            <S.SelectedCounter variant="primary">
              총 {selectedStudents.length}명 선택됨
            </S.SelectedCounter>
          </S.StudentSearch>

          {/* 오른쪽: 메인 폼 */}
          <S.MainContent>
            {/* 기본 정보 */}
            <S.SectionContainer>
              <S.SectionHeader>
                <S.SectionTitle>
                  <S.SectionNumber>1</S.SectionNumber> 기본 정보
                </S.SectionTitle>
              </S.SectionHeader>

              <S.FormGroup>
                <S.Label>
                  <S.LabelIcon>📝</S.LabelIcon> 시험명
                  <S.RequiredMark>*</S.RequiredMark>
                </S.Label>
                <S.StyledInput
                  type="text"
                  placeholder="예: 2024년 1학기 중간고사"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                />
              </S.FormGroup>

              <S.FormGroup>
                <S.Label>
                  <S.LabelIcon>📅</S.LabelIcon> 공개 일시 (Visible At)
                  <S.RequiredMark>*</S.RequiredMark>
                </S.Label>
                <S.StyledInput
                  type="datetime-local"
                  value={visibleAtInput}
                  onChange={(e) => setVisibleAtInput(e.target.value)}
                />
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    marginTop: "8px",
                  }}
                >
                  * 이 시간이 되면 학생들에게 시험 목록에서 시험이 보입니다.
                  (입장 불가)
                </div>
              </S.FormGroup>
            </S.SectionContainer>

            {/* 섹션 목록 */}
            {sections.map((section, index) => (
              <S.SectionContainer key={section.id}>
                <S.SectionHeader>
                  <S.SectionTitle>
                    <S.SectionNumber>{index + 2}</S.SectionNumber>
                    시험 내용
                  </S.SectionTitle>
                </S.SectionHeader>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "24px",
                  }}
                >
                  <S.FormGroup style={{ marginBottom: 0 }}>
                    <S.Label>
                      <S.LabelIcon>🔓</S.LabelIcon> 입장 가능 (Open At)
                      <S.RequiredMark>*</S.RequiredMark>
                    </S.Label>
                    <S.StyledInput
                      type="datetime-local"
                      value={section.openAt}
                      onChange={(e) =>
                        updateSection(index, "openAt", e.target.value)
                      }
                    />
                  </S.FormGroup>

                  <S.FormGroup style={{ marginBottom: 0 }}>
                    <S.Label>
                      <S.LabelIcon>🔒</S.LabelIcon> 입장 마감 (Block At)
                      <S.RequiredMark>*</S.RequiredMark>
                    </S.Label>
                    <S.StyledInput
                      type="datetime-local"
                      value={section.blockAt}
                      onChange={(e) =>
                        updateSection(index, "blockAt", e.target.value)
                      }
                    />
                  </S.FormGroup>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "24px",
                  }}
                >
                  <S.FormGroup style={{ marginBottom: 0 }}>
                    <S.Label>
                      <S.LabelIcon>⏳</S.LabelIcon> 시험 시간 (분)
                      <S.RequiredMark>*</S.RequiredMark>
                    </S.Label>
                    <S.StyledInput
                      type="number"
                      placeholder="60"
                      value={section.duration ?? ""}
                      onChange={(e) =>
                        updateSection(index, "duration", e.target.value)
                      }
                    />
                  </S.FormGroup>

                  <S.FormGroup style={{ marginBottom: 0 }}>
                    <S.Label>
                      <S.LabelIcon>🔖</S.LabelIcon> 챕터 (선택)
                    </S.Label>
                    <S.StyledInput
                      type="number"
                      placeholder="1"
                      value={section.chapter ?? ""}
                      onChange={(e) =>
                        updateSection(index, "chapter", e.target.value)
                      }
                    />
                  </S.FormGroup>
                </div>

                <S.FormGroup>
                  <S.Label>
                    <S.LabelIcon>📌</S.LabelIcon> 섹션 제목
                    <S.RequiredMark>*</S.RequiredMark>
                  </S.Label>
                  <S.StyledInput
                    type="text"
                    placeholder="예: Part 1. 듣기 평가"
                    value={section.title}
                    onChange={(e) =>
                      updateSection(index, "title", e.target.value)
                    }
                  />
                </S.FormGroup>

                <S.FormGroup>
                  <S.Label>
                    <S.LabelIcon>📄</S.LabelIcon> 내용 / 지문
                    <S.RequiredMark>*</S.RequiredMark>
                  </S.Label>
                  <S.TextArea
                    placeholder="시험 문제나 지문 내용을 입력하세요..."
                    value={section.content}
                    onChange={(e) =>
                      updateSection(index, "content", e.target.value)
                    }
                  />
                </S.FormGroup>

                <S.FormGroup>
                  <S.Label>
                    <S.LabelIcon>📎</S.LabelIcon> 첨부파일
                    <S.SimpleAddButton
                      type="button"
                      onClick={() => handleFileAddClick(index)}
                      style={{ marginLeft: "auto" }}
                    >
                      + 파일 추가
                    </S.SimpleAddButton>
                  </S.Label>
                  <input
                    id={`file-input-${index}`}
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileInputChange(index, e)}
                  />

                  {section.attachments && section.attachments.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        marginTop: "12px",
                      }}
                    >
                      {section.attachments.map((att) => {
                        const fileUrl =
                          (att.file?.id && sasUrls[att.file.id]) ||
                          att.file?.fileUrl;
                        return (
                          <div
                            key={att.id || att.file?.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "10px 14px",
                              background: "#f8fafc",
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                              fontSize: "14px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                overflow: "hidden",
                              }}
                            >
                              <span style={{ fontSize: "16px" }}>📄</span>
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "#333f66",
                                  textDecoration: "none",
                                  fontWeight: 500,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "200px",
                                }}
                              >
                                {att.file?.fileName || "파일"}
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveAttachment(
                                  index,
                                  att.id || att.file?.id || 0,
                                )
                              }
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                fontSize: "18px",
                                padding: "4px",
                                lineHeight: 1,
                              }}
                              title="삭제"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        background: "#f8fafc",
                        borderRadius: "8px",
                        border: "1px dashed #cbd5e1",
                        marginTop: "8px",
                        color: "#94a3b8",
                        fontSize: "14px",
                      }}
                    >
                      첨부된 파일이 없습니다.
                    </div>
                  )}
                </S.FormGroup>
              </S.SectionContainer>
            ))}

            <S.ButtonGroup>
              <Button
                type="button"
                variant="ghost"
                size="large"
                onClick={handleCancel}
              >
                취소
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="large"
                disabled={isSubmitting}
              >
                {isSubmitting ? "저장 중..." : "수정 완료"}
              </Button>
            </S.ButtonGroup>
          </S.MainContent>
        </S.ContentArea>
        {error && <S.ErrorMessage>{error}</S.ErrorMessage>}
        {success && <S.SuccessMessage>{success}</S.SuccessMessage>}
      </form>
    </S.PageContainer>
  );
};

export default ExamFormPage;
