"""
Reranker Module for RAG
Gemini API를 사용한 LLM 기반 리랭킹 모듈

리랭킹 전략:
1. 초기 벡터 검색으로 Top-N (예: 20개) 후보 추출
2. Gemini를 사용해 쿼리와 각 문서의 관련성 점수 재계산
3. 점수 기반 재정렬 후 최종 Top-K 반환
"""

import os
import json
import re
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


class GeminiReranker:
    """
    Gemini API를 사용한 LLM 기반 리랭커
    
    Cross-encoder 스타일로 쿼리와 문서 쌍의 관련성을 평가
    """
    
    def __init__(self, model_name: str = "gemini-3.1-flash-lite-preview"):
        """
        Args:
            model_name: 사용할 Gemini 모델
        """
        self.model_name = model_name
        self.client = self._create_client()
    
    def _create_client(self):
        """Gemini 클라이언트 생성"""
        try:
            from google import genai
            
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.")
            
            client = genai.Client(api_key=api_key)
            return client
        except ImportError:
            raise ImportError("google-genai 패키지가 필요합니다. pip install google-genai")
    
    def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        문서들을 쿼리 관련성에 따라 재정렬
        
        Args:
            query: 검색 쿼리
            documents: 재정렬할 문서 리스트 (각 문서는 content, metadata 포함)
            top_k: 반환할 상위 문서 수
            
        Returns:
            재정렬된 문서 리스트 (rerank_score 포함)
        """
        if not documents:
            return []
        
        if len(documents) <= top_k:
            # 문서가 적으면 리랭킹 없이 반환
            for doc in documents:
                doc["rerank_score"] = doc.get("similarity", 0.5)
            return documents
        
        # 배치로 관련성 점수 계산
        scored_docs = self._score_documents(query, documents)
        
        # 점수로 정렬
        scored_docs.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)
        
        return scored_docs[:top_k]
    
    def _score_documents(
        self,
        query: str,
        documents: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        각 문서에 대해 쿼리 관련성 점수 계산
        
        LLM을 사용하여 0-10 점수로 관련성 평가
        """
        # 프롬프트 구성
        docs_text = ""
        for i, doc in enumerate(documents):
            content = doc.get("content", "")[:500]  # 토큰 제한을 위해 잘라냄
            docs_text += f"\n[Document {i+1}]\n{content}\n"
        
        prompt = f"""You are a relevance scoring assistant. Score how relevant each document is to the given query.

Query: {query}

Documents:
{docs_text}

For each document, provide a relevance score from 0 to 10 where:
- 0-2: Not relevant at all
- 3-4: Slightly relevant
- 5-6: Moderately relevant  
- 7-8: Highly relevant
- 9-10: Extremely relevant, directly answers the query

Respond in JSON format only:
{{"scores": [score1, score2, ...]}}

JSON response:"""
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            
            # 응답 파싱
            response_text = response.text.strip()
            
            # JSON 추출 (코드 블록이 있을 수 있음)
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            scores_data = json.loads(response_text)
            scores = scores_data.get("scores", [])
            
            # 점수 적용
            for i, doc in enumerate(documents):
                if i < len(scores):
                    # 0-10 점수를 0-1로 정규화
                    doc["rerank_score"] = float(scores[i]) / 10.0
                else:
                    # 점수가 없으면 기존 유사도 사용
                    doc["rerank_score"] = doc.get("similarity", 0.5)
            
        except Exception as e:
            print(f"리랭킹 오류: {e}")
            # 오류 시 기존 유사도 점수 사용
            for doc in documents:
                doc["rerank_score"] = doc.get("similarity", 0.5)
        
        return documents


class SimpleReranker:
    """
    간단한 규칙 기반 리랭커 (API 없이 동작)
    
    키워드 일치도를 사용하여 점수 조정
    """
    
    def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        키워드 일치도 기반 재정렬
        """
        query_terms = set(query.lower().split())
        
        for doc in documents:
            content = doc.get("content", "").lower()
            
            # 키워드 일치 점수 계산
            match_count = sum(1 for term in query_terms if term in content)
            keyword_score = match_count / max(len(query_terms), 1)
            
            # 기존 유사도와 키워드 점수 결합
            original_similarity = doc.get("similarity", 0.5)
            doc["rerank_score"] = 0.7 * original_similarity + 0.3 * keyword_score
        
        # 점수로 정렬
        documents.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)
        
        return documents[:top_k]


def get_reranker(use_llm: bool = True) -> Any:
    """
    리랭커 인스턴스 반환
    
    Args:
        use_llm: True면 Gemini 리랭커, False면 Simple 리랭커
    """
    if use_llm:
        try:
            return GeminiReranker()
        except Exception as e:
            print(f"Gemini 리랭커 초기화 실패, Simple 리랭커 사용: {e}")
            return SimpleReranker()
    return SimpleReranker()


# 테스트용
if __name__ == "__main__":
    # 간단한 테스트
    reranker = get_reranker(use_llm=False)
    
    test_docs = [
        {"content": "MIPS instruction set architecture", "similarity": 0.7},
        {"content": "The weather is nice today", "similarity": 0.8},
        {"content": "MIPS register operands are used in arithmetic", "similarity": 0.6},
    ]
    
    results = reranker.rerank("MIPS instruction", test_docs, top_k=2)
    
    for i, doc in enumerate(results):
        print(f"[{i+1}] Score: {doc['rerank_score']:.4f} - {doc['content'][:50]}")
