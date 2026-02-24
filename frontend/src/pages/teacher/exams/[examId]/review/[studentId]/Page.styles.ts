import styled from "styled-components";
import { Container, Button, Card } from "@/common/styles/GlobalStyles";

export { Button };

export const PageContainer = styled(Container)`
  padding-top: 100px;
  max-width: 1400px;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

export const BackButton = styled(Button)`
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const TitleSection = styled.div`
  flex: 1;
`;

export const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`;

export const Subtitle = styled.div`
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
`;

export const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  height: calc(100vh - 200px);
`;

export const VideoSection = styled(Card)`
  padding: 0;
  overflow: hidden;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

export const StyledVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

export const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
`;

export const InfoCard = styled(Card)`
  padding: 20px;
`;

export const InfoTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;
