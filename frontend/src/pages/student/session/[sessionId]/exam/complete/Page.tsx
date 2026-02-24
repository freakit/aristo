// src/pages/student/ExamCompletionPage.tsx

import React from "react";
import {
  Upload,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  File as LucideFileIcon,
  FilePlus as LucideFilePlus,
} from "lucide-react";
import { Button } from "@/common/styles/GlobalStyles";
import { formatFileSize } from "./formatFileSize";
import { useExamCompletionLogic } from "./useExamCompletionLogic";
import * as S from "./Page.styles";

const ExamCompletionPage: React.FC = () => {
  const {
    t,
    exam,
    student,
    selectedFile,
    uploadStatus,
    uploadProgress,
    isDragOver,
    error,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    handleUpload,
    handleBackToExamList,
    setSelectedFile,
  } = useExamCompletionLogic();

  if (error && !exam && !student) {
    return (
      <S.PageContainer>
        <S.StatusMessage type="error">
          <AlertCircle size={20} />
          {error}
        </S.StatusMessage>
      </S.PageContainer>
    );
  }

  if (!exam || !student) {
    return (
      <S.PageContainer>
        <S.StatusMessage type="info">
          <div>{t("completionPage.loadingData")}</div>
        </S.StatusMessage>
      </S.PageContainer>
    );
  }

  return (
    <S.PageContainer>
      <S.PageHeader>
        <S.HeaderContent>
          <S.HeaderIcon>✅</S.HeaderIcon>
          <S.HeaderText>
            <S.PageTitle>{t("completionPage.headerTitle")}</S.PageTitle>
            <S.PageSubtitle>
              {t("completionPage.headerSubtitle", {
                examName: exam?.name,
                studentName: student?.name,
                registrationNumber: student?.registrationNumber,
              })}
            </S.PageSubtitle>
          </S.HeaderText>
        </S.HeaderContent>
      </S.PageHeader>

      <S.StatusSection>
        <S.StatusTitle>{t("completionPage.statusTitle")}</S.StatusTitle>
        <S.StatusText>{t("completionPage.statusText")}</S.StatusText>
      </S.StatusSection>

      <S.ContentArea>
        <S.Section>
          <S.SectionHeader>
            <S.SectionIcon>
              <Upload size={20} />
            </S.SectionIcon>
            <S.SectionTitle>
              {t("completionPage.uploadSectionTitle")}
            </S.SectionTitle>
          </S.SectionHeader>

          {!selectedFile ? (
            <S.UploadArea
              isDragOver={isDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <S.UploadIcon>
                <LucideFilePlus size={48} />
              </S.UploadIcon>
              <S.UploadTitle>{t("completionPage.uploadAreaTitle")}</S.UploadTitle>
              <S.UploadDescription
                dangerouslySetInnerHTML={{
                  __html: t("completionPage.uploadAreaDescription"),
                }}
              />
            </S.UploadArea>
          ) : (
            <div>
              <S.FileInfo>
                <S.FileIconWrapper>
                  <LucideFileIcon size={20} />
                </S.FileIconWrapper>
                <S.FileName>{selectedFile.name}</S.FileName>
                <S.FileSize>{formatFileSize(selectedFile.size)}</S.FileSize>
              </S.FileInfo>

              <S.UploadButton
                variant="primary"
                onClick={handleUpload}
                disabled={uploadStatus === "uploading"}
                isUploading={uploadStatus === "uploading"}
              >
                {uploadStatus === "uploading" ? (
                  <div>
                    {t("completionPage.uploadingText", {
                      progress: uploadProgress,
                    })}
                    <S.ProgressBar progress={uploadProgress} />
                  </div>
                ) : (
                  <div>
                    <Upload size={16} />
                    {t("completionPage.uploadButtonText")}
                  </div>
                )}
              </S.UploadButton>

              <Button
                variant="ghost"
                onClick={() => setSelectedFile(null)}
                disabled={uploadStatus === "uploading"}
                style={{ width: "100%", marginTop: "8px" }}
              >
                {t("completionPage.changeFileButtonText")}
              </Button>
            </div>
          )}

          {uploadStatus === "success" && (
            <S.StatusMessage type="success">
              <CheckCircle size={16} />
              {t("completionPage.uploadSuccess")}
            </S.StatusMessage>
          )}

          {error && (
            <S.StatusMessage type="error">
              <AlertCircle size={16} />
              {error}
            </S.StatusMessage>
          )}

          <S.HiddenFileInput
            id="file-input"
            type="file"
            onChange={handleFileInputChange}
          />
        </S.Section>

        <S.Section>
          <S.SectionHeader>
            <S.SectionIcon>
              <ArrowLeft size={20} />
            </S.SectionIcon>
            <S.SectionTitle>
              {t("completionPage.nextStepSectionTitle")}
            </S.SectionTitle>
          </S.SectionHeader>

          <S.NavigationSection>
            <S.NavigationButton variant="primary" onClick={handleBackToExamList}>
              <ArrowLeft size={16} />
              {t("completionPage.navigationButtonText")}
            </S.NavigationButton>
            <S.NavigationDescription
              dangerouslySetInnerHTML={{
                __html: t("completionPage.navigationDescription"),
              }}
            />
          </S.NavigationSection>
        </S.Section>
      </S.ContentArea>
    </S.PageContainer>
  );
};

export default ExamCompletionPage;
