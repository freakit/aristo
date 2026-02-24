import React, { useState } from "react";
import { useAuth } from "@/common/contexts/AuthContext";
import apiClient from "@/common/services/apiClient"; 
import styled from "styled-components";
import { HelpCircle } from "lucide-react";
import { Tooltip } from "react-tooltip";

const Container = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px 0 rgba(0, 0, 0, 0.06);
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
`;

const FileInput = styled.input`
  margin-bottom: 1rem;
  display: block;
  width: 100%;
  font-size: 0.875rem;
  color: #374151;

  &::file-selector-button {
    margin-right: 1rem;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: 1px solid #d1d5db;
    background-color: #f3f4f6;
    color: #374151;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #e5e7eb;
    }
  }
`;

const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const SettingItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Label = styled.label`
  white-space: nowrap;
  min-width: 140px;
  font-weight: 500;
`;

const StyledHelpCircle = styled(HelpCircle)`
  width: 1rem;
  height: 1rem;
  color: #9ca3af;
  cursor: help;
`;

const NumberInput = styled.input`
  width: 6rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px #93c5fd;
  }

  /* Hide spinners */
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
  appearance: textfield;
`;

const UploadButton = styled.button`
  width: 100%;
  background-color: #2563eb;
  color: white;
  padding: 0.5rem 0;
  border-radius: 0.375rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #1d4ed8;
  }

  &:disabled {
    background-color: #d1d5db;
    cursor: not-allowed;
  }
`;

const TooltipContent = styled.div`
  max-width: 250px;
  font-size: 0.875rem;
  line-height: 1.4;
`;

interface FileUploadProps {
  onUploadStart?: (key: string) => void;
  onUploadSuccess?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadStart,
  onUploadSuccess,
}) => {
  const [windowSize, setWindowSize] = useState(1);
  const [overlapTokens, setOverlapTokens] = useState(150);
  const [maxTokens, setMaxTokens] = useState(500);
  const [file, setFile] = useState<File | null>(null);

  const { user } = useAuth();

  const handleUpload = async () => {
    if (!file) return;
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uid", user.id.toString());
    formData.append("window_size", windowSize.toString());
    formData.append("overlap_tokens", overlapTokens.toString());
    formData.append("max_tokens", maxTokens.toString());
    formData.append("strategy", "auto");

    try {
      // apiClient에서 baseUrl 가져오기
      const baseUrl = apiClient.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/rag/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      if (data.key && onUploadStart) {
        onUploadStart(data.key);
      }

      if (onUploadSuccess) {
        onUploadSuccess();
      }

      alert(`✅ 업로드 시작됨! 로그 창에서 진행상황을 확인하세요.\nKey: ${data.key}`);
      setFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      alert("❌ 업로드 실패: " + String(error));
    }
  };

  return (
    <Container>
      <Title>PDF 업로드</Title>

      <FileInput
        type="file"
        accept=".pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <SettingsContainer>
        <SettingItem>
          <Label>윈도우 크기 (페이지)</Label>
          <StyledHelpCircle data-tooltip-id="window-tooltip" />
          <NumberInput
            type="number"
            value={windowSize}
            onChange={(e) => setWindowSize(Number(e.target.value))}
            min={1}
            max={10}
          />
        </SettingItem>

        <SettingItem>
          <Label>오버랩 (토큰)</Label>
          <StyledHelpCircle data-tooltip-id="overlap-tooltip" />
          <NumberInput
            type="number"
            value={overlapTokens}
            onChange={(e) => setOverlapTokens(Number(e.target.value))}
            min={0}
            max={500}
          />
        </SettingItem>

        <SettingItem>
          <Label>최대 토큰 (청크당)</Label>
          <StyledHelpCircle data-tooltip-id="maxTokens-tooltip" />
          <NumberInput
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            min={100}
            max={2000}
          />
        </SettingItem>
      </SettingsContainer>

      <UploadButton onClick={handleUpload} disabled={!file}>
        업로드 시작
      </UploadButton>

      <Tooltip id="window-tooltip" place="top">
        <TooltipContent>
          한 번에 처리할 페이지 수를 설정합니다. 값이 클수록 문맥이 더 많이
          포함되지만 처리 시간이 증가합니다.
          <br />
          <br />
          권장값: 1-3 페이지
        </TooltipContent>
      </Tooltip>

      <Tooltip id="overlap-tooltip" place="top">
        <TooltipContent>
          청크 간 중복되는 토큰 수입니다. 문맥 연속성을 유지하는 데 도움이
          됩니다.
          <br />
          <br />
          권장값: 100-200 토큰
        </TooltipContent>
      </Tooltip>

      <Tooltip id="maxTokens-tooltip" place="top">
        <TooltipContent>
          각 청크의 최대 토큰 수를 제한합니다. 너무 크면 검색 정확도가 떨어질 수
          있습니다.
          <br />
          <br />
          권장값: 400-600 토큰
        </TooltipContent>
      </Tooltip>
    </Container>
  );
};

export default FileUpload;
