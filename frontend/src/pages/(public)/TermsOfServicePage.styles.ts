import styled, { css } from "styled-components";
import { Container } from "@/common/styles/GlobalStyles";

export const PageContainer = styled(Container)`
  min-width: auto;
  max-width: 1200px;
  margin: 0 auto;
`;

export const PageHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 32px;
  border-bottom: 2px solid #f1f5f9;
`;

export const HeaderIcon = styled.div`
  width: 64px;
  height: 64px;
  background: #333f66;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
  margin-bottom: 20px;
`;

export const PageTitle = styled.h1`
  font-size: 36px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
  text-align: center;
`;

export const PageSubtitle = styled.p`
  font-size: 18px;
  color: #64748b;
  margin: 0;
  font-weight: 500;
  text-align: center;
  max-width: 600px;
  line-height: 1.5;
`;

export const LastUpdated = styled.div`
  font-size: 14px;
  color: #94a3b8;
  text-align: center;
  margin-top: 16px;
  padding: 12px 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
`;

export const TabContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 40px;
`;

export const TabButton = styled.button<{ isActive: boolean }>`
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1.5px solid transparent;

  ${({ isActive }) =>
    isActive
      ? css`
          background: #333f66;
          color: white;
          box-shadow: 0 4px 15px rgba(118, 75, 162, 0.3);
        `
      : css`
          background-color: #f1f5f9;
          color: #475569;
          border: 1.5px solid #e2e8f0;

          &:hover {
            background-color: #e2e8f0;
            color: #1e293b;
          }
        `}
`;

export const TermsContent = styled.div`
  background: white;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1.5px solid #f1f5f9;
  margin-bottom: 40px;
  line-height: 1.8;
`;

export const Article = styled.div`
  margin-bottom: 36px;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const ArticleTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #f1f5f9;
  border-bottom: 2px solid #f1f5f9;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 60px;
    height: 2px;
    background: #333f66;
  }
`;

export const Paragraph = styled.p`
  font-size: 16px;
  color: #374151;
  margin: 0 0 16px 0;
  text-align: justify;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const List = styled.ol`
  margin: 16px 0;
  padding-left: 20px;
`;

export const ListItem = styled.li`
  font-size: 16px;
  color: #374151;
  margin-bottom: 12px;
  line-height: 1.7;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const SubList = styled.ol`
  margin: 8px 0;
  padding-left: 20px;
  list-style-type: lower-alpha;
`;

export const SubListItem = styled.li`
  font-size: 15px;
  color: #4b5563;
  margin-bottom: 8px;
  line-height: 1.6;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const DefinitionList = styled.div`
  margin: 16px 0;
`;

export const DefinitionItem = styled.div`
  margin-bottom: 16px;
  padding-left: 20px;
  position: relative;

  &::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #333f66;
    font-weight: bold;
  }
`;

export const DefinitionTerm = styled.span`
  font-weight: 600;
  color: #1e293b;
`;

export const DefinitionDesc = styled.span`
  color: #374151;
`;

export const ContactInfo = styled.div`
  background: #f0f9ff;
  border: 1.5px solid #bae6fd;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 40px;
  text-align: center;
`;

export const ContactTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #0369a1;
  margin: 0 0 12px 0;
`;

export const ContactText = styled.p`
  font-size: 15px;
  color: #0369a1;
  margin: 0;
  line-height: 1.5;
`;

export const ConsentTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  margin-bottom: 24px;
  border-radius: 8px;
  border-style: hidden; /* hide standard table borders */
  box-shadow: 0 0 0 1px #e2e8f0; /* create a single border around the table */
  overflow: hidden;
`;

export const ConsentTh = styled.th`
  background-color: #f8fafc;
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #334155;
  border-bottom: 1px solid #e2e8f0;
  width: 30%;
  vertical-align: top;
`;

export const ConsentTd = styled.td`
  padding: 16px;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
  line-height: 1.6;
`;

export const NoticeBox = styled.div`
  margin-top: 24px;
  padding: 20px;
  background-color: #f1f5f9;
  border-radius: 12px;
  font-size: 15px;
  color: #475569;

  & > p {
    margin: 0;
  }
`;
