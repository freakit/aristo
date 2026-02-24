import React from "react";
import styled from "styled-components";

interface ProgressBarProps {
  progress: number; // 0 to 100
  height?: number;
  color?: string;
  showText?: boolean;
}

const Container = styled.div<{ $height: number }>`
  width: 100%;
  height: ${(props) => props.$height}px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
`;

const Filler = styled.div<{ $progress: number; $color: string }>`
  height: 100%;
  width: ${(props) => props.$progress}%;
  background-color: ${(props) => props.$color};
  transition: width 0.3s ease-in-out;
`;

const Text = styled.span`
  position: absolute;
  width: 100%;
  text-align: center;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  font-weight: 600;
  color: #334155;
  mix-blend-mode: difference;
  color: white; /* fallback */
`;

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  color = "#3b82f6",
  showText = false,
}) => {
  const safeProgress = Math.max(0, Math.min(progress, 100));

  return (
    <Container $height={height}>
      <Filler $progress={safeProgress} $color={color} />
      {showText && <Text>{Math.round(safeProgress)}%</Text>}
    </Container>
  );
};

export default ProgressBar;

