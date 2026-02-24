import React from "react";
import * as S from "../TermsOfServicePage.styles";

const ConsentContent: React.FC = () => (
  <S.Article>
    <S.ArticleTitle>개인정보 수집 이용 동의</S.ArticleTitle>
    <S.ConsentTable>
      <tbody>
        <tr>
          <S.ConsentTh>구분</S.ConsentTh>
          <S.ConsentTd>회원가입 및 회원 관리</S.ConsentTd>
        </tr>
        <tr>
          <S.ConsentTh>수집, 이용 목적</S.ConsentTh>
          <S.ConsentTd>회원 식별, 플랫폼 서비스 이용 및 이력 확인</S.ConsentTd>
        </tr>
        <tr>
          <S.ConsentTh>수집 항목</S.ConsentTh>
          <S.ConsentTd>
            성명, 이메일 주소 (SNS로그인의 경우 SNS ID), 비밀번호, 교육이력,
            소속 정보
          </S.ConsentTd>
        </tr>
        <tr>
          <S.ConsentTh>보유 기간</S.ConsentTh>
          <S.ConsentTd>
            탈퇴 후 5일 이내 파기
            <br />
            *기관 소속 회원: 기관 계약 종료 후 5년 경과 시 파기
          </S.ConsentTd>
        </tr>
      </tbody>
    </S.ConsentTable>
    <S.NoticeBox>
      <S.Paragraph>
        귀하는 위 개인정보 수집이용에 대한 동의를 거부할 수 있으며, 동의 후에도
        언제든지 철회 가능합니다.
      </S.Paragraph>
      <S.Paragraph style={{ marginTop: "8px", marginBottom: 0 }}>
        위 개인정보 수집이용에 동의하지 않을 경우, FreakIT의 서비스 가입 및
        이용이 제한됩니다.
      </S.Paragraph>
    </S.NoticeBox>
  </S.Article>
);

export default ConsentContent;
