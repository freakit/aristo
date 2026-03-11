"""
RAG & Learning Objective Generation Diagnosis Script
"""
import os
import asyncio
import chromadb
from collections import Counter
from dotenv import load_dotenv

load_dotenv()

print("=" * 60)
print("1. ChromaDB Storage Status")
print("=" * 60)
client = chromadb.PersistentClient(path="chroma_db")
cols = client.list_collections()
print(f"Number of collections: {len(cols)}")

for col in cols:
    all_docs = col.get(include=["metadatas", "documents"])
    sources = Counter(m.get("source", "?") for m in all_docs["metadatas"])
    keys = Counter(m.get("key", "?") for m in all_docs["metadatas"])
    
    print(f"\nCollection: {col.name}  Total chunks: {col.count()}")
    print("  Chunks by file:")
    for s, c in sources.items():
        k = [m.get("key","") for m in all_docs["metadatas"] if m.get("source") == s][0]
        print(f"    [OK] {s}: {c} chunks (key: {k})")
    
    print("\n  Key filter search test:")
    for key in list(keys.keys()):
        result = col.get(where={"key": key}, include=["documents"])
        doc_count = len(result["documents"])
        sample = result["documents"][0][:120] if result["documents"] else "(None)"
        status = "[OK]" if doc_count > 0 else "[ERR]"
        print(f"    {status} key={key[:8]}... -> {doc_count} docs")
        print(f"       Sample: {sample}")

print()
print("=" * 60)
print("2. Learning Objective Generation Pipeline Test")
print("=" * 60)

async def test_goal_gen(key: str):
    from google import genai
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ No GEMINI_API_KEY")
        return
    
    client_ai = genai.Client(api_key=api_key)
    
    # Direct query to ChromaDB
    db_client = chromadb.PersistentClient(path="chroma_db")
    col = db_client.get_collection("rag_documents")
    docs = col.get(where={"key": key}, include=["documents"])
    
    if not docs["documents"]:
        print(f"[ERR] No documents for key={key[:8]}...")
        return
    
    print(f"[OK] RAG docs {len(docs['documents'])} loaded")
    text = "\n\n".join(docs["documents"][:10])
    
    prompt = (
        "Please extract 3 core concepts or learning objectives that the student must master today from the following learning material into specific sentences. "
        "Be sure to output exactly 3 lines, one answer per line. Write 3 pure content sentences without numbers or bullets.\n\n"
        f"[Material]\n{text}"
    )
    
    print(f"[Call] Calling Gemini API (gemini-3-flash-preview)...")
    response = await client_ai.aio.models.generate_content(model="gemini-3-flash-preview", contents=prompt)
    
    lines = response.text.strip().split("\n")
    goals = [line.strip("- *0123456789. ") for line in lines if line.strip()]
    
    print(f"[OK] Generated Goals:")
    for i, g in enumerate(goals[:5], 1):
        print(f"  {i}. {g}")

# Learning Objective Generation Test - Use first key of ChromaDB
db_client = chromadb.PersistentClient(path="chroma_db")
for col in db_client.list_collections():
    all_docs = col.get(include=["metadatas"])
    if all_docs["metadatas"]:
        keys = list(set(m.get("key","") for m in all_docs["metadatas"] if m.get("key")))
        if keys:
            print(f"\nTest Key: {keys[0]}")
            asyncio.run(test_goal_gen(keys[0]))

print("\nDiagnosis complete")
