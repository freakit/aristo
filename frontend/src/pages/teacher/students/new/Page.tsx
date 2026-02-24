// src/pages/teacher/StudentFormPage.tsx
import React from "react";
import { useStudentFormLogic } from "./hooks/useStudentFormLogic";
import * as S from "./Page.styles";

const StudentFormPage: React.FC = () => {
  const {
    formData,
    errors,
    isSubmitting,
    success,
    generalError,
    csvFile,
    isCsvUploading,
    csvResult,
    fileInputRef,
    handleInputChange,
    handleSubmit,
    handleFileChange,
    handleCsvUpload,
    handleCancel,
  } = useStudentFormLogic();

  return (
    <S.PageContainer>
      <S.PageHeader>
        <S.HeaderIcon>👨‍🎓</S.HeaderIcon>
        <S.PageTitle>새 학생 등록</S.PageTitle>
        <S.PageSubtitle>시험에 참여할 학생 정보를 입력해주세요</S.PageSubtitle>
      </S.PageHeader>

      <S.FormCard>
        <form onSubmit={handleSubmit}>
          <S.FormGrid>
            <S.FormRow>
              <S.FormGroup>
                <S.Label htmlFor="registrationNumber">
                  학번 <S.RequiredMark>*</S.RequiredMark>
                </S.Label>
                <S.StyledInput
                  id="registrationNumber"
                  name="registrationNumber"
                  type="text"
                  value={formData.registrationNumber}
                  onChange={handleInputChange}
                  placeholder="예: 20240001"
                  hasError={!!errors.registrationNumber}
                />
                {errors.registrationNumber && (
                  <S.ErrorMessage>{errors.registrationNumber}</S.ErrorMessage>
                )}
              </S.FormGroup>
              <S.FormGroup>
                <S.Label htmlFor="name">
                  성함 <S.RequiredMark>*</S.RequiredMark>
                </S.Label>
                <S.StyledInput
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="예: 홍길동"
                  hasError={!!errors.name}
                />
                {errors.name && <S.ErrorMessage>{errors.name}</S.ErrorMessage>}
              </S.FormGroup>
            </S.FormRow>

            <S.FormRow>
              <S.FormGroup>
                <S.Label htmlFor="school">
                  학교 <S.RequiredMark>*</S.RequiredMark>
                </S.Label>
                <S.StyledInput
                  id="school"
                  name="school"
                  type="text"
                  value={formData.school}
                  onChange={handleInputChange}
                  placeholder="예: KAIST"
                  hasError={!!errors.school}
                />
                {errors.school && <S.ErrorMessage>{errors.school}</S.ErrorMessage>}
              </S.FormGroup>
              <S.FormGroup>
                <S.Label htmlFor="email">
                  이메일 <S.RequiredMark>*</S.RequiredMark>
                </S.Label>
                <S.StyledInput
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="예: student@kaist.ac.kr"
                  hasError={!!errors.email}
                />
                {errors.email && <S.ErrorMessage>{errors.email}</S.ErrorMessage>}
              </S.FormGroup>
            </S.FormRow>

            <S.FormRow>
              <S.FormGroup>
                <S.Label htmlFor="phoneNumber">전화번호</S.Label>
                <S.StyledInput
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="예: 010-1234-5678"
                />
              </S.FormGroup>
              <S.FormGroup>
                <S.Label htmlFor="password">
                  초기 비밀번호 <S.RequiredMark>*</S.RequiredMark>
                </S.Label>
                <S.StyledInput
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  hasError={!!errors.password}
                />
                {errors.password && (
                  <S.ErrorMessage>{errors.password}</S.ErrorMessage>
                )}
              </S.FormGroup>
            </S.FormRow>

            <S.FormRow>
              <S.FormGroup>
                <S.Label htmlFor="age">
                  나이 <S.RequiredMark>*</S.RequiredMark>
                </S.Label>
                <S.StyledInput
                  id="age"
                  name="age"
                  type="number"
                  value={formData.age}
                  onChange={handleInputChange}
                  min="1"
                  max="150"
                  hasError={!!errors.age}
                />
                {errors.age && <S.ErrorMessage>{errors.age}</S.ErrorMessage>}
              </S.FormGroup>
              <S.FormGroup>
                <S.Label htmlFor="gender">
                  성별 <S.RequiredMark>*</S.RequiredMark>
                </S.Label>
                <S.Select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                >
                  <option value="남성">👨 남성</option>
                  <option value="여성">👩 여성</option>
                </S.Select>
              </S.FormGroup>
            </S.FormRow>

            <S.FormGroup>
              <S.Label htmlFor="significant">비고</S.Label>
              <S.TextArea
                id="significant"
                name="significant"
                value={formData.significant}
                onChange={handleInputChange}
                placeholder="특이사항이나 추가 정보... (최대 500자)"
                hasError={!!errors.significant}
              />
              {errors.significant && (
                <S.ErrorMessage>{errors.significant}</S.ErrorMessage>
              )}
            </S.FormGroup>
          </S.FormGrid>

          {generalError && (
            <S.GeneralErrorMessage>{generalError}</S.GeneralErrorMessage>
          )}
          {success && <S.SuccessMessage>{success}</S.SuccessMessage>}

          <S.ButtonGroup>
            <S.Button
              type="button"
              onClick={handleCancel}
              variant="ghost"
              size="large"
              disabled={isSubmitting}
            >
              취소
            </S.Button>
            <S.Button
              type="submit"
              variant="success"
              isLoading={isSubmitting}
              size="large"
            >
              {isSubmitting ? "등록 중..." : "👨‍🎓 학생 등록"}
            </S.Button>
          </S.ButtonGroup>
        </form>
      </S.FormCard>

      <S.Divider>OR</S.Divider>

      <S.FormCard>
        <S.CsvUploadTitle>CSV로 일괄 등록</S.CsvUploadTitle>
        <S.InfoCard style={{ marginBottom: "24px" }}>
          <S.InfoText>
            정해진 형식의 CSV 파일을 업로드하여 여러 학생을 한 번에 등록할 수
            있습니다. <br />
            <strong>필수 컬럼:</strong> registrationNumber, name, school, email,
            password <br />
            <strong>선택 컬럼:</strong> phoneNumber, age, gender (기본값:
            '남성')
          </S.InfoText>
        </S.InfoCard>

        <S.CsvInputWrapper>
          <S.StyledInput
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: "none" }}
            id="csv-upload"
          />
          <S.CsvLabel htmlFor="csv-upload">
            {csvFile ? `선택된 파일: ${csvFile.name}` : "📂 CSV 파일 선택"}
          </S.CsvLabel>
          <S.Button
            onClick={handleCsvUpload}
            isLoading={isCsvUploading}
            disabled={!csvFile || isCsvUploading}
          >
            {isCsvUploading ? "업로드 중..." : "🚀 일괄 업로드"}
          </S.Button>
        </S.CsvInputWrapper>

        {csvResult && (
          <S.CsvResultCard>
            <p>
              <strong>업로드 결과:</strong> 총{" "}
              {csvResult.success + csvResult.failed}건 중{" "}
              <strong>{csvResult.success}건 성공</strong> /{" "}
              <strong>{csvResult.failed}건 실패</strong>
            </p>
            {csvResult.failed > 0 && (
              <S.ErrorList>
                <strong>실패 사유:</strong>
                {csvResult.errors.map((err, index) => (
                  <li key={index}>
                    학번 '{err.rn}': {err.reason}
                  </li>
                ))}
              </S.ErrorList>
            )}
          </S.CsvResultCard>
        )}
      </S.FormCard>
    </S.PageContainer>
  );
};

export default StudentFormPage;
