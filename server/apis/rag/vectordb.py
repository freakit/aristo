# 1. 페이지 나누기 (한 청크에 한 페이지)
# 2. 영어(문서와 같은 언어)로 검색
# 3. 키워드 검색 추가하기(?) -> 하이브리드 검색
# 4. 리랭킹 시스템 추가 (10~20개 먼저 가져오기 -> 정교하게 리랭커 하기)

"""
Vector Database Manager for RAG
ChromaDB를 사용한 벡터 데이터베이스 관리 모듈

임베딩 모델:
- Google Gemini: gemini-embedding-001
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# ChromaDB
import chromadb
from chromadb.config import Settings

# LangChain 임베딩
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# 환경 변수 로드
load_dotenv()


class EmbeddingManager:
    """
    Gemini 임베딩 모델 관리 클래스
    
    사용 모델:
    - Google Gemini gemini-embedding-001
    """
    
    def __init__(self):
        """임베딩 매니저 초기화"""
        self.embeddings = self._create_embeddings()
    
    def _create_embeddings(self):
        """임베딩 모델 인스턴스 생성"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.")
        
        return GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=api_key
        )
    
    def embed_text(self, text: str) -> List[float]:
        """단일 텍스트 임베딩"""
        return self.embeddings.embed_query(text)
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """여러 텍스트 임베딩"""
        return self.embeddings.embed_documents(texts)


