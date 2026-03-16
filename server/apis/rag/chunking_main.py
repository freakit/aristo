"""
Document Chunker for RAG
Module for splitting JSON file elements into RAG chunks
"""

import os
import sys
import json
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
from datetime import datetime

# If tiktoken is installed, use it; otherwise use char-based token estimation
try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False
    print("Warning: tiktoken not installed. Using character-based token estimation.")


class DocumentChunker:
    """
    Class to chunk elements from a JSON file
    
    Attributes:
        min_chunk_tokens: Minimum chunk token count (default: 800)
        max_chunk_tokens: Maximum chunk token count (default: 1000)
        overlap_tokens: Overlap token count (default: 150)
        use_sliding_window: Whether to use sliding window (default: True)
        window_size: Sliding window size - number of pages (default: 1)
        overlap_pages: Overlap page count (default: 1)
    """
    
    def __init__(
        self,
        min_chunk_tokens: int = 600,
        max_chunk_tokens: int = 800,
        overlap_tokens: int = 150,
        model: str = "gpt-4",
        use_sliding_window: bool = True,
        window_size: int = 1,
        overlap_pages: int = 1
    ):
        self.min_chunk_tokens = min_chunk_tokens
        self.max_chunk_tokens = max_chunk_tokens
        self.overlap_tokens = overlap_tokens
        self.use_sliding_window = use_sliding_window
        self.window_size = window_size
        self.overlap_pages = overlap_pages
        
        # Initialize tiktoken encoder
        if TIKTOKEN_AVAILABLE:
            try:
                self.encoder = tiktoken.encoding_for_model(model)
            except KeyError:
                self.encoder = tiktoken.get_encoding("cl100k_base")
        else:
            self.encoder = None
    
    def count_tokens(self, text: str) -> int:
        """Calculate number of tokens in text."""
        if self.encoder:
            return len(self.encoder.encode(text))
        else:
            # Character-based estimation (1 token ≈ 4 chars)
            return len(text) // 4
    
    def split_into_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences.
        
        Splits mainly based on sentence-ending punctuations (. ! ?)
        while considering abbreviations (e.g., Mr., Dr., etc.).
        """
        # Sentence split pattern
        # Behind . ! ? followed by space or end of string, excluding abbreviation patterns
        sentence_endings = re.compile(r'(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])$')
        
        # Split by newline first
        lines = text.split('\n')
        sentences = []
        
        for line in lines:
            if not line.strip():
                continue
            
            # Split by punctuation
            parts = sentence_endings.split(line)
            for part in parts:
                part = part.strip()
                if part:
                    sentences.append(part)
        
        return sentences
    
    def split_long_text(self, text: str, max_tokens: int) -> List[str]:
        """
        Split long text into sentences so it is under max_tokens.
        """
        if self.count_tokens(text) <= max_tokens:
            return [text]
        
        sentences = self.split_into_sentences(text)
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            sentence_tokens = self.count_tokens(sentence)
            
            # If a single sentence is longer than max_tokens
            if sentence_tokens > max_tokens:
                # Save current chunk
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""
                
                # Split sentence by words
                words = sentence.split()
                word_chunk = ""
                for word in words:
                    test_chunk = word_chunk + " " + word if word_chunk else word
                    if self.count_tokens(test_chunk) <= max_tokens:
                        word_chunk = test_chunk
                    else:
                        if word_chunk:
                            chunks.append(word_chunk.strip())
                        word_chunk = word
                if word_chunk:
                    current_chunk = word_chunk
            else:
                test_chunk = current_chunk + " " + sentence if current_chunk else sentence
                if self.count_tokens(test_chunk) <= max_tokens:
                    current_chunk = test_chunk
                else:
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    current_chunk = sentence
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def merge_metadata(self, elements: List[Dict[str, Any]], source: str, key: str = "", uploaded_at: str = "") -> Dict[str, Any]:
        """Merge metadata from multiple elements."""
        types: Set[str] = set()
        pages: Set[int] = set()
        image_paths: List[str] = []
        
        for elem in elements:
            metadata = elem.get("metadata", {})
            
            # Collect type
            elem_type = metadata.get("type")
            if elem_type:
                types.add(elem_type)
            
            # Collect page
            page = metadata.get("page")
            if page is not None:
                pages.add(page)
            
            # Collect image_path
            image_path = metadata.get("image_path")
            if image_path:
                image_paths.append(image_path)
        
        merged = {
            "source": source,
            "key": key,
            "uploaded_at": uploaded_at,
            "type": sorted(list(types)),
            "page": sorted(list(pages))
        }
        
        # Add image path if present
        if image_paths:
            merged["image_path"] = image_paths if len(image_paths) > 1 else image_paths[0]
        
        return merged
    
    def get_overlap_text(self, text: str) -> str:
        """Extract overlap text from the end of a chunk."""
        if self.count_tokens(text) <= self.overlap_tokens:
            return text
        
        sentences = self.split_into_sentences(text)
        if not sentences:
            return ""
        
        # Match overlap token count by adding sentences from the end
        overlap_text = ""
        for sentence in reversed(sentences):
            test_text = sentence + " " + overlap_text if overlap_text else sentence
            if self.count_tokens(test_text) <= self.overlap_tokens:
                overlap_text = test_text
            else:
                break
        
        return overlap_text.strip()
    
    def group_elements_by_page(self, elements: List[Dict[str, Any]]) -> Dict[int, List[Dict[str, Any]]]:
        """
        Group elements by page number.
        
        Args:
            elements: List of elements
            
        Returns:
            Dictionary with page number as key and list of elements as value
        """
        page_groups: Dict[int, List[Dict[str, Any]]] = {}
        
        for elem in elements:
            page = elem.get("metadata", {}).get("page", 0)
            if page not in page_groups:
                page_groups[page] = []
            page_groups[page].append(elem)
        
        return page_groups
    
    def get_page_content(self, page_elements: List[Dict[str, Any]]) -> str:
        """Combine contents of page elements."""
        content_parts = []
        for elem in page_elements:
            content = elem.get("content", "")
            if content and content.strip():
                content_parts.append(content.strip())
        return "\n".join(content_parts)
    
    def get_sentence_based_overlap(self, text: str, target_tokens: int) -> str:
        """
        Extract sentence-based overlap text bounded by token count.
        Preserves sentence boundaries for natural overlap.
        
        Args:
            text: Original text
            target_tokens: Target overlap token count
            
        Returns:
            Overlap text (truncated by sentences)
        """
        if self.count_tokens(text) <= target_tokens:
            return text
        
        sentences = self.split_into_sentences(text)
        if not sentences:
            return ""
        
        # Satisfy target token count by adding sentences from the end
        overlap_sentences = []
        current_tokens = 0
        
        for sentence in reversed(sentences):
            sentence_tokens = self.count_tokens(sentence)
            if current_tokens + sentence_tokens <= target_tokens:
                overlap_sentences.insert(0, sentence)
                current_tokens += sentence_tokens
            else:
                break
        
        return " ".join(overlap_sentences).strip()
    
    def chunk_elements_sliding_window(self, elements: List[Dict[str, Any]], source: str, key: str = "", uploaded_at: str = "") -> List[Dict[str, Any]]:
        """
        Sliding window chunking based on up to 2 pages.
        
        Behavior:
        1. Include up to 2 pages in one chunk
        2. If 2 pages combined exceed max_tokens -> Split the second page by sentences
        3. The leftover part moves to the next chunk (including overlap)
        
        Example:
        - Page 4 (200 tokens) + Page 5 (300 tokens) = 500 tokens -> One chunk
        - Page 7 (500 tokens) + Page 8 (600 tokens) = 1100 tokens > max(1000)
          -> Page 7 + Page 8 part (500 tokens) = 1000 tokens chunk
          -> Page 8 rest (100 tokens) + overlap -> Next chunk
        
        Args:
            elements: List of elements (including content, metadata)
            source: Source filename
            
        Returns:
            Chunk list
        """
        # Group elements by page
        page_groups = self.group_elements_by_page(elements)
        
        if not page_groups:
            return []
        
        # Sort page numbers
        sorted_pages = sorted(page_groups.keys())
        total_pages = len(sorted_pages)
        
        # Precalculate sentence-level splits and contents for each page
        page_contents = {}
        page_sentences = {}
        for page_num in sorted_pages:
            content = self.get_page_content(page_groups[page_num])
            page_contents[page_num] = content
            page_sentences[page_num] = self.split_into_sentences(content) if content else []
        
        chunks = []
        chunk_index = 0
        i = 0
        carryover_text = ""  # Tail text carried over from previous page
        carryover_page = None  # Page number of the carryover text
        prev_overlap_text = ""  # Text for overlap
        
        while i < total_pages:
            current_page = sorted_pages[i]
            current_content_parts = []
            included_pages = []
            current_elements = []
            
            # 1. Add overlap text (exclude first chunk)
            overlap_tokens = 0
            if prev_overlap_text:
                current_content_parts.append(f"[Previous Context]\n{prev_overlap_text}\n[Current Content]")
                overlap_tokens = self.count_tokens(prev_overlap_text)
            
            # 2. Extract carryover text from previous iteration if any
            if carryover_text:
                current_content_parts.append(carryover_text)
                if carryover_page is not None:
                    included_pages.append(carryover_page)
                carryover_text = ""
                carryover_page = None
            
            # 3. Add current page
            page1_content = page_contents[current_page]
            page1_tokens = self.count_tokens(page1_content)
            
            current_content_parts.append(page1_content)
            included_pages.append(current_page)
            current_elements.extend(page_groups[current_page])
            
            current_tokens = self.count_tokens("\n".join(current_content_parts)) - overlap_tokens
            
            # 4. Attempt to add next page if any (up to window_size)
            next_page_idx = i + 1
            if next_page_idx < total_pages and len(included_pages) < self.window_size:
                next_page = sorted_pages[next_page_idx]
                next_content = page_contents[next_page]
                next_tokens = self.count_tokens(next_content)
                
                combined_tokens = current_tokens + next_tokens
                
                if combined_tokens <= self.max_chunk_tokens:
                    # Fit both pages
                    current_content_parts.append(next_content)
                    included_pages.append(next_page)
                    current_elements.extend(page_groups[next_page])
                    i += 1  # Next page is processed
                else:
                    # Split the second page by sentences
                    available_tokens = self.max_chunk_tokens - current_tokens
                    
                    if available_tokens > 0:
                        sentences = page_sentences[next_page]
                        included_sentences = []
                        remaining_sentences = []
                        used_tokens = 0
                        
                        for idx, sentence in enumerate(sentences):
                            sentence_tokens = self.count_tokens(sentence)
                            if used_tokens + sentence_tokens <= available_tokens:
                                included_sentences.append(sentence)
                                used_tokens += sentence_tokens
                            else:
                                remaining_sentences = sentences[idx:]
                                break
                        
                        if included_sentences:
                            partial_content = " ".join(included_sentences)
                            current_content_parts.append(partial_content)
                            included_pages.append(next_page)
                            current_elements.extend(page_groups[next_page])
                        
                        if remaining_sentences:
                            carryover_text = " ".join(remaining_sentences)
                            carryover_page = next_page
                            # Keep the same page index in the next iteration (for carryover processing)
                        else:
                            i += 1  # Next page completely processed
                    else:
                        # If not enough space, push next page to next chunk
                        pass
            
            # 5. Generate chunk
            if current_content_parts:
                combined_content = "\n".join(current_content_parts)
                
                # Merge metadata
                metadata = self.merge_metadata(current_elements, source, key, uploaded_at)
                metadata["chunk_index"] = chunk_index
                metadata["window_pages"] = list(set(included_pages))  # Deduplicate
                metadata["has_overlap"] = bool(prev_overlap_text)
                
                chunk = {
                    "content": combined_content,
                    "metadata": metadata
                }
                chunks.append(chunk)
                
                # Calculate overlap text for the next chunk
                # Extracted from the tail of the current chunk (excluding overlap marker)
                last_content = current_content_parts[-1] if current_content_parts else ""
                if last_content and not last_content.startswith("[Previous Context]"):
                    prev_overlap_text = self.get_sentence_based_overlap(
                        last_content, 
                        self.overlap_tokens
                    )
                
                chunk_index += 1
            
            # 6. Move to next page (only if there are no carryovers)
            if not carryover_text:
                i += 1
        
        return chunks
    
    def chunk_elements(self, elements: List[Dict[str, Any]], source: str, key: str = "", uploaded_at: str = "") -> List[Dict[str, Any]]:
        """
        Split elements into chunks.
        
        Args:
            elements: List of elements (including content, metadata)
            source: Source filename
            
        Returns:
            Chunk list
        """
        chunks = []
        current_content = ""
        current_elements = []
        overlap_text = ""
        
        for elem in elements:
            content = elem.get("content", "")
            if not content or not content.strip():
                continue
            
            content = content.strip()
            
            # Split long text first
            text_parts = self.split_long_text(content, self.max_chunk_tokens)
            
            for i, part in enumerate(text_parts):
                part_tokens = self.count_tokens(part)
                
                # Calculate current chunk token including overlap text
                if current_content:
                    test_content = current_content + "\n" + part
                elif overlap_text:
                    test_content = overlap_text + "\n" + part
                else:
                    test_content = part
                
                test_tokens = self.count_tokens(test_content)
                
                # If exceeding max_chunk_tokens, save current chunk
                if test_tokens > self.max_chunk_tokens and current_content:
                    # Save current chunk
                    chunk_content = current_content
                    if overlap_text and not current_content.startswith(overlap_text):
                        chunk_content = overlap_text + "\n" + current_content if overlap_text else current_content
                    
                    chunk = {
                        "content": chunk_content.strip(),
                        "metadata": self.merge_metadata(current_elements, source, key, uploaded_at)
                    }
                    chunks.append(chunk)
                    
                    # Calculate overlap
                    overlap_text = self.get_overlap_text(current_content)
                    
                    # Start new chunk
                    current_content = part
                    current_elements = [elem] if i == 0 else []
                else:
                    # Add to current chunk
                    if current_content:
                        current_content = current_content + "\n" + part
                    elif overlap_text:
                        current_content = overlap_text + "\n" + part
                    else:
                        current_content = part
                    
                    if i == 0:  # Only add element on the first part
                        current_elements.append(elem)
        
        # Save final chunk
        if current_content:
            chunk_content = current_content
            chunk = {
                "content": chunk_content.strip(),
                "metadata": self.merge_metadata(current_elements, source, key, uploaded_at)
            }
            chunks.append(chunk)
        
        return chunks
    
    def load_json(self, json_path: str) -> List[Dict[str, Any]]:
        """Load JSON file."""
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    
    def save_chunks(self, chunks: List[Dict[str, Any]], output_path: str) -> None:
        """Save chunks as JSON file."""
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False, indent=2)
    
    def process_file(self, json_path: str, output_dir: Optional[str] = None, uploaded_at: Optional[str] = None) -> str:
        """
        Split JSON file into chunks.
        
        Args:
            json_path: Input JSON file path
            output_dir: Output directory (Same as input path if None)
            uploaded_at: Upload timestamp (use current time if None)
            
        Returns:
            Output file path
        """
        json_path = Path(json_path)
        
        if not json_path.exists():
            raise FileNotFoundError(f"File not found: {json_path}")
        
        print(f"\n{'='*60}")
        print(f"Starting chunking: {json_path.name}")
        print(f"{'='*60}")
        
        # Load JSON
        elements = self.load_json(str(json_path))
        print(f"  - Loaded elements: {len(elements)}")
        
        # Extract source filename
        if elements:
            source = elements[0].get("metadata", {}).get("source", json_path.stem)
            # Extract filename from path
            source = Path(source).name
        else:
            source = json_path.stem
        
        # Generate uploaded_at & key
        if not uploaded_at:
            uploaded_at = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        timestamp_for_id = uploaded_at.replace("-", "").replace("T", "_").replace(":", "")
        source_stem = Path(source).stem
        key = f"{source_stem}_{timestamp_for_id}"
        
        print(f"  - key: {key}")
        print(f"  - uploaded_at: {uploaded_at}")
        
        # Execute chunking
        if self.use_sliding_window:
            print(f"  - Chunking method: Sliding window (Window size: {self.window_size}, Overlap: {self.overlap_pages}  pages)")
            chunks = self.chunk_elements_sliding_window(elements, source, key, uploaded_at)
        else:
            print(f"  - Chunking method: Token based (Min: {self.min_chunk_tokens}, Max: {self.max_chunk_tokens}, Overlap: {self.overlap_tokens}  tokens)")
            chunks = self.chunk_elements(elements, source, key, uploaded_at)
        print(f"  - Generated chunks: {len(chunks)}")
        
        # Stats per chunk
        total_tokens = 0
        for i, chunk in enumerate(chunks):
            tokens = self.count_tokens(chunk["content"])
            total_tokens += tokens
            window_pages = chunk['metadata'].get('window_pages', chunk['metadata'].get('page', []))
            print(f"    - Chunk {i+1}: {tokens} tokens, pages {window_pages}")
        
        print(f"  - Total tokens: {total_tokens}")
        print(f"  - Average chunk tokens: {total_tokens // len(chunks) if chunks else 0}")
        
        # Output path setting
        if output_dir:
            output_dir = Path(output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
        else:
            output_dir = json_path.parent
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = output_dir / f"{json_path.stem}_chunked_{timestamp}.json"
        
        # Save
        self.save_chunks(chunks, str(output_file))
        print(f"  - Output file: {output_file}")
        
        return str(output_file)


def main():
    """CLI Entry Point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Split JSON file elements into chunks for RAG.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example:
  # Chunk single JSON file (Default: Sliding window method)
  python chunking_main.py output/lec6_graph_20260122_215338.json
  
  # Change sliding window size (group by 3 pages, overlap 1 page)
  python chunking_main.py input.json --window-size 3 --overlap-pages 1
  
  # Use token-based chunking
  python chunking_main.py input.json --token-based --min-tokens 500 --max-tokens 800
  
  # Specify output directory
  python chunking_main.py input.json -o chunks/
