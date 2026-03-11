# 1. Paginate (one page per chunk)
# 2. Search in English (same language as document)
# 3. Add keyword search (?) -> Hybrid search
# 4. Add reranking system (Get 10-20 first -> sophisticated reranking)

"""
Vector Database Manager for RAG
Vector database management module using ChromaDB

Embedding model:
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

# LangChain Embeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# Load environment variables
load_dotenv()


class EmbeddingManager:
    """
    Gemini embedding model management class
    
    Used model:
    - Google Gemini gemini-embedding-001
    """
    
    def __init__(self):
        """Initialize embedding manager"""
        self.embeddings = self._create_embeddings()
    
    def _create_embeddings(self):
        """Create embedding model instance"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set.")
        
        return GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=api_key
        )
    
    def embed_text(self, text: str) -> List[float]:
        """Single text embedding"""
        return self.embeddings.embed_query(text)
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Multiple texts embedding"""
        return self.embeddings.embed_documents(texts)


class VectorDBManager:
    """
    Vector database management class based on ChromaDB
    
    Features:
    - Save chunk data to Vector DB
    - Similarity search
    - Collection management
    """
    
    def __init__(
        self,
        persist_directory: str = "./chroma_db",
        collection_name: str = "rag_documents"
    ):
        """
        Args:
            persist_directory: ChromaDB persistent storage directory
            collection_name: Collection name
        """
        self.persist_directory = Path(persist_directory)
        self.collection_name = collection_name
        
        # Initialize embedding manager
        self.embedding_manager = EmbeddingManager()
        
        # Initialize ChromaDB client (persistent storage)
        self.client = chromadb.PersistentClient(
            path=str(self.persist_directory)
        )
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}  # Use cosine similarity
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
        Add chunk data to Vector DB
        
        Args:
            chunks: Chunk list (each chunk contains content, metadata)
            batch_size: Batch size
            
        Returns:
            Number of added chunks
        """
        if not chunks:
            print("No chunks to add.")
            return 0
        
        print(f"\nAdding {len(chunks)} chunks...")
        
        added_count = 0
        
        # Batch processing
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            
            contents = [chunk["content"] for chunk in batch]
            metadatas = []
            ids = []
            
            for j, chunk in enumerate(batch):
                # Process metadata (ChromaDB only supports basic types)
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
                
                # Generate unique ID (including key to prevent collision when re-uploading the same PDF)
                source = metadata.get("source", "unknown")
                key = metadata.get("key", "")
                chunk_id = f"{key}_{i + j}" if key else f"{source}_{i + j}"
                ids.append(chunk_id)
            
            # Generate embeddings
            embeddings = self.embedding_manager.embed_texts(contents)
            
            # Add to ChromaDB
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
        """Convert keys list to ChromaDB where filter"""
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
        Similarity search
        
        Args:
            query: Search query
            n_results: Number of results to return
            filter_metadata: Metadata filter
            keys: Search specific keys only (search all if None)
            
        Returns:
            Search result list
        """
        # Build keys filter
        if filter_metadata is None:
            filter_metadata = self._build_keys_filter(keys)
        
        # Query embedding
        query_embedding = self.embedding_manager.embed_text(query)
        
        # Execute search
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=filter_metadata,
            include=["documents", "metadatas", "distances"]
        )
        
        # Format results
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
        BM25-based keyword search
        
        Args:
            query: Search query
            n_results: Number of results to return
            keys: Search specific keys only (search all if None)
            
        Returns:
            Search result list (includes bm25_score)
        """
        from rank_bm25 import BM25Okapi
        
        # Get documents of corresponding key if keys filter exists
        keys_filter = self._build_keys_filter(keys)
        if keys_filter:
            all_docs = self.collection.get(where=keys_filter, include=["documents", "metadatas"])
        else:
            # Get all documents
            all_docs = self.collection.get(include=["documents", "metadatas"])
        
        if not all_docs["ids"]:
            return []
        
        documents = all_docs["documents"]
        ids = all_docs["ids"]
        metadatas = all_docs["metadatas"]
        
        # Tokenization
        tokenized_docs = [doc.lower().split() for doc in documents]
        tokenized_query = query.lower().split()
        
        # Create BM25 index
        bm25 = BM25Okapi(tokenized_docs)
        
        # Calculate scores
        scores = bm25.get_scores(tokenized_query)
        
        # Sort results
        doc_scores = list(zip(range(len(documents)), scores))
        doc_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Return top n_results
        results = []
        max_score = max(scores) if scores.any() else 1.0
        
        for idx, score in doc_scores[:n_results]:
            if score > 0:  # Only if score is greater than 0
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
        Hybrid search (Vector + BM25 + Reranking)
        
        Args:
            query: Search query
            n_results: Final number of results to return
            use_reranking: Whether to use reranking
            vector_weight: Vector search weight (0-1)
            keyword_weight: Keyword search weight (0-1)
            initial_k: Number of initial candidates
            keys: Search specific keys only (search all if None)
            
        Returns:
            Hybrid search result list
        """
        # 1. Vector search
        vector_results = self.search(query, n_results=initial_k, keys=keys)
        
        # 2. Keyword search
        try:
            keyword_results = self.keyword_search(query, n_results=initial_k, keys=keys)
        except Exception as e:
            print(f"Keyword search error, using vector search only: {e}")
            keyword_results = []
        
        # 3. Combine scores using RRF (Reciprocal Rank Fusion)
        rrf_scores = {}
        k = 60  # RRF constant
        
        # Vector search result scores
        for rank, doc in enumerate(vector_results):
            doc_id = doc["id"]
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + vector_weight * (1 / (k + rank + 1))
            if doc_id not in rrf_scores:
                rrf_scores[doc_id] = {"doc": doc, "score": 0}
        
        # ID -> Document mapping
        doc_map = {doc["id"]: doc for doc in vector_results}
        
        # Add keyword search result scores
        for rank, doc in enumerate(keyword_results):
            doc_id = doc["id"]
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + keyword_weight * (1 / (k + rank + 1))
            if doc_id not in doc_map:
                doc_map[doc_id] = doc
        
        # Sort by score
        sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        
        # Construct results
        combined_results = []
        for doc_id in sorted_ids[:initial_k]:
            if doc_id in doc_map:
                doc = doc_map[doc_id].copy()
                doc["hybrid_score"] = rrf_scores[doc_id]
                combined_results.append(doc)
        
        # 4. Apply reranking (optional)
        if use_reranking and combined_results:
            try:
                from apis.rag.reranker import get_reranker
                reranker = get_reranker(use_llm=True)
                combined_results = reranker.rerank(query, combined_results, top_k=n_results)
            except Exception as e:
                print(f"Reranking error: {e}")
                combined_results = combined_results[:n_results]
        else:
            combined_results = combined_results[:n_results]
        
        return combined_results
    
    def load_chunks_from_json(self, json_path: str) -> List[Dict[str, Any]]:
        """Load chunks from JSON file"""
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    
    def add_from_json(self, json_path: str) -> int:
        """
        Read chunks from JSON file and add to Vector DB
        
        Args:
            json_path: Chunk JSON file path
            
        Returns:
            Number of added chunks
        """
        json_path = Path(json_path)
        
        if not json_path.exists():
            raise FileNotFoundError(f"File not found: {json_path}")
        
        print(f"\n{'='*60}")
        print(f"Loading JSON file: {json_path.name}")
        print(f"{'='*60}")
        
        chunks = self.load_chunks_from_json(str(json_path))
        print(f"  - Loaded chunks: {len(chunks)}")
        
        return self.add_chunks(chunks)
    
    def delete_by_source(self, source: str, key: Optional[str] = None) -> int:
        """
        Delete chunks of a specific source (file) from Vector DB
        
        Args:
            source: Source filename to delete (e.g., "lec6_graph.pdf")
            key: Delete specific upload version only (delete all corresponding source if None)
            
        Returns:
            Number of deleted chunks
        """
        if key:
            print(f"\nsource '{source}' (key: {key}) chunks...")
            where_filter = {"$and": [{"source": source}, {"key": key}]}
        else:
            print(f"\nsource '{source}' all chunks...")
            where_filter = {"source": source}
        
        # Retrieve all documents of the corresponding source
        results = self.collection.get(
            where=where_filter,
            include=["metadatas"]
        )
        
        if not results["ids"]:
            print(f"  - No corresponding chunks found.")
            return 0
        
        # Execute delete
        delete_count = len(results["ids"])
        self.collection.delete(ids=results["ids"])
        
        print(f"✓ {delete_count} chunks deleted")
        print(f"  - Current DB documents: {self.collection.count()}")
        
        return delete_count
    
    def delete_by_ids(self, ids: List[str]) -> int:
        """
        Delete chunks by ID list
        
        Args:
            ids: List of document IDs to delete
            
        Returns:
            Number of deleted chunks
        """
        if not ids:
            print("No IDs to delete.")
            return 0
        
        self.collection.delete(ids=ids)
        print(f"✓ {len(ids)} chunks deleted")
        
        return len(ids)

    def delete_by_key(self, key: str) -> int:
        """Delete chunks by specific key"""
        try:
            results = self.collection.get(where={"key": key})
            if not results or not results["ids"]:
                return 0
            
            self.collection.delete(ids=results["ids"])
            return len(results["ids"])
        except Exception as e:
            print(f"Key deletion failed: {e}")
        return 0
    
    def list_sources(self) -> List[Dict[str, Any]]:
        """
        Retrieve list of all sources (files) stored in Vector DB
        
        Returns:
            List of source information including chunk count and keys
        """
        # Retrieve metadata of all documents
        results = self.collection.get(include=["metadatas"])
        
        if not results["metadatas"]:
            return []
        
        # Collect count and keys by source
        source_info: Dict[str, Dict[str, Any]] = {}
        for metadata in results["metadatas"]:
            source = metadata.get("source", "unknown")
            key = metadata.get("key", "")
            
            if source not in source_info:
                source_info[source] = {"count": 0, "keys": set()}
            source_info[source]["count"] += 1
            if key:
                source_info[source]["keys"].add(key)
        
        # Organize results
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
        """Delete current collection"""
        self.client.delete_collection(name=self.collection_name)
        print(f"Collection '{self.collection_name}' deleted")
    
    def get_collection_info(self) -> Dict[str, Any]:
        """Return collection info"""
        return {
            "name": self.collection_name,
            "count": self.collection.count(),
            "persist_directory": str(self.persist_directory)
        }


def main():
    """CLI Entry point and usage examples"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Vector database management based on ChromaDB",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example:
  # Add chunks from JSON file
  python vectordb.py add --input output/document_chunked.json
  
  # Search test
  python vectordb.py search --query "What is the law of acceleration?"
  
  # Check registered source list
  python vectordb.py list
  
  # Delete specific source
  python vectordb.py delete --source "lec6_graph.pdf"
  
  # Check collection info
  python vectordb.py info
