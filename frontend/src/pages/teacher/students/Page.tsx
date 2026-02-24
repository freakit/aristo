// src/pages/teacher/StudentListPage.tsx

import React from "react";
import { Link } from "react-router-dom";
import { Badge, LoadingSpinner } from "@/common/styles/GlobalStyles";
import { useTranslation } from "@/common/i18n";
import { getInitials } from "./getInitials";
import { useStudentListLogic } from "./hooks/useStudentListLogic";
import * as S from "./Page.styles";

const StudentListPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    students,
    searchTerm,
    setSearchTerm,
    loading,
    filter,
    setFilter,
    currentPage,
    filteredStudents,
    paginatedStudents,
    totalPages,
    handlePageChange,
  } = useStudentListLogic();

  if (loading) {
    return (
      <S.PageContainer>
        <S.LoadingContainer>
          <LoadingSpinner size="large" />
          <S.LoadingText>학생 목록을 불러오는 중...</S.LoadingText>
        </S.LoadingContainer>
      </S.PageContainer>
    );
  }

  return (
    <S.PageContainer>
      <S.PageHeader>
        <S.HeaderLeft>
          <S.PageTitle>학생 관리</S.PageTitle>
          <S.PageSubtitle>총 {students.length}명의 학생</S.PageSubtitle>
        </S.HeaderLeft>
        <S.HeaderRight>
          <S.Button as={Link} to="/students/new" variant="success" size="medium">
            ➕ 새 학생
          </S.Button>
        </S.HeaderRight>
      </S.PageHeader>

      <S.ControlBar>
        <S.SearchWrapper>
          <S.SearchIcon>🔍</S.SearchIcon>
          <S.SearchInput
            type="text"
            placeholder="학생 검색..."
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
            isActive={filter === "active"}
            onClick={() => setFilter("active")}
          >
            활성
          </S.FilterButton>
          <S.FilterButton
            isActive={filter === "inactive"}
            onClick={() => setFilter("inactive")}
          >
            비활성
          </S.FilterButton>
        </S.FilterGroup>
      </S.ControlBar>

      {filteredStudents.length === 0 ? (
        <S.EmptyState>
          <S.EmptyIcon>👥</S.EmptyIcon>
          <S.EmptyTitle>
            {searchTerm ? "검색 결과가 없습니다" : "아직 학생이 없습니다"}
          </S.EmptyTitle>
          <S.EmptyDescription>
            {searchTerm
              ? "다른 검색어로 시도해보세요."
              : "첫 번째 학생을 등록해 시작해보세요!"}
          </S.EmptyDescription>
          {!searchTerm && (
            <S.Button as={Link} to="/students/new" variant="success">
              첫 학생 등록하기
            </S.Button>
          )}
        </S.EmptyState>
      ) : (
        <div>
          <S.TableContainer>
            <S.Table>
              <S.TableHead>
                <tr>
                  <S.TableHeader>학생</S.TableHeader>
                  <S.TableHeader>이메일</S.TableHeader>
                  <S.TableHeader>참여 시험</S.TableHeader>
                  <S.TableHeader>상태</S.TableHeader>
                  <S.TableHeader>액션</S.TableHeader>
                </tr>
              </S.TableHead>
              <S.TableBody>
                {paginatedStudents.map((student) => (
                  <S.TableRow key={student.id}>
                    <S.TableCell>
                      <S.StudentInfo>
                        <S.StudentAvatar>
                          {getInitials(student.name)}
                        </S.StudentAvatar>
                        <S.StudentDetails>
                          <S.StudentName>{student.name}</S.StudentName>
                        </S.StudentDetails>
                      </S.StudentInfo>
                    </S.TableCell>
                    <S.TableCell>
                      <S.StudentEmail>{student.email}</S.StudentEmail>
                    </S.TableCell>
                    <S.TableCell>
                      <Badge variant="info" size="small">
                        {student.examCount}개
                      </Badge>
                    </S.TableCell>
                    <S.TableCell>
                      <Badge
                        variant={student.examCount > 0 ? "success" : "warning"}
                        size="small"
                      >
                        {student.examCount > 0 ? "활성" : "대기"}
                      </Badge>
                    </S.TableCell>
                    <S.TableCell style={{ textAlign: "right" }}>
                      <S.ActionButtons>
                        <S.SmallButton
                          onClick={() => alert(t("studentList.studentDetailComingSoon"))}
                          variant="primary"
                          size="small"
                        >
                          보기
                        </S.SmallButton>
                      </S.ActionButtons>
                    </S.TableCell>
                  </S.TableRow>
                ))}
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
                )
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

export default StudentListPage;
