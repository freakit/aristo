import React, { useState } from "react";
import * as S from "./TermsOfServicePage.styles";
import TermsContent from "./components/TermsContent";
import PrivacyPolicyContent from "./components/PrivacyPolicyContent";
import ConsentContent from "./components/ConsentContent";

enum TabType {
  TERMS = "terms",
  PRIVACY = "privacy",
  CONSENT = "consent",
}

const TermsOfServicePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.TERMS);

  const getPageTitle = (tab: TabType) => {
    switch (tab) {
      case TabType.TERMS:
        return "서비스 이용약관";
      case TabType.PRIVACY:
        return "개인정보 처리방침";
      case TabType.CONSENT:
        return "개인정보 수집 이용 동의";
      default:
        return "약관 및 정책";
    }
  };

  const getPageSubtitle = (tab: TabType) => {
    switch (tab) {
      case TabType.TERMS:
        return "FreakIT 서비스를 찾아주셔서 감사합니다. 서비스 이용약관을 확인해주세요.";
      case TabType.PRIVACY:
        return "FreakIT는 여러분의 개인정보를 소중하게 생각합니다.";
      case TabType.CONSENT:
        return "서비스 이용을 위한 필수적인 개인정보 수집 이용 내용을 확인해주세요.";
      default:
        return "";
    }
  };

  return (
    <S.PageContainer>
      <S.PageHeader>
        <S.HeaderIcon>
          <span>⚖️</span>
        </S.HeaderIcon>
        <S.PageTitle>{getPageTitle(activeTab)}</S.PageTitle>
        <S.PageSubtitle>{getPageSubtitle(activeTab)}</S.PageSubtitle>
        <S.LastUpdated>최종 업데이트: 2025년 9월 2일</S.LastUpdated>
      </S.PageHeader>

      <S.TabContainer>
        <S.TabButton
          isActive={activeTab === TabType.TERMS}
          onClick={() => setActiveTab(TabType.TERMS)}
        >
          서비스 이용약관
        </S.TabButton>
        <S.TabButton
          isActive={activeTab === TabType.PRIVACY}
          onClick={() => setActiveTab(TabType.PRIVACY)}
        >
          개인정보 처리방침
        </S.TabButton>
        <S.TabButton
          isActive={activeTab === TabType.CONSENT}
          onClick={() => setActiveTab(TabType.CONSENT)}
        >
          개인정보 수집 이용 동의
        </S.TabButton>
      </S.TabContainer>

      <S.TermsContent>
        {activeTab === TabType.TERMS && <TermsContent />}
        {activeTab === TabType.PRIVACY && <PrivacyPolicyContent />}
        {activeTab === TabType.CONSENT && <ConsentContent />}
      </S.TermsContent>

      <S.ContactInfo>
        <S.ContactTitle>문의하기</S.ContactTitle>
        <S.ContactText>
          약관 또는 정책과 관련하여 궁금한 점이 있으시다면 언제든지 문의해주세요.
        </S.ContactText>
        <S.ContactText style={{ marginTop: "8px", fontWeight: "bold" }}>
          freakit2025@gmail.com
        </S.ContactText>
      </S.ContactInfo>
    </S.PageContainer>
  );
};

export default TermsOfServicePage;