"""
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command")
    
    # add Command
    add_parser = subparsers.add_parser("add", help="Add chunks to Vector DB")
    add_parser.add_argument("--input", "-i", required=True, help="Input JSON file")
    add_parser.add_argument(
        "--collection", "-c",
        default="rag_documents",
        help="Collection name (default: rag_documents)"
    )
    add_parser.add_argument(
        "--db-path",
        default="./chroma_db",
        help="ChromaDB storage path (default: ./chroma_db)"
    )
    
    # search Command
    search_parser = subparsers.add_parser("search", help="Similarity search")
    search_parser.add_argument("--query", "-q", required=True, help="Search query")
    search_parser.add_argument(
        "--n", "-n",
        type=int,
        default=5,
        help="Number of results to return (default: 5)"
    )
    search_parser.add_argument(
        "--collection", "-c",
        default="rag_documents",
        help="Collection name"
    )
    search_parser.add_argument(
        "--db-path",
        default="./chroma_db",
        help="ChromaDB storage path"
    )
    
    # info Command
    info_parser = subparsers.add_parser("info", help="Check collection info")
    info_parser.add_argument(
        "--collection", "-c",
        default="rag_documents",
        help="Collection name"
    )
    info_parser.add_argument(
        "--db-path",
        default="./chroma_db",
        help="ChromaDB storage path"
    )
    
    # list Command (source list)
    list_parser = subparsers.add_parser("list", help="Check registered source list")
    list_parser.add_argument(
        "--collection", "-c",
        default="rag_documents",
        help="Collection name"
    )
    list_parser.add_argument(
        "--db-path",
        default="./chroma_db",
        help="ChromaDB storage path"
    )
    
    # delete Command (delete source)
    delete_parser = subparsers.add_parser("delete", help="Delete chunks of specific source")
    delete_parser.add_argument("--source", "-s", required=True, help="Source filename to delete")
    delete_parser.add_argument(
        "--collection", "-c",
        default="rag_documents",
        help="Collection name"
    )
    delete_parser.add_argument(
        "--db-path",
        default="./chroma_db",
        help="ChromaDB storage path"
    )
    
    args = parser.parse_args()
    
    if args.command == "add":
        db = VectorDBManager(
            persist_directory=args.db_path,
            collection_name=args.collection
        )
        count = db.add_from_json(args.input)
        print(f"\n✓ Complete: {count} chunks added to Vector DB.")
    
    elif args.command == "search":
        db = VectorDBManager(
            persist_directory=args.db_path,
            collection_name=args.collection
        )
        
        print(f"\nSearch query: {args.query}")
        print(f"{'='*60}")
        
        results = db.search(args.query, n_results=args.n)
        
        for i, result in enumerate(results):
            print(f"\n[{i+1}] Similarity: {result['similarity']:.4f}")
            print(f"    ID: {result['id']}")
            print(f"    Metadata: {result['metadata']}")
            print(f"    Content: {result['content'][:200]}...")
    
    elif args.command == "info":
        db = VectorDBManager(
            persist_directory=args.db_path,
            collection_name=args.collection
        )
        
        info = db.get_collection_info()
        print(f"\nCollection Info:")
        print(f"  - Name: {info['name']}")
        print(f"  - Documents: {info['count']}")
        print(f"  - Storage Path: {info['persist_directory']}")
    
    elif args.command == "list":
        db = VectorDBManager(
            persist_directory=args.db_path,
            collection_name=args.collection
        )
        
        sources = db.list_sources()
        
        print(f"\nRegistered Source List:")
        print(f"{'='*60}")
        
        if not sources:
            print("  No registered sources found.")
        else:
            for src in sources:
                print(f"  - {src['source']}: {src['count']} chunks")
            print(f"\nTotal {len(sources)} sources, {sum(s['count'] for s in sources)} chunks")
    
    elif args.command == "delete":
        db = VectorDBManager(
            persist_directory=args.db_path,
            collection_name=args.collection
        )
        
        count = db.delete_by_source(args.source)
        if count > 0:
            print(f"\n✓ Complete: source '{args.source}' {count} chunks have been deleted.")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
