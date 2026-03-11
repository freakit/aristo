"""
Reranker Module for RAG
LLM-based reranking module using Gemini API

Reranking strategy:
1. Extract Top-N (e.g., 20) candidates using initial vector search
2. Recalculate relevance score of query and each document using Gemini
3. Reorder based on score and return final Top-K
"""

import os
import json
import re
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


class GeminiReranker:
    """
    LLM-based reranker using Gemini API
    
    Evaluates relevance of query and document pairs in Cross-encoder style
    """
    
    def __init__(self, model_name: str = "gemini-3.1-flash-lite-preview"):
        """
        Args:
            model_name: Gemini model to use
        """
        self.model_name = model_name
        self.client = self._create_client()
    
    def _create_client(self):
        """Create Gemini client"""
        try:
            from google import genai
            
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY environment variable is not set.")
            
            client = genai.Client(api_key=api_key)
            return client
        except ImportError:
            raise ImportError("google-genai package is required. pip install google-genai")
    
    def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Reorder documents based on query relevance
        
        Args:
            query: Search query
            documents: List of documents to reorder (each document must include content, metadata)
            top_k: Number of top documents to return
            
        Returns:
            Reordered document list (includes rerank_score)
        """
        if not documents:
            return []
        
        if len(documents) <= top_k:
            # If there are few documents, return without reranking
            for doc in documents:
                doc["rerank_score"] = doc.get("similarity", 0.5)
            return documents
        
        # Calculate relevance scores in batch
        scored_docs = self._score_documents(query, documents)
        
        # Sort by score
        scored_docs.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)
        
        return scored_docs[:top_k]
    
    def _score_documents(
        self,
        query: str,
        documents: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Calculate query relevance score for each document
        
        Evaluate relevance with a 0-10 score using LLM
        """
        # Construct prompt
        docs_text = ""
        for i, doc in enumerate(documents):
            content = doc.get("content", "")[:500]  # Truncate to limit tokens
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
            
            # Parse response
            response_text = response.text.strip()
            
            # Extract JSON (might contain code blocks)
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            scores_data = json.loads(response_text)
            scores = scores_data.get("scores", [])
            
            # Apply scores
            for i, doc in enumerate(documents):
                if i < len(scores):
                    # Normalize 0-10 score to 0-1
                    doc["rerank_score"] = float(scores[i]) / 10.0
                else:
                    # If score is missing, use original similarity
                    doc["rerank_score"] = doc.get("similarity", 0.5)
            
        except Exception as e:
            print(f"Reranking error: {e}")
            # Use original similarity score on error
            for doc in documents:
                doc["rerank_score"] = doc.get("similarity", 0.5)
        
        return documents


class SimpleReranker:
    """
    Simple rules-based reranker (works without API)
    
    Adjusts score using keyword matching
    """
    
    def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Reorder based on keyword match
        """
        query_terms = set(query.lower().split())
        
        for doc in documents:
            content = doc.get("content", "").lower()
            
            # Calculate keyword match score
            match_count = sum(1 for term in query_terms if term in content)
            keyword_score = match_count / max(len(query_terms), 1)
            
            # Combine original similarity with keyword score
            original_similarity = doc.get("similarity", 0.5)
            doc["rerank_score"] = 0.7 * original_similarity + 0.3 * keyword_score
        
        # Sort by score
        documents.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)
        
        return documents[:top_k]


def get_reranker(use_llm: bool = True) -> Any:
    """
    Return reranker instance
    
    Args:
        use_llm: True for Gemini reranker, False for Simple reranker
    """
    if use_llm:
        try:
            return GeminiReranker()
        except Exception as e:
            print(f"Failed to initialize Gemini reranker, using Simple reranker: {e}")
            return SimpleReranker()
    return SimpleReranker()


# For testing
if __name__ == "__main__":
    # Simple test
    reranker = get_reranker(use_llm=False)
    
    test_docs = [
        {"content": "MIPS instruction set architecture", "similarity": 0.7},
        {"content": "The weather is nice today", "similarity": 0.8},
        {"content": "MIPS register operands are used in arithmetic", "similarity": 0.6},
    ]
    
    results = reranker.rerank("MIPS instruction", test_docs, top_k=2)
    
    for i, doc in enumerate(results):
        print(f"[{i+1}] Score: {doc['rerank_score']:.4f} - {doc['content'][:50]}")
