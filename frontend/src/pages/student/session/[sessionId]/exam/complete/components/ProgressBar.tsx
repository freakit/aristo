import styled from "styled-components";

interface ProgressBarProps {
  progress: number;
  label?: string;
  color?: string;
  height?: number;
}

const ProgressBarContainer = styled.div<{ height?: number }>`
  width: 100%;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  overflow: hidden;
  height: ${(props) => props.height || 8}px;
`;

const ProgressBarFill = styled.div<{ progress: number; color?: string }>`
  height: 100%;
  width: ${(props) => props.progress}%;
  background: ${(props) => props.color || "linear-gradient(90deg, #10b981 0%, #34d399 100%)"};
  border-radius: 8px;
  transition: width 0.3s ease;
`;

const ProgressLabel = styled.span`
  font-size: 12px;
  color: #64748b;
  margin-left: 8px;
`;

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label, color, height }) => {
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      <ProgressBarContainer height={height}>
        <ProgressBarFill progress={progress} color={color} />
      </ProgressBarContainer>
      {label && <ProgressLabel>{label}</ProgressLabel>}
    </div>
  );
};

export default ProgressBar;
