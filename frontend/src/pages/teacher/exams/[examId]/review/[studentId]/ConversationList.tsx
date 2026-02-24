import React from "react";
import styled from "styled-components";
import { QA } from "@/common/types";

// Common styles matching RiskEventList to ensure visual consistency
const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const Header = styled.div`
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
`;

const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 2px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const QAItem = styled.div`
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
`;

const QuestionSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.div<{ type: "Q" | "A" }>`
  font-size: 11px;
  font-weight: 700;
  color: ${(props) => (props.type === "Q" ? "#333f66" : "#059669")};
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: ${(props) => (props.type === "Q" ? "'Q'" : "'A'")};
    background: ${(props) => (props.type === "Q" ? "#e0e7ff" : "#dcfce7")};
    color: ${(props) => (props.type === "Q" ? "#333f66" : "#059669")};
    width: 16px;
    height: 16px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
  }
`;

const Text = styled.div`
  font-size: 13px;
  color: #1e293b;
  line-height: 1.5;
  white-space: pre-wrap;
`;

interface ConversationListProps {
  qaList: QA[];
}

const ConversationList: React.FC<ConversationListProps> = ({ qaList }) => {
  return (
    <Container>
      <Header>Conversation History ({qaList.length})</Header>
      <ScrollArea>
        <List>
          {qaList.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px",
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              No conversation history available.
            </div>
          ) : (
            qaList.map((qa, index) => (
              <QAItem key={index}>
                <QuestionSection>
                  <Label type="Q">Question</Label>
                  <Text>{qa.question}</Text>
                </QuestionSection>
                <QuestionSection>
                  <Label type="A">Answer</Label>
                  <Text>{qa.answer}</Text>
                </QuestionSection>
              </QAItem>
            ))
          )}
        </List>
      </ScrollArea>
    </Container>
  );
};

export default ConversationList;
