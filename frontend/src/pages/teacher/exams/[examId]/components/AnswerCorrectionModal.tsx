import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { listBlobs } from "@/common/services/api/listBlobs";
import { getAzureSasToken } from "@/common/services/api/getAzureSasToken";

export interface AnswerChange {
  old_answer: string;
  new_answer: string;
  audio_file: number | null;
  fileName: string | null;
}

interface AnswerCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  corrections: AnswerChange[];
}

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${({ $isOpen }) => ($isOpen ? "flex" : "none")};
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Content = styled.div`
  background: white;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  border-radius: 12px;
  padding: 24px;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 12px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #64748b;
  &:hover {
    color: #1e293b;
  }
`;

const CorrectionItem = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Label = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
`;

const TextBlock = styled.div<{ $strike?: boolean; $highlight?: boolean }>`
  font-size: 1rem;
  color: ${({ $strike }) => ($strike ? "#94a3b8" : "#334155")};
  text-decoration: ${({ $strike }) => ($strike ? "line-through" : "none")};
  background: ${({ $highlight }) => ($highlight ? "#f0fdf4" : "transparent")};
  padding: ${({ $highlight }) => ($highlight ? "8px" : "0")};
  border-radius: ${({ $highlight }) => ($highlight ? "4px" : "0")};
  line-height: 1.5;
`;

const AudioPlayer = styled.audio`
  width: 100%;
  margin-top: 8px;
`;

const NoAudio = styled.div`
  font-size: 0.875rem;
  color: #94a3b8;
  font-style: italic;
`;

const AnswerCorrectionModal: React.FC<AnswerCorrectionModalProps> = ({
  isOpen,
  onClose,
  corrections,
}) => {
  const [audioUrls, setAudioUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    const fetchAudioUrls = async () => {
      const newUrls: Record<number, string> = {};
      for (const c of corrections) {
        if (c.audio_file && c.fileName && !audioUrls[c.audio_file]) {
          try {
            // Assume c.fileName is a prefix (e.g. "abc") and we want "abc-uuid"
            let targetFileName = c.fileName;

            // Try to find full filename if it looks like a prefix (optional logic,
            // but user said filename is just "abc" and wants "abc-...")
            const listRes = await listBlobs(c.fileName, {
              folder: "answeraudios",
            });

            console.log(listRes);

            if (
              listRes.success &&
              listRes.data?.blobs &&
              listRes.data.blobs.length > 0
            ) {
              // Find the one that starts with our prefix
              // Note: list-blobs with prefix already filters, so just pick the first one
              // But ensure we strip folder path if returned
              const fullPath = listRes.data.blobs[0];
              // Default behavior of list-blobs might return "folder/filename" or just "filename"
              // depending on backend. We just need the filename part for getAzureSasToken
              // if getAzureSasToken re-appends folder.

              // But wait, getAzureSasToken appends folder.
              // Backend list-blobs returns simple names if possible, check backend...
              // Backend returns "blob.name".

              // Safe bet: just use what listBlobs returns, but strip folder if it matches current folder
              // Actually getAzureSasToken takes "fileName".

              if (fullPath) {
                targetFileName = fullPath.split("/").pop() || targetFileName;
              }
            }

            const res = await getAzureSasToken(targetFileName, {
              folder: "answeraudios",
            });
            if (res.success && res.data?.sasUrl) {
              newUrls[c.audio_file] = res.data.sasUrl;
            }
          } catch (e) {
            console.error(
              `Failed to get SAS for audio ${c.audio_file} (${c.fileName})`,
              e
            );
          }
        }
      }
      if (Object.keys(newUrls).length > 0) {
        setAudioUrls((prev) => ({ ...prev, ...newUrls }));
      }
    };

    fetchAudioUrls();
  }, [isOpen, corrections, audioUrls]);

  if (!isOpen) return null;

  return (
    <Overlay $isOpen={isOpen} onClick={onClose}>
      <Content onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>?듬? ?섏젙 湲곕줉</Title>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </Header>
        {corrections.length === 0 ? (
          <div>?섏젙 湲곕줉???놁뒿?덈떎.</div>
        ) : (
          corrections.map((c, idx) => (
            <CorrectionItem key={idx}>
              <div>
                <Label>?섏젙 ???듬?</Label>
                <TextBlock $strike>{c.old_answer}</TextBlock>
              </div>
              <div style={{ textAlign: "center", color: "#64748b" }}>燧뉛툘</div>
              <div>
                <Label>?섏젙 ???듬?</Label>
                <TextBlock $highlight>{c.new_answer}</TextBlock>
              </div>
              <div>
                <Label>?뱀쓬???뚯꽦</Label>
                {c.audio_file && audioUrls[c.audio_file] ? (
                  <AudioPlayer controls src={audioUrls[c.audio_file]} />
                ) : c.audio_file ? (
                  <NoAudio>?ㅻ뵒??濡쒕뵫 以?..</NoAudio>
                ) : (
                  <NoAudio>?ㅻ뵒???놁쓬</NoAudio>
                )}
              </div>
            </CorrectionItem>
          ))
        )}
      </Content>
    </Overlay>
  );
};

export default AnswerCorrectionModal;

