import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { ExamLogEvent } from "@/common/types";
import { Hand, Eye } from "lucide-react";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0; /* Important for nested flex scroll */
`;

const FilterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 12px;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
`;

const FilterButton = styled.button<{
  active: boolean;
  variant?: "danger" | "caution" | "neutral";
}>`
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid ${(props) => (props.active ? "transparent" : "#e2e8f0")};
  background: ${(props) => {
    if (!props.active) return "white";
    if (props.variant === "danger") return "#fee2e2";
    if (props.variant === "caution") return "#fef3c7";
    return "#f1f5f9";
  }};
  color: ${(props) => {
    if (!props.active) return "#64748b";
    if (props.variant === "danger") return "#ef4444";
    if (props.variant === "caution") return "#d97706";
    return "#334155";
  }};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(props) => (props.active ? undefined : "#f8fafc")};
  }
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
  gap: 8px;
`;

const Item = styled.div<{
  riskLevel: "SAFE" | "CAUTION" | "DANGER";
  active: boolean;
}>`
  padding: 10px;
  border-radius: 6px;
  background: ${(props) =>
    props.riskLevel === "DANGER"
      ? "#fef2f2"
      : props.riskLevel === "CAUTION"
      ? "#fffbeb"
      : "#f8fafc"};
  border: 1px solid
    ${(props) =>
      props.active
        ? "#3b82f6"
        : props.riskLevel === "DANGER"
        ? "#fecaca"
        : props.riskLevel === "CAUTION"
        ? "#fde68a"
        : "#e2e8f0"};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
`;

const ItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const ItemType = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
`;

const TimeStamp = styled.span`
  font-family: monospace;
  font-size: 12px;
  color: #64748b;
  background: rgba(255, 255, 255, 0.5);
  padding: 2px 6px;
  border-radius: 4px;
`;

const ItemDetail = styled.div`
  font-size: 12px;
  color: #64748b;
`;

interface RiskEventListProps {
  events: ExamLogEvent[];
  currentTime: number;
  onSeek: (timestamp: number) => void;
}

const RiskEventList: React.FC<RiskEventListProps> = ({
  events,
  currentTime,
  onSeek,
}) => {
  const [levelFilter, setLevelFilter] = useState<"ALL" | "CAUTION" | "DANGER">(
    "ALL"
  );
  const [typeFilter, setTypeFilter] = useState<"ALL" | "GAZE" | "HAND">("ALL");

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Always exclude SAFE
      if (e.riskLevel === "SAFE") return false;

      // Level Filter
      if (levelFilter !== "ALL" && e.riskLevel !== levelFilter) return false;

      // Type Filter
      if (typeFilter !== "ALL" && e.type !== typeFilter) return false;

      return true;
    });
  }, [events, levelFilter, typeFilter]);

  return (
    <Container>
      <FilterSection>
        <FilterRow>
          <FilterButton
            active={levelFilter === "ALL"}
            onClick={() => setLevelFilter("ALL")}
            variant="neutral"
          >
            All Levels
          </FilterButton>
          <FilterButton
            active={levelFilter === "DANGER"}
            onClick={() => setLevelFilter("DANGER")}
            variant="danger"
          >
            Danger
          </FilterButton>
          <FilterButton
            active={levelFilter === "CAUTION"}
            onClick={() => setLevelFilter("CAUTION")}
            variant="caution"
          >
            Caution
          </FilterButton>
        </FilterRow>
        <FilterRow>
          <FilterButton
            active={typeFilter === "ALL"}
            onClick={() => setTypeFilter("ALL")}
            variant="neutral"
          >
            All Types
          </FilterButton>
          <FilterButton
            active={typeFilter === "GAZE"}
            onClick={() => setTypeFilter("GAZE")}
            variant="neutral"
          >
            Gaze
          </FilterButton>
          <FilterButton
            active={typeFilter === "HAND"}
            onClick={() => setTypeFilter("HAND")}
            variant="neutral"
          >
            Hand
          </FilterButton>
        </FilterRow>
      </FilterSection>

      <ScrollArea>
        <List>
          {filteredEvents.map((event, idx) => {
            const eventTime = event.timestamp / 1000;
            const isActive = Math.abs(currentTime - eventTime) < 2;

            return (
              <Item
                key={idx} // Note: Using idx is not ideal but simple for now
                riskLevel={event.riskLevel as "SAFE" | "CAUTION" | "DANGER"}
                active={isActive}
                onClick={() => onSeek(event.timestamp)}
              >
                <ItemHeader>
                  <ItemType>
                    {event.type === "GAZE" ? (
                      <Eye size={14} />
                    ) : (
                      <Hand size={14} />
                    )}
                    {event.riskLevel}
                  </ItemType>
                  <TimeStamp>{Math.round(eventTime)}s</TimeStamp>
                </ItemHeader>
                <ItemDetail>{event.zone}</ItemDetail>
              </Item>
            );
          })}
          {filteredEvents.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "20px",
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              No events match the filter.
            </div>
          )}
        </List>
      </ScrollArea>
    </Container>
  );
};

export default RiskEventList;
