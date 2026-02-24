import React from "react";
import { Input } from "@/common/styles/GlobalStyles";
import { useLoginLogic } from "./hooks/useLoginLogic";
import * as S from "./Login.styles";

const LoginPage: React.FC = () => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    error,
    loading,
    handleSubmit,
  } = useLoginLogic();

  return (
    <S.LoginContainer>
      <S.LoginCard>
        <S.LogoSection>
          <S.Logo>
            <img src="/logo_only.png" alt="ARISTO" />
          </S.Logo>
          <S.Title>교사 로그인</S.Title>
          <S.Subtitle>ARISTO 시험 관리 시스템</S.Subtitle>
        </S.LogoSection>

        <S.Form onSubmit={handleSubmit}>
          {error && <S.ErrorMessage>{error}</S.ErrorMessage>}

          <S.FormGroup>
            <S.Label htmlFor="email">이메일</S.Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </S.FormGroup>

          <S.FormGroup>
            <S.Label htmlFor="password">비밀번호</S.Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </S.FormGroup>

          <S.SubmitButton
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={loading}
          >
            {loading ? "로그인 중..." : "로그인"}
          </S.SubmitButton>
        </S.Form>

        <S.Footer>
          <S.FooterText>
            학생이신가요?{" "}
            <S.FooterLink href="/student/login">학생 로그인</S.FooterLink>
          </S.FooterText>
        </S.Footer>
      </S.LoginCard>
    </S.LoginContainer>
  );
};

export default LoginPage;
