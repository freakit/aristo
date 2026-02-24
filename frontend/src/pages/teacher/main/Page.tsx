// src/pages/teacher/MainPage.tsx

import React from "react";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "@/common/styles/GlobalStyles";
import { formatKoDate } from "@/common/utils/formatKoDate";
import { useMainLogic } from "./hooks/useMainLogic";
import * as S from "./Page.styles";

const MainPage: React.FC = () => {
  const {
    exams,
    students,
    loading,
    totalParticipants,
    activeExams,
    recentExams,
    averageParticipants,
  } = useMainLogic();

  if (loading) {
    return (
      <S.DashboardContainer>
        <S.LoadingContainer>
          <LoadingSpinner size="large" />
          <S.LoadingText>대시보드를 불러오는 중...</S.LoadingText>
        </S.LoadingContainer>
      </S.DashboardContainer>
    );
  }

  return (
    <S.DashboardContainer>
      <S.PageHeader>
        <S.PageTitle>대시보드</S.PageTitle>
        <S.PageSubtitle>
          ARISTO 시험 관리 시스템에 오신 것을 환영합니다
        </S.PageSubtitle>
      </S.PageHeader>

      <S.StatsGrid>
        <S.StatCard>
          <S.StatHeader>
            <S.StatLabel>총 시험 수</S.StatLabel>
            <S.StatIcon>📝</S.StatIcon>
          </S.StatHeader>
          <S.StatValue>{exams.length}</S.StatValue>
          <S.StatChange positive={activeExams > 0}>
            활성 {activeExams}개
          </S.StatChange>
        </S.StatCard>

        <S.StatCard>
          <S.StatHeader>
            <S.StatLabel>총 학생 수</S.StatLabel>
            <S.StatIcon>👥</S.StatIcon>
          </S.StatHeader>
          <S.StatValue>{students.length}</S.StatValue>
          <S.StatChange>등록 완료</S.StatChange>
        </S.StatCard>

        <S.StatCard>
          <S.StatHeader>
            <S.StatLabel>진행중</S.StatLabel>
            <S.StatIcon>⏱️</S.StatIcon>
          </S.StatHeader>
          <S.StatValue>{activeExams}</S.StatValue>
          <S.StatChange positive={activeExams > 0}>
            {activeExams > 0 ? "진행중" : "대기중"}
          </S.StatChange>
        </S.StatCard>

        <S.StatCard>
          <S.StatHeader>
            <S.StatLabel>평균 응시자</S.StatLabel>
            <S.StatIcon>📊</S.StatIcon>
          </S.StatHeader>
          <S.StatValue>{averageParticipants}</S.StatValue>
          <S.StatChange positive={totalParticipants > 0}>
            {totalParticipants > 0 ? "활발함" : "대기중"}
          </S.StatChange>
        </S.StatCard>
      </S.StatsGrid>

      <S.ContentGrid>
        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>최근 시험</S.SectionTitle>
            <S.ViewAllLink to="/exams">모두 보기 →</S.ViewAllLink>
          </S.SectionHeader>

          {recentExams.length === 0 ? (
            <S.EmptyState>
              <S.EmptyIcon>📚</S.EmptyIcon>
              <S.EmptyTitle>아직 시험이 없습니다</S.EmptyTitle>
              <S.EmptyDescription>
                첫 번째 시험을 만들어 시작해보세요!
              </S.EmptyDescription>
              <S.Button
                as={Link}
                to="/exams/new"
                variant="primary"
                size="small"
              >
                첫 시험 만들기
              </S.Button>
            </S.EmptyState>
          ) : (
            <S.RecentExamsList>
              {recentExams.map((exam) => (
                <S.ExamItem key={exam.id}>
                  <S.ExamInfo>
                    <S.ExamName>📝 {exam.name}</S.ExamName>
                    <S.ExamMeta>
                      {exam.studentCount ?? 0}명 응시 ·{" "}
                      {formatKoDate(exam.createdAt)}
                    </S.ExamMeta>
                  </S.ExamInfo>
                  <S.ExamActions>
                    <S.SmallButton
                      as={Link}
                      to={`/exams/${exam.id}`}
                      variant="primary"
                      size="small"
                    >
                      보기
                    </S.SmallButton>
                  </S.ExamActions>
                </S.ExamItem>
              ))}
            </S.RecentExamsList>
          )}
        </S.Section>

        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>빠른 액션</S.SectionTitle>
          </S.SectionHeader>

          <S.QuickActions>
            <S.ActionButton to="/exams/new">
              <S.ActionIcon>➕</S.ActionIcon>
              <S.ActionContent>
                <S.ActionTitle>새 시험</S.ActionTitle>
                <S.ActionDescription>시험 생성</S.ActionDescription>
              </S.ActionContent>
            </S.ActionButton>

            <S.ActionButton to="/students/new">
              <S.ActionIcon>👤</S.ActionIcon>
              <S.ActionContent>
                <S.ActionTitle>학생 추가</S.ActionTitle>
                <S.ActionDescription>신규 등록</S.ActionDescription>
              </S.ActionContent>
            </S.ActionButton>

            <S.ActionButton to="/rag">
              <S.ActionIcon>🖥️</S.ActionIcon>
              <S.ActionContent>
                <S.ActionTitle>RAG Settings</S.ActionTitle>
                <S.ActionDescription>지식 베이스 관리</S.ActionDescription>
              </S.ActionContent>
            </S.ActionButton>
          </S.QuickActions>
        </S.Section>
      </S.ContentGrid>
    </S.DashboardContainer>
  );
};

export default MainPage;
