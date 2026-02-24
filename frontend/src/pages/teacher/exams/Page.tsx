import React from "react";
import { Link } from "react-router-dom";
import { Badge, LoadingSpinner } from "@/common/styles/GlobalStyles";
import { formatKoDate } from "@/common/utils/formatKoDate";
import { useExamListLogic } from "./hooks/useExamListLogic";
import * as S from "./Page.styles";

const ExamListPage: React.FC = () => {
  const {
    exams,
    searchTerm,
    setSearchTerm,
    loading,
    filter,
    setFilter,
    currentPage,
    expandedSetIds,
    toggleSet,
    handleDeleteSet,
    processedItems,
    paginatedItems,
    totalPages,
    handlePageChange,
  } = useExamListLogic();

  if (loading) {
    return (
      <S.PageContainer>
        <S.LoadingContainer>
          <LoadingSpinner size="large" />
          <S.LoadingText>시험 목록을 불러오는 중...</S.LoadingText>
        </S.LoadingContainer>
      </S.PageContainer>
    );
  }

  return (
    <S.PageContainer>
      <S.PageHeader>
        <S.HeaderLeft>
          <S.PageTitle>시험 관리</S.PageTitle>
          <S.PageSubtitle>총 {exams.length}개의 시험</S.PageSubtitle>
        </S.HeaderLeft>
        <S.HeaderRight>
          <S.Button as={Link} to="/exams/new" variant="primary" size="medium">
            ➕ 새 시험
          </S.Button>
        </S.HeaderRight>
      </S.PageHeader>

      <S.ControlBar>
        <S.SearchWrapper>
          <S.SearchIcon>🔍</S.SearchIcon>
          <S.SearchInput
            type="text"
            placeholder="시험 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </S.SearchWrapper>

        <S.FilterGroup>
          <S.FilterButton
            isActive={filter === "all"}
            onClick={() => setFilter("all")}
          >
            전체
          </S.FilterButton>
          <S.FilterButton
            isActive={filter === "recent"}
            onClick={() => setFilter("recent")}
          >
            최신
          </S.FilterButton>
          <S.FilterButton
            isActive={filter === "popular"}
            onClick={() => setFilter("popular")}
          >
            인기
          </S.FilterButton>
        </S.FilterGroup>
      </S.ControlBar>

      {processedItems.length === 0 ? (
        <S.EmptyState>
          <S.EmptyIcon>📚</S.EmptyIcon>
          <S.EmptyTitle>
            {searchTerm ? "검색 결과가 없습니다" : "아직 시험이 없습니다"}
          </S.EmptyTitle>
          <S.EmptyDescription>
            {searchTerm
              ? "다른 검색어로 시도해보세요."
              : "첫 번째 시험을 만들어 시작해보세요!"}
          </S.EmptyDescription>
          {!searchTerm && (
            <S.Button as={Link} to="/exams/new" variant="primary">
              첫 시험 만들기
            </S.Button>
          )}
        </S.EmptyState>
      ) : (
        <div>
          <S.TableContainer>
            <S.Table>
              <S.TableHead>
                <tr>
                  <S.TableHeader>시험명</S.TableHeader>
                  <S.TableHeader>학생 수</S.TableHeader>
                  <S.TableHeader>생성일</S.TableHeader>
                  <S.TableHeader>최종 수정</S.TableHeader>
                  <S.TableHeader>상태</S.TableHeader>
                  <S.TableHeader style={{ textAlign: "right" }}>
                    액션
                  </S.TableHeader>
                </tr>
              </S.TableHead>
              <S.TableBody>
                {paginatedItems.map((item) => {
                  if (item.type === "header") {
                    const isExpanded = expandedSetIds.has(item.id);
                    return (
                      <S.SetHeaderRow
                        key={`header-${item.id}`}
                        onClick={() => toggleSet(item.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <S.SetHeaderCell colSpan={5}>
                          <span style={{ marginRight: "8px" }}>
                            {isExpanded ? "▼" : "▶"}
                          </span>
                          📁 세트: {item.name || "Unknown Set"} ({item.count}개
                          시험)
                        </S.SetHeaderCell>
                        <S.SetHeaderCell
                          style={{ textAlign: "right" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <S.SmallButton
                            variant="danger"
                            size="small"
                            onClick={() => handleDeleteSet(item.id, item.name)}
                          >
                            🗑️ 삭제
                          </S.SmallButton>
                        </S.SetHeaderCell>
                      </S.SetHeaderRow>
                    );
                  }

                  const { exam } = item;
                  return (
                    <S.TableRow key={exam.id}>
                      <S.TableCell>
                        <S.ExamName>
                          {exam.examSetId ? (
                            <span
                              style={{
                                display: "inline-block",
                                marginLeft: "20px",
                                color: "#9ca3af",
                              }}
                            ></span>
                          ) : (
                            ""
                          )}
                          {""}
                          {exam.name}
                        </S.ExamName>
                        <S.ExamMeta>
                          {exam.examSetId ? (
                            <span style={{ marginLeft: "20px" }}>
                              챕터 {exam.chapter ?? "-"}
                            </span>
                          ) : (
                            `챕터 ${exam.chapter ?? "-"}`
                          )}
                        </S.ExamMeta>
                      </S.TableCell>
                      <S.TableCell>
                        <Badge variant="primary" size="small">
                          {exam.studentCount ?? exam.studentIds?.length ?? 0}명
                        </Badge>
                      </S.TableCell>
                      <S.TableCell>{formatKoDate(exam.createdAt)}</S.TableCell>
                      <S.TableCell>{formatKoDate(exam.updatedAt)}</S.TableCell>
                      <S.TableCell>
                        <Badge
                          variant={
                            (exam.studentCount ?? 0) > 0 ? "success" : "info"
                          }
                          size="small"
                        >
                          {(exam.studentCount ?? 0) > 0 ? "진행중" : "대기중"}
                        </Badge>
                      </S.TableCell>
                      <S.TableCell style={{ textAlign: "right" }}>
                        <S.ActionButtons>
                          <S.SmallButton
                            as={Link}
                            to={`/exams/${exam.id}`}
                            variant="primary"
                            size="small"
                          >
                            보기
                          </S.SmallButton>
                          <S.SmallButton
                            as={Link}
                            to={`/exams/${exam.id}/edit`}
                            variant="ghost"
                            size="small"
                          >
                            편집
                          </S.SmallButton>
                        </S.ActionButtons>
                      </S.TableCell>
                    </S.TableRow>
                  );
                })}
              </S.TableBody>
            </S.Table>
          </S.TableContainer>

          {totalPages > 1 && (
            <S.PaginationContainer>
              <S.PageButton
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ‹
              </S.PageButton>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <S.PageButton
                    key={page}
                    isActive={currentPage === page}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </S.PageButton>
                ),
              )}
              <S.PageButton
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                ›
              </S.PageButton>
            </S.PaginationContainer>
          )}
        </div>
      )}
    </S.PageContainer>
  );
};

export default ExamListPage;
