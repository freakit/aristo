import React, { forwardRef } from "react";
import styled from "styled-components";
import { ExamLog, Student } from "@/common/types";

const ReportContainer = styled.div`
  width: 210mm; /* A4 width */
  min-height: 297mm; /* A4 height */
  padding: 20mm;
  background: white;
  color: #1e293b;
  font-family: "Pretendard", sans-serif;
  box-sizing: border-box;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 40px;
  color: #0f172a;
`;

const Section = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 8px;
  margin-bottom: 16px;
  color: #334155;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.div`
  font-size: 12px;
  color: #64748b;
`;

const Value = styled.div`
  font-size: 14px;
  font-weight: 500;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
`;

const StatCard = styled.div<{ color?: string }>`
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #e2e8f0;
  color: ${(props) => props.color || "inherit"};

  div:first-child {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  div:last-child {
    font-size: 12px;
    color: #64748b;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th {
    background: #f1f5f9;
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
    color: #475569;
    border-bottom: 1px solid #e2e8f0;
  }

  td {
    padding: 8px 12px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
  }

  tr:last-child td {
    border-bottom: none;
  }
`;

const RiskBadge = styled.span<{ level: string }>`
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: ${(props) =>
    props.level === "DANGER"
      ? "#fef2f2"
      : props.level === "CAUTION"
      ? "#fffbeb"
      : "#f8fafc"};
  color: ${(props) =>
    props.level === "DANGER"
      ? "#ef4444"
      : props.level === "CAUTION"
      ? "#b45309"
      : "#64748b"};
`;

interface ExamReportTemplateProps {
  examLog: ExamLog;
  student: Student | null;
  examName: string;
}

const ExamReportTemplate = forwardRef<HTMLDivElement, ExamReportTemplateProps>(
  ({ examLog, student, examName }, ref) => {
    const totalEvents = examLog.events.length;
    const cautionEvents = examLog.events.filter(
      (e) => e.riskLevel === "CAUTION"
    ).length;
    const dangerEvents = examLog.events.filter(
      (e) => e.riskLevel === "DANGER"
    ).length;
    const safeEvents = totalEvents - cautionEvents - dangerEvents;

    const durationMin = Math.floor(examLog.meta.totalDuration / 60);
    const durationSec = Math.floor(examLog.meta.totalDuration % 60);

    // Limit table rows to prevent PDF overflow for now (simple implementation)
    // In a real scenario, you'd handle pagination logic.
    const displayEvents = examLog.events.filter((e) => e.riskLevel !== "SAFE");

    return (
      <ReportContainer ref={ref}>
        <Title>AI Proctoring Report</Title>

        <Section>
          <SectionTitle>Session Information</SectionTitle>
          <InfoGrid>
            <InfoItem>
              <Label>Student</Label>
              <Value>
                {student
                  ? `${student.name} (${student.registrationNumber})`
                  : "Unknown"}
              </Value>
            </InfoItem>
            <InfoItem>
              <Label>School</Label>
              <Value>{student?.school || "-"}</Value>
            </InfoItem>
            <InfoItem>
              <Label>Exam</Label>
              <Value>{examName}</Value>
            </InfoItem>
            <InfoItem>
              <Label>Duration</Label>
              <Value>
                {durationMin}m {durationSec}s
              </Value>
            </InfoItem>
            <InfoItem>
              <Label>Date</Label>
              <Value>{new Date().toLocaleDateString()}</Value>
            </InfoItem>
          </InfoGrid>
        </Section>

        <Section>
          <SectionTitle>Analysis Summary</SectionTitle>
          <StatsGrid>
            <StatCard>
              <div>{totalEvents}</div>
              <div>Total Events</div>
            </StatCard>
            <StatCard color="#ef4444">
              <div>{dangerEvents}</div>
              <div>Danger</div>
            </StatCard>
            <StatCard color="#d97706">
              <div>{cautionEvents}</div>
              <div>Caution</div>
            </StatCard>
            <StatCard color="#22c55e">
              <div>{safeEvents}</div>
              <div>Safe</div>
            </StatCard>
          </StatsGrid>
        </Section>

        <Section>
          <SectionTitle>Risk Events Log</SectionTitle>
          <Table>
            <thead>
              <tr>
                <th style={{ width: "80px" }}>Time</th>
                <th style={{ width: "100px" }}>Level</th>
                <th style={{ width: "100px" }}>Type</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {displayEvents.map((event, idx) => (
                <tr key={idx}>
                  <td style={{ fontFamily: "monospace", color: "#64748b" }}>
                    {Math.round(event.timestamp / 1000)}s
                  </td>
                  <td>
                    <RiskBadge level={event.riskLevel}>
                      {event.riskLevel}
                    </RiskBadge>
                  </td>
                  <td>{event.type}</td>
                  <td>{event.zone}</td>
                </tr>
              ))}
              {displayEvents.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{ textAlign: "center", color: "#94a3b8" }}
                  >
                    No risk events detected.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Section>

        <div
          style={{
            marginTop: "40px",
            fontSize: "11px",
            color: "#cbd5e1",
            textAlign: "center",
          }}
        >
          Generated by Aristo AI Proctoring System
        </div>
      </ReportContainer>
    );
  }
);

export default ExamReportTemplate;
