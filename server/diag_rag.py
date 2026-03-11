"""
RAG & 학습목표 생성 진단 스크립트
"""
import os
import asyncio
import chromadb
from collections import Counter
from dotenv import load_dotenv

load_dotenv()

print("=" * 60)
print("1. ChromaDB 저장 현황")
print("=" * 60)
client = chromadb.PersistentClient(path="chroma_db")
cols = client.list_collections()
print(f"컬렉션 수: {len(cols)}")

for col in cols:
    all_docs = col.get(include=["metadatas", "documents"])
    sources = Counter(m.get("source", "?") for m in all_docs["metadatas"])
    keys = Counter(m.get("key", "?") for m in all_docs["metadatas"])
    
    print(f"\n컬렉션: {col.name}  총 청크: {col.count()}")
    print("  파일별 청크 수:")
    for s, c in sources.items():
        k = [m.get("key","") for m in all_docs["metadatas"] if m.get("source") == s][0]
        print(f"    [OK] {s}: {c} chunks (key: {k})")
    
    print("\n  Key 필터 검색 테스트:")
    for key in list(keys.keys()):
        result = col.get(where={"key": key}, include=["documents"])
        doc_count = len(result["documents"])
        sample = result["documents"][0][:120] if result["documents"] else "(없음)"
        status = "[OK]" if doc_count > 0 else "[ERR]"
        print(f"    {status} key={key[:8]}... -> {doc_count} docs")
        print(f"       Sample: {sample}")

print()
print("=" * 60)
print("2. 학습목표 생성 파이프라인 테스트")
print("=" * 60)

async def test_goal_gen(key: str):
    from google import genai
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY 없음")
        return
    
    client_ai = genai.Client(api_key=api_key)
    
    # ChromaDB 직접 쿼리
    db_client = chromadb.PersistentClient(path="chroma_db")
    col = db_client.get_collection("rag_documents")
    docs = col.get(where={"key": key}, include=["documents"])
    
    if not docs["documents"]:
        print(f"[ERR] No documents for key={key[:8]}...")
        return
    
    print(f"[OK] RAG docs {len(docs['documents'])} loaded")
    text = "\n\n".join(docs["documents"][:10])
    
    prompt = (
        "다음 학습 자료에서 학생이 오늘 필수로 마스터해야 할 핵심 개념이나 학습 목표 3가지를 구체적인 문장으로 추출해 주세요. "
        "반드시 각 줄마다 답변 하나씩, 총 3줄만 출력하세요. 번호나 글머리 기호 없이 순수한 내용 문장만 3줄 적으세요.\n\n"
        f"[자료]\n{text}"
    )
    
    print(f"[Call] Calling Gemini API (gemini-3-flash-preview)...")
    response = await client_ai.aio.models.generate_content(model="gemini-3-flash-preview", contents=prompt)
    
    lines = response.text.strip().split("\n")
    goals = [line.strip("- *0123456789. ") for line in lines if line.strip()]
    
    print(f"[OK] Generated Goals:")
    for i, g in enumerate(goals[:5], 1):
        print(f"  {i}. {g}")

# 학습목표 생성 테스트 - ChromaDB의 첫 번째 key 사용
db_client = chromadb.PersistentClient(path="chroma_db")
for col in db_client.list_collections():
    all_docs = col.get(include=["metadatas"])
    if all_docs["metadatas"]:
        keys = list(set(m.get("key","") for m in all_docs["metadatas"] if m.get("key")))
        if keys:
            print(f"\n테스트 Key: {keys[0]}")
            asyncio.run(test_goal_gen(keys[0]))

print("\n진단 완료")
