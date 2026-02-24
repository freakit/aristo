import React, { useMemo } from "react";
import styled from "styled-components";
import { ExamLogEvent } from "@/common/types";

const TimelineContainer = styled.div`
  width: 100%;
  height: 48px;
  background: #f1f5f9;
  border-radius: 8px;
  position: relative;
  margin-top: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
`;

const Track = styled.div`
  width: 100%;
  height: 8px;
  background: #cbd5e1;
  border-radius: 4px;
  position: relative;
`;

const Progress = styled.div<{ width: number }>`
  height: 100%;
  background: #3b82f6;
  border-radius: 4px;
  width: ${(props) => props.width}%;
  position: absolute;
  top: 0;
  left: 0;
  transition: width 0.1s linear;
`;

const BlockMarker = styled.div<{
  left: number;
  widthPercent: number;
  riskLevel: "CAUTION" | "DANGER";
}>`
  position: absolute;
  top: -4px;
  left: ${(props) => props.left}%;
  width: ${(props) => props.widthPercent}%;
  min-width: 4px;
  height: 16px;
  background-color: ${(props) =>
    props.riskLevel === "DANGER" ? "#ef4444" : "#f59e0b"};
  border-radius: 2px;
  z-index: 2;
  cursor: pointer;
  opacity: 0.8;

  &:hover {
    z-index: 10;
    opacity: 1;
    transform: scaleY(1.1);
  }
`;

interface RiskTimelineProps {
  duration: number; // in seconds
  currentTime: number; // in seconds
  events: ExamLogEvent[];
  onSeek: (time: number) => void;
}

interface RiskBlock {
  startTime: number; // seconds
  endTime: number; // seconds
  hasDanger: boolean; // To decide color: if any event in block is DANGER, make block DANGER
  count: number;
}

const RiskTimeline: React.FC<RiskTimelineProps> = ({
  duration,
  currentTime,
  events,
  onSeek,
}) => {
  const safeDuration = Math.max(duration, 1);

  const riskBlocks = useMemo(() => {
    // 1. Filter out SAFE events
    const unsafeEvents = events.filter((e) => e.riskLevel !== "SAFE");

    // 2. Sort by timestamp (asc)
    unsafeEvents.sort((a, b) => a.timestamp - b.timestamp);

    const blocks: RiskBlock[] = [];
    if (unsafeEvents.length === 0) return blocks;

    // 3. Group consecutive events
    // Threshold calculation
    const MERGE_THRESHOLD_MS = 3000;

    let currentBlock: RiskBlock | null = null;
    let lastEventTimeMs = -Infinity;

    for (const event of unsafeEvents) {
      const eventTimeMs = event.timestamp;
      const isDanger = event.riskLevel === "DANGER";

      // Merge if within threshold. IGNORE risk level difference (merge mixed types)
      const timeDiff = eventTimeMs - lastEventTimeMs;
      // Note: first event logic handled by currentBlock check
      const shouldMerge = currentBlock && timeDiff <= MERGE_THRESHOLD_MS;

      if (shouldMerge && currentBlock) {
        // Extend current block
        currentBlock.endTime = eventTimeMs / 1000;
        currentBlock.count++;
        if (isDanger) currentBlock.hasDanger = true;
      } else {
        // Finalize previous block
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        // Start new block
        currentBlock = {
          startTime: eventTimeMs / 1000,
          endTime: eventTimeMs / 1000,
          hasDanger: isDanger,
          count: 1,
        };
      }
      lastEventTimeMs = eventTimeMs;
    }

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    // 4. Filter out short transient risks
    // "3�??�하???�들?� ?�우지 말자" -> Keep if duration > 3s
    return blocks.filter((b) => b.endTime - b.startTime > 3);
  }, [events]);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const ratio = Math.max(0, Math.min(1, clickX / width));
    onSeek(ratio * safeDuration);
  };

  const currentPercent = (currentTime / safeDuration) * 100;

  return (
    <TimelineContainer onClick={handleTrackClick}>
      <Track>
        <Progress width={Math.min(currentPercent, 100)} />
        {riskBlocks.map((block, idx) => {
          const startPercent = (block.startTime / safeDuration) * 100;
          const endPercent = (block.endTime / safeDuration) * 100;
          let widthPercent = endPercent - startPercent;

          // Prevent bounds overflow visually if something is weird
          if (startPercent < 0 || startPercent > 100) return null;

          return (
            <BlockMarker
              key={idx}
              left={startPercent}
              widthPercent={widthPercent}
              riskLevel={block.hasDanger ? "DANGER" : "CAUTION"}
              title={`${block.hasDanger ? "DANGER" : "CAUTION"}: ${
                block.count
              } events (${Math.round(block.startTime)}s - ${Math.round(
                block.endTime
              )}s)`}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(block.startTime);
              }}
            />
          );
        })}
      </Track>
    </TimelineContainer>
  );
};

export default RiskTimeline;