"""
    )
    
    parser.add_argument(
        "input",
        help="Input JSON file path"
    )
    parser.add_argument(
        "-o", "--output",
        default=None,
        help="Output directory (default: same directory as input file)"
    )
    parser.add_argument(
        "--min-tokens",
        type=int,
        default=800,
        help="Minimum chunk token count (default: 800)"
    )
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=1000,
        help="Maximum chunk token count (default: 1000)"
    )
    parser.add_argument(
        "--overlap",
        type=int,
        default=150,
        help="Overlap token count - used in token-based chunking (default: 150)"
    )
    parser.add_argument(
        "--token-based",
        action="store_true",
        help="Use token-based chunking (default: use sliding window method)"
    )
    parser.add_argument(
        "--window-size",
        type=int,
        default=1,
        help="Sliding window size - number of pages to group (default: 1)"
    )
    parser.add_argument(
        "--overlap-pages",
        type=int,
        default=1,
        help="Overlap page count (default: 1)"
    )
    
    args = parser.parse_args()
    
    chunker = DocumentChunker(
        min_chunk_tokens=args.min_tokens,
        max_chunk_tokens=args.max_tokens,
        overlap_tokens=args.overlap,
        use_sliding_window=not args.token_based,
        window_size=args.window_size,
        overlap_pages=args.overlap_pages
    )
    
    try:
        output_path = chunker.process_file(args.input, args.output)
        print(f"\nDone! Output file: {output_path}")
    except Exception as e:
        print(f"\nError occurred: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
