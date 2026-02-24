import React, { useState, useEffect } from "react";
import styled from "styled-components";
import FileUpload from "./components/FileUpload";
import SourceList from "./components/SourceList";
import LogViewer from "./components/LogViewer";

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
`;

const PageSubtitle = styled.p`
  color: #6b7280;
  font-size: 1rem;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Section = styled.section`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
`;

const RagPage: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [key, setKey] = useState<string | null>(null);

  const handleUploadSuccess = () => {
    // Refresh sources list
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleProcessingComplete = () => {
    alert("PDF 처리 및 임베딩이 완료되었습니다."); // 사용자 알림
    setRefreshTrigger((prev) => prev + 1); // 목록 갱신
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>RAG Settings</PageTitle>
        <PageSubtitle>
          Manage knowledge base documents and view processing logs.
        </PageSubtitle>
      </PageHeader>

      <ContentGrid>
        <LeftColumn>
          {/* File Upload Section */}
          <Section>
            <SectionTitle>Upload Documents</SectionTitle>
            <FileUpload 
              onUploadStart={setKey} 
              onUploadSuccess={handleUploadSuccess} 
            />
          </Section>

          {/* Source List Section */}
          <Section>
            <SectionTitle>Knowledge Base Sources</SectionTitle>
            <SourceList refreshTrigger={refreshTrigger} />
          </Section>
        </LeftColumn>
        
        <RightColumn>
          {/* Log Viewer Section */}
          <Section>
            <SectionTitle>Processing Logs</SectionTitle>
            <LogViewer uploadKey={key} onComplete={handleProcessingComplete} />
          </Section>
        </RightColumn>
      </ContentGrid>
    </PageContainer>
  );
};

export default RagPage;
