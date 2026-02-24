import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Trash2 } from "lucide-react";
import { getRagSources, type RagSource } from "@/common/services/api/getRagSources";
import { useAuth } from "@/common/contexts/AuthContext";
import apiClient from "@/common/services/apiClient";

const Container = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px 0 rgba(0, 0, 0, 0.06);
  overflow: hidden;
`;

const Table = styled.table`
  min-width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background-color: #f9fafb;
`;

const Th = styled.th`
  padding: 0.75rem 1.5rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;

  &.center {
    text-align: center;
  }
`;

const Tbody = styled.tbody`
  background-color: white;

  & > tr:not(:last-child) {
    border-bottom: 1px solid #e5e7eb;
  }
`;

const Tr = styled.tr`
  &:hover {
    background-color: #f9fafb;
  }
`;

const Td = styled.td`
  padding: 1rem 1.5rem;
  font-size: 0.875rem;
  color: #111827;
  white-space: nowrap;

  &.center {
    text-align: center;
  }

  &.gray {
    color: #6b7280;
  }
`;

const FileName = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 400px;
`;

const DeleteButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #dc2626;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
  transition: color 0.2s;

  &:hover {
    color: #991b1b;
  }
`;

interface SourceListProps {
  refreshTrigger: number;
}

const SourceList: React.FC<SourceListProps> = ({ refreshTrigger }) => {
  const [sources, setSources] = useState<RagSource[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchSources = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await getRagSources(user.id);
      setSources(data);
    } catch (error) {
      console.error("Failed to fetch sources:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [refreshTrigger, user]);

  const handleDelete = async (key: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      // apiClient에서 baseUrl 가져오기
      const baseUrl = apiClient.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/rag/sources?key=${key}`, {  // ← 수정
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        alert(`삭제 완료: ${data.message}`);
        fetchSources();
      } else {
        alert("삭제 실패: " + (data.error || data.detail));
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Container>
      <Table>
        <thead>
          <tr>
            <Th>파일명</Th>
            <Th>청크 수</Th>
            <Th>작업</Th>
          </tr>
        </thead>
        <tbody>
          {sources.length === 0 ? (
            <tr>
              <Td colSpan={3}>등록된 문서가 없습니다.</Td>
            </tr>
          ) : (
            sources.map((source) => (
              <tr key={source.key}>
                <Td>{source.source}</Td>
                <Td>{source.count || 0}</Td>
                <Td>
                  <DeleteButton onClick={() => handleDelete(source.key)}>
                    <Trash2 size={16} />
                    삭제
                  </DeleteButton>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </Container>
  );
};

export default SourceList;