class VectorDBManager:
    """
    ChromaDB 기반 벡터 데이터베이스 관리 클래스
    
    기능:
    - 청크 데이터를 벡터 DB에 저장
    - 유사도 검색
    - 컬렉션 관리
    """
    
    def __init__(
        self,
        persist_directory: str = "./chroma_db",
        collection_name: str = "rag_documents"
    ):
        """
        Args:
            persist_directory: ChromaDB 영구 저장 디렉토리
            collection_name: 컬렉션 이름
        """
        self.persist_directory = Path(persist_directory)
        self.collection_name = collection_name
        
        # 임베딩 매니저 초기화
        self.embedding_manager = EmbeddingManager()
        
        # ChromaDB 클라이언트 초기화 (영구 저장)
        self.client = chromadb.PersistentClient(
            path=str(self.persist_directory)
        )
        
        # 컬렉션 가져오기 또는 생성
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}  # 코사인 유사도 사용
        )
        
        print(f"VectorDB initialized")
        print(f"  - DB Path: {self.persist_directory}")
        print(f"  - Collection: {collection_name}")
        print(f"  - Embedding: Gemini")
        print(f"  - Current documents: {self.collection.count()}")
    
    def add_chunks(
        self,
        chunks: List[Dict[str, Any]],
        batch_size: int = 100
    ) -> int:
        """
        청크 데이터를 벡터 DB에 추가
        
        Args:
            chunks: 청크 리스트 (각 청크는 content, metadata 포함)
            batch_size: 배치 크기
            
        Returns:
            추가된 청크 수
        """
        if not chunks:
            print("No chunks to add.")
            return 0
        
        print(f"\nAdding {len(chunks)} chunks...")
        
        added_count = 0
        
        # 배치 처리
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            
            contents = [chunk["content"] for chunk in batch]
            metadatas = []
            ids = []
            
            for j, chunk in enumerate(batch):
                # 메타데이터 처리 (ChromaDB는 기본 타입만 지원)
                metadata = chunk.get("metadata", {})
                processed_metadata = {}
                
                for key, value in metadata.items():
                    if isinstance(value, (str, int, float, bool)):
                        processed_metadata[key] = value
                    elif isinstance(value, list):
                        processed_metadata[key] = json.dumps(value, ensure_ascii=False)
                    else:
                        processed_metadata[key] = str(value)
                
                metadatas.append(processed_metadata)
                
                # 고유 ID 생성 (key 포함으로 같은 PDF 재업로드 시 충돌 방지)
                source = metadata.get("source", "unknown")
                key = metadata.get("key", "")
                chunk_id = f"{key}_{i + j}" if key else f"{source}_{i + j}"
                ids.append(chunk_id)
            
            # 임베딩 생성
            embeddings = self.embedding_manager.embed_texts(contents)
            
            # ChromaDB에 추가
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=contents,
                metadatas=metadatas
            )
            
            added_count += len(batch)
            print(f"  - {added_count}/{len(chunks)} chunks added")
        
        print(f"Total {added_count} chunks added successfully")
        print(f"  - Current DB count: {self.collection.count()}")
        
        return added_count
    
    def _build_keys_filter(self, keys: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
        """keys 리스트를 ChromaDB where 필터로 변환"""
        if not keys or len(keys) == 0:
            return None
        if len(keys) == 1:
            return {"key": keys[0]}
        return {"key": {"$in": keys}}
    
    def search(
        self,
        query: str,
        n_results: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None,
        keys: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        유사도 검색
        
        Args:
            query: 검색 쿼리
            n_results: 반환할 결과 수
            filter_metadata: 메타데이터 필터
            keys: 특정 key만 검색 (None이면 전체 검색)
            
        Returns:
            검색 결과 리스트
        """
        # keys 필터 빌드
        if filter_metadata is None:
            filter_metadata = self._build_keys_filter(keys)
        
        # 쿼리 임베딩
        query_embedding = self.embedding_manager.embed_text(query)
        
        # 검색 실행
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=filter_metadata,
            include=["documents", "metadatas", "distances"]
        )
        
        # 결과 포맷팅
        formatted_results = []
        
        if results["ids"] and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                result = {
                    "id": doc_id,
                    "content": results["documents"][0][i] if results["documents"] else "",
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0.0,
                    "similarity": 1 - results["distances"][0][i] if results["distances"] else 0.0
                }
                formatted_results.append(result)
        
        return formatted_results
    
    def keyword_search(
        self,
        query: str,
        n_results: int = 20,
        keys: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        BM25 기반 키워드 검색
        
        Args:
            query: 검색 쿼리
            n_results: 반환할 결과 수
            keys: 특정 key만 검색 (None이면 전체 검색)
            
        Returns:
            검색 결과 리스트 (bm25_score 포함)
        """
        from rank_bm25 import BM25Okapi
        
        # keys 필터가 있으면 해당 key의 문서만 가져오기
        keys_filter = self._build_keys_filter(keys)
        if keys_filter:
            all_docs = self.collection.get(where=keys_filter, include=["documents", "metadatas"])
        else:
            # 모든 문서 가져오기
            all_docs = self.collection.get(include=["documents", "metadatas"])
        
        if not all_docs["ids"]:
            return []
        
        documents = all_docs["documents"]
        ids = all_docs["ids"]
        metadatas = all_docs["metadatas"]
        
        # 토큰화
        tokenized_docs = [doc.lower().split() for doc in documents]
        tokenized_query = query.lower().split()
        
        # BM25 인덱스 생성
        bm25 = BM25Okapi(tokenized_docs)
        
        # 점수 계산
        scores = bm25.get_scores(tokenized_query)
        
        # 결과 정렬
        doc_scores = list(zip(range(len(documents)), scores))
        doc_scores.sort(key=lambda x: x[1], reverse=True)
        
        # 상위 n_results 반환
        results = []
        max_score = max(scores) if scores.any() else 1.0
        
        for idx, score in doc_scores[:n_results]:
            if score > 0:  # 점수가 0보다 큰 것만
                result = {
                    "id": ids[idx],
                    "content": documents[idx],
                    "metadata": metadatas[idx] if metadatas else {},
                    "bm25_score": float(score),
                    "similarity": float(score / max_score) if max_score > 0 else 0.0
                }
                results.append(result)
        
        return results
    
    def hybrid_search(
        self,
        query: str,
        n_results: int = 5,
        use_reranking: bool = True,
        vector_weight: float = 0.7,
        keyword_weight: float = 0.3,
        initial_k: int = 20,
        keys: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        하이브리드 검색 (벡터 + BM25 + 리랭킹)
        
        Args:
            query: 검색 쿼리
            n_results: 최종 반환할 결과 수
            use_reranking: 리랭킹 사용 여부
            vector_weight: 벡터 검색 가중치 (0-1)
            keyword_weight: 키워드 검색 가중치 (0-1)
            initial_k: 초기 후보 수
            keys: 특정 key만 검색 (None이면 전체 검색)
            
        Returns:
            하이브리드 검색 결과 리스트
        """
        # 1. 벡터 검색
        vector_results = self.search(query, n_results=initial_k, keys=keys)
        
        # 2. 키워드 검색
        try:
            keyword_results = self.keyword_search(query, n_results=initial_k, keys=keys)
        except Exception as e:
            print(f"키워드 검색 오류, 벡터 검색만 사용: {e}")
            keyword_results = []
        
        # 3. RRF (Reciprocal Rank Fusion) 점수 결합
        rrf_scores = {}
        k = 60  # RRF 상수
        
        # 벡터 검색 결과 점수
        for rank, doc in enumerate(vector_results):
            doc_id = doc["id"]
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + vector_weight * (1 / (k + rank + 1))
            if doc_id not in rrf_scores:
                rrf_scores[doc_id] = {"doc": doc, "score": 0}
        
        # ID -> 문서 매핑
        doc_map = {doc["id"]: doc for doc in vector_results}
        
        # 키워드 검색 결과 점수 추가
        for rank, doc in enumerate(keyword_results):
            doc_id = doc["id"]
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + keyword_weight * (1 / (k + rank + 1))
            if doc_id not in doc_map:
                doc_map[doc_id] = doc
        
        # 점수로 정렬
        sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        
        # 결과 구성
        combined_results = []
        for doc_id in sorted_ids[:initial_k]:
            if doc_id in doc_map:
                doc = doc_map[doc_id].copy()
                doc["hybrid_score"] = rrf_scores[doc_id]
                combined_results.append(doc)
        
        # 4. 리랭킹 적용 (선택)
        if use_reranking and combined_results:
            try:
                from apis.rag.reranker import get_reranker
                reranker = get_reranker(use_llm=True)
                combined_results = reranker.rerank(query, combined_results, top_k=n_results)
            except Exception as e:
                print(f"리랭킹 오류: {e}")
                combined_results = combined_results[:n_results]
        else:
            combined_results = combined_results[:n_results]
        
        return combined_results
    
    def load_chunks_from_json(self, json_path: str) -> List[Dict[str, Any]]:
        """JSON 파일에서 청크 로드"""
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    
    def add_from_json(self, json_path: str) -> int:
        """
        JSON 파일에서 청크를 읽어 벡터 DB에 추가
        
        Args:
            json_path: 청크 JSON 파일 경로
            
        Returns:
            추가된 청크 수
        """
        json_path = Path(json_path)
        
        if not json_path.exists():
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {json_path}")
        
        print(f"\n{'='*60}")
        print(f"JSON 파일 로드: {json_path.name}")
        print(f"{'='*60}")
        
        chunks = self.load_chunks_from_json(str(json_path))
        print(f"  - 로드된 청크 수: {len(chunks)}")
        
        return self.add_chunks(chunks)
    
    def delete_by_source(self, source: str, key: Optional[str] = None) -> int:
        """
        특정 소스(파일)의 청크를 벡터 DB에서 삭제
        
        Args:
            source: 삭제할 소스 파일명 (예: "lec6_graph.pdf")
            key: 특정 업로드 버전만 삭제 (None이면 해당 소스 전체 삭제)
            
        Returns:
            삭제된 청크 수
        """
        if key:
            print(f"\n소스 '{source}' (key: {key})의 청크 삭제 중...")
            where_filter = {"$and": [{"source": source}, {"key": key}]}
        else:
            print(f"\n소스 '{source}'의 모든 청크 삭제 중...")
            where_filter = {"source": source}
        
        # 해당 소스의 모든 문서 조회
        results = self.collection.get(
            where=where_filter,
            include=["metadatas"]
        )
        
        if not results["ids"]:
            print(f"  - 해당하는 청크가 없습니다.")
            return 0
        
        # 삭제 실행
        delete_count = len(results["ids"])
        self.collection.delete(ids=results["ids"])
        
        print(f"✓ {delete_count}개 청크 삭제 완료")
        print(f"  - 현재 DB 문서 수: {self.collection.count()}")
        
        return delete_count
    
    def delete_by_ids(self, ids: List[str]) -> int:
        """
        ID 리스트로 청크 삭제
        
        Args:
            ids: 삭제할 문서 ID 리스트
            
        Returns:
            삭제된 청크 수
        """
        if not ids:
            print("삭제할 ID가 없습니다.")
            return 0
        
        self.collection.delete(ids=ids)
        print(f"✓ {len(ids)}개 청크 삭제 완료")
        
        return len(ids)

    def delete_by_key(self, key: str) -> int:
        """특정 key로 청크 삭제"""
        try:
            results = self.collection.get(where={"key": key})
            if not results or not results["ids"]:
                return 0
            
            self.collection.delete(ids=results["ids"])
            return len(results["ids"])
        except Exception as e:
            print(f"Key 삭제 실패: {e}")
        return 0
    
    def list_sources(self) -> List[Dict[str, Any]]:
        """
        벡터 DB에 저장된 모든 소스(파일) 목록 조회
        
        Returns:
            소스별 청크 수 및 key 목록 정보 리스트
        """
        # 모든 문서의 메타데이터 조회
        results = self.collection.get(include=["metadatas"])
        
        if not results["metadatas"]:
            return []
        
        # 소스별 카운트 및 key 수집
        source_info: Dict[str, Dict[str, Any]] = {}
        for metadata in results["metadatas"]:
            source = metadata.get("source", "unknown")
            key = metadata.get("key", "")
            
            if source not in source_info:
                source_info[source] = {"count": 0, "keys": set()}
            source_info[source]["count"] += 1
            if key:
                source_info[source]["keys"].add(key)
        
        # 결과 정리
        sources = [
            {
                "source": source,
                "count": info["count"],
                "keys": sorted(list(info["keys"]))
            }
            for source, info in sorted(source_info.items())
        ]
        
        return sources
    
    def delete_collection(self) -> None:
        """현재 컬렉션 삭제"""
        self.client.delete_collection(name=self.collection_name)
        print(f"컬렉션 '{self.collection_name}' 삭제됨")
    
    def get_collection_info(self) -> Dict[str, Any]:
        """컬렉션 정보 반환"""
        return {
            "name": self.collection_name,
            "count": self.collection.count(),
            "persist_directory": str(self.persist_directory)
        }


def main():
    """CLI 진입점 및 사용 예시"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="ChromaDB 기반 벡터 데이터베이스 관리",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  # JSON 파일에서 청크 추가
  python vectordb.py add --input output/document_chunked.json
  
  # 검색 테스트
  python vectordb.py search --query "가속도 법칙이란?"
  
  # 등록된 소스 목록 확인
  python vectordb.py list
  
  # 특정 소스 삭제
  python vectordb.py delete --source "lec6_graph.pdf"
  
  # 컬렉션 정보 확인
  python vectordb.py info
"""
    )
    
    subparsers = parser.add_subparsers(dest="command", help="명령")
    
    # add 명령
    add_parser = subparsers.add_parser("add", help="청크를 벡터 DB에 추가")
    add_parser.add_argument("--input", "-i", required=True, help="입력 JSON 파일")
    add_parser.add_argument(
        "--collection", "-c",
        default="rag_documents",
        help="컬렉션 이름 (기본값: rag_documents)"
    )
    add_parser.add_argument(
        "--db-path",
        default="./chroma_db",
        help="ChromaDB 저장 경로 (기본값: ./chroma_db)"
    )
    
    # search 명령
    search_parser = subparsers.add_parser("search", help="유사도 검색")
    search_parser.add_argument("--query", "-q", required=True, help="검색 쿼리")
    search_parser.add_argument(
        "--n", "-n",
        type=int,
        default=5,
        help="반환할 결과 수 (기본값: 5)"
    )
    search_parser.add_argument(
        "--collection", "-c",
        default="rag_documents",
        help="컬렉션 이름"
    )
    search_parser.add_argument(
        "--db-path",
        default="./chroma_db",
        help="ChromaDB 저장 경로"
    )
    
    # info 명령
    info_parser = subparsers.add_parser("info", help="컬렉션 정보 확인")
    info_parser.add_argument(
        "--collection", "-c",
        default="rag_documents",
        help="컬렉션 이름"
    )
    info_parser.add_argument(
        "--db-path",
        default="./chroma_db",
        help="ChromaDB 저장 경로"
    )
    
    # list 명령 (소스 목록)
    list_parser = subparsers.add_parser("list", help="등록된 소스 목록 확인")
    list_parser.add_argument(
        "--collection", "-c",
        default="rag_documents",
        help="컬렉션 이름"
    )
    list_parser.add_argument(
        "--db-path",
        default="./chroma_db",
        help="ChromaDB 저장 경로"
    )
    
    # delete 명령 (소스 삭제)
    delete_parser = subparsers.add_parser("delete", help="특정 소스의 청크 삭제")
    delete_parser.add_argument("--source", "-s", required=True, help="삭제할 소스 파일명")
    delete_parser.add_argument(
        "--collection", "-c",
        default="rag_documents",
        help="컬렉션 이름"
    )
    delete_parser.add_argument(
        "--db-path",
        default="./chroma_db",
        help="ChromaDB 저장 경로"
    )
    
    args = parser.parse_args()
    
    if args.command == "add":
        db = VectorDBManager(
            persist_directory=args.db_path,
            collection_name=args.collection
        )
        count = db.add_from_json(args.input)
        print(f"\n✓ 완료: {count}개 청크가 벡터 DB에 추가되었습니다.")
    
    elif args.command == "search":
        db = VectorDBManager(
            persist_directory=args.db_path,
            collection_name=args.collection
        )
        
        print(f"\n검색 쿼리: {args.query}")
        print(f"{'='*60}")
        
        results = db.search(args.query, n_results=args.n)
        
        for i, result in enumerate(results):
            print(f"\n[{i+1}] 유사도: {result['similarity']:.4f}")
            print(f"    ID: {result['id']}")
            print(f"    메타데이터: {result['metadata']}")
            print(f"    내용: {result['content'][:200]}...")
    
    elif args.command == "info":
        db = VectorDBManager(
            persist_directory=args.db_path,
            collection_name=args.collection
        )
        
        info = db.get_collection_info()
        print(f"\n컬렉션 정보:")
        print(f"  - 이름: {info['name']}")
        print(f"  - 문서 수: {info['count']}")
        print(f"  - 저장 경로: {info['persist_directory']}")
    
    elif args.command == "list":
        db = VectorDBManager(
            persist_directory=args.db_path,
            collection_name=args.collection
        )
        
        sources = db.list_sources()
        
        print(f"\n등록된 소스 목록:")
        print(f"{'='*60}")
        
        if not sources:
            print("  등록된 소스가 없습니다.")
        else:
            for src in sources:
                print(f"  - {src['source']}: {src['count']}개 청크")
            print(f"\n총 {len(sources)}개 소스, {sum(s['count'] for s in sources)}개 청크")
    
    elif args.command == "delete":
        db = VectorDBManager(
            persist_directory=args.db_path,
            collection_name=args.collection
        )
        
        count = db.delete_by_source(args.source)
        if count > 0:
            print(f"\n✓ 완료: 소스 '{args.source}'의 {count}개 청크가 삭제되었습니다.")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
