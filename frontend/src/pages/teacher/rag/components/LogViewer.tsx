import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import apiClient from "@/common/services/apiClient";

interface LogViewerProps {
  uploadKey?: string | null;
  onComplete?: () => void;
}

interface LogMessage {
  status: 'processing' | 'success' | 'error' | 'ping';
  message: string;
  timestamp?: string;
}

const Container = styled.div`
  background: white;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const Title = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
`;

const StatusDot = styled.div<{ $connected: boolean }>`
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background-color: ${props => props.$connected ? '#22c55e' : '#ef4444'};
`;

const LogWindow = styled.div`
  background-color: black;
  border-radius: 0.25rem;
  padding: 1rem;
  height: 16rem;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.875rem;
`;

const LogEntry = styled.div<{ $status: LogMessage['status'] }>`
  margin-bottom: 0.25rem;
  color: ${props => {
    switch (props.$status) {
      case 'processing': return '#facc15';
      case 'success': return '#4ade80';
      case 'error': return '#f87171';
      default: return '#9ca3af';
    }
  }};
`;

const Timestamp = styled.span`
  color: #6b7280;
  margin-right: 0.5rem;
`;

const Icon = styled.span`
  margin-right: 0.5rem;
`;

const LogViewer: React.FC<LogViewerProps> = ({ uploadKey, onComplete }) => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!uploadKey) return;

    // apiClient에서 baseUrl 가져오기
    const baseUrl = apiClient.getBaseUrl();
    const eventSource = new EventSource(`${baseUrl}/api/rag/upload-logs/${uploadKey}`);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('EventSource connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const logData: LogMessage = JSON.parse(event.data);
        if (logData.status === 'ping') return;
        
        setLogs(prev => [...prev, {
          ...logData,
          timestamp: new Date().toLocaleTimeString()
        }]);

        if (logData.status === 'success' && onComplete) {
          onComplete();
        }
      } catch (error) {
        console.error('Failed to parse log data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [uploadKey, onComplete]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const getStatusIcon = (status: LogMessage['status']) => {
    switch (status) {
      case 'processing':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📝';
    }
  };

  return (
    <Container>
      <Header>
        <Title>처리 로그</Title>
        <StatusIndicator>
          <StatusDot $connected={isConnected} />
          <span>{isConnected ? '연결됨' : '연결 끊김'}</span>
        </StatusIndicator>
      </Header>

      <LogWindow ref={logContainerRef}>
        {logs.length === 0 ? (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem 0' }}>
            로그를 기다리는 중...
          </div>
        ) : (
          logs.map((log, index) => (
            <LogEntry key={index} $status={log.status}>
              <Timestamp>{log.timestamp}</Timestamp>
              <Icon>{getStatusIcon(log.status)}</Icon>
              <span>{log.message}</span>
            </LogEntry>
          ))
        )}
      </LogWindow>
    </Container>
  );
};

export default LogViewer;
