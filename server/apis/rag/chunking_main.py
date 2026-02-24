"""
Document Chunker for RAG
JSON 파일의 요소들을 RAG용 청크로 분할하는 모듈
"""

import os
import sys
import json
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
from datetime import datetime

# tiktoken이 설치되어 있으면 사용, 아니면 문자 수 기반 추정
try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False
    print("Warning: tiktoken not installed. Using character-based token estimation.")


class DocumentChunker:
    """
    JSON 파일의 요소들을 청크로 분할하는 클래스
    
    Attributes:
        min_chunk_tokens: 최소 청크 토큰 수 (기본값: 800)
        max_chunk_tokens: 최대 청크 토큰 수 (기본값: 1000)
        overlap_tokens: 오버랩 토큰 수 (기본값: 150)
        use_sliding_window: 슬라이딩 윈도우 방식 사용 여부 (기본값: True)
        window_size: 슬라이딩 윈도우 크기 - 페이지 수 (기본값: 1)
        overlap_pages: 오버랩 페이지 수 (기본값: 1)
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
        
        # tiktoken 인코더 초기화
        if TIKTOKEN_AVAILABLE:
            try:
                self.encoder = tiktoken.encoding_for_model(model)
            except KeyError:
                self.encoder = tiktoken.get_encoding("cl100k_base")
        else:
            self.encoder = None
    
    def count_tokens(self, text: str) -> int:
        """텍스트의 토큰 수를 계산합니다."""
        if self.encoder:
            return len(self.encoder.encode(text))
        else:
            # 문자 수 기반 추정 (1 토큰 ≈ 4 문자)
            return len(text) // 4
    
    def split_into_sentences(self, text: str) -> List[str]:
        """
        텍스트를 문장 단위로 분할합니다.
        
        문장 부호 (. ! ?)로 끝나는 문장을 기준으로 분할하되,
        약어 (e.g., Mr., Dr., etc.)를 고려합니다.
        """
        # 문장 분할 패턴
        # 약어 패턴을 제외하고 . ! ? 뒤에 공백이나 문장 끝이 오는 경우
        sentence_endings = re.compile(r'(?<=[.!?])\s+(?=[A-Z가-힣])|(?<=[.!?])$')
        
        # 먼저 줄바꿈으로 분할
        lines = text.split('\n')
        sentences = []
        
        for line in lines:
            if not line.strip():
                continue
            
            # 문장 부호로 분할
            parts = sentence_endings.split(line)
            for part in parts:
                part = part.strip()
                if part:
                    sentences.append(part)
        
        return sentences
    
    def split_long_text(self, text: str, max_tokens: int) -> List[str]:
        """
        긴 텍스트를 문장 단위로 분할하여 max_tokens 이하로 만듭니다.
        """
        if self.count_tokens(text) <= max_tokens:
            return [text]
        
        sentences = self.split_into_sentences(text)
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            sentence_tokens = self.count_tokens(sentence)
            
            # 단일 문장이 max_tokens보다 긴 경우
            if sentence_tokens > max_tokens:
                # 현재 청크 저장
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""
                
                # 문장을 단어 단위로 분할
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
        """여러 요소의 메타데이터를 병합합니다."""
        types: Set[str] = set()
        pages: Set[int] = set()
        image_paths: List[str] = []
        
        for elem in elements:
            metadata = elem.get("metadata", {})
            
            # type 수집
            elem_type = metadata.get("type")
            if elem_type:
                types.add(elem_type)
            
            # page 수집
            page = metadata.get("page")
            if page is not None:
                pages.add(page)
            
            # image_path 수집
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
        
        # 이미지 경로가 있으면 추가
        if image_paths:
            merged["image_path"] = image_paths if len(image_paths) > 1 else image_paths[0]
        
        return merged
    
    def get_overlap_text(self, text: str) -> str:
        """청크의 마지막 부분에서 오버랩 텍스트를 추출합니다."""
        if self.count_tokens(text) <= self.overlap_tokens:
            return text
        
        sentences = self.split_into_sentences(text)
        if not sentences:
            return ""
        
        # 뒤에서부터 문장을 추가하여 오버랩 토큰 수에 맞춤
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
        요소들을 페이지 번호별로 그룹화합니다.
        
        Args:
            elements: 요소 리스트
            
        Returns:
            페이지 번호를 키로, 해당 페이지의 요소 리스트를 값으로 하는 딕셔너리
        """
        page_groups: Dict[int, List[Dict[str, Any]]] = {}
        
        for elem in elements:
            page = elem.get("metadata", {}).get("page", 0)
            if page not in page_groups:
                page_groups[page] = []
            page_groups[page].append(elem)
        
        return page_groups
    
    def get_page_content(self, page_elements: List[Dict[str, Any]]) -> str:
        """페이지 요소들의 컨텐츠를 합칩니다."""
        content_parts = []
        for elem in page_elements:
            content = elem.get("content", "")
            if content and content.strip():
                content_parts.append(content.strip())
        return "\n".join(content_parts)
    
    def get_sentence_based_overlap(self, text: str, target_tokens: int) -> str:
        """
        토큰 수를 기준으로 문장 단위 오버랩 텍스트를 추출합니다.
        문장 경계를 존중하여 자연스러운 오버랩을 생성합니다.
        
        Args:
            text: 원본 텍스트
            target_tokens: 목표 오버랩 토큰 수
            
        Returns:
            오버랩 텍스트 (문장 단위로 잘림)
        """
        if self.count_tokens(text) <= target_tokens:
            return text
        
        sentences = self.split_into_sentences(text)
        if not sentences:
            return ""
        
        # 뒤에서부터 문장을 추가하여 목표 토큰 수에 맞춤
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
        최대 2페이지 기반 슬라이딩 윈도우 청킹.
        
        동작 방식:
        1. 최대 2페이지까지만 한 청크에 포함
        2. 2페이지 합쳐서 max_tokens 초과 시 → 두 번째 페이지를 문장 단위로 분할
        3. 분할된 뒷부분은 다음 청크로 (오버랩 포함)
        
        예시:
        - Page 4(200토큰) + Page 5(300토큰) = 500토큰 → 한 청크
        - Page 7(500토큰) + Page 8(600토큰) = 1100토큰 > max(1000)
          → Page 7 + Page 8 일부(500토큰) = 1000토큰 청크
          → Page 8 나머지(100토큰) + 오버랩 → 다음 청크로
        
        Args:
            elements: 요소 리스트 (content, metadata 포함)
            source: 소스 파일명
            
        Returns:
            청크 리스트
        """
        # 페이지별로 요소 그룹화
        page_groups = self.group_elements_by_page(elements)
        
        if not page_groups:
            return []
        
        # 페이지 번호 정렬
        sorted_pages = sorted(page_groups.keys())
        total_pages = len(sorted_pages)
        
        # 각 페이지의 컨텐츠와 문장 단위 분할 미리 계산
        page_contents = {}
        page_sentences = {}
        for page_num in sorted_pages:
            content = self.get_page_content(page_groups[page_num])
            page_contents[page_num] = content
            page_sentences[page_num] = self.split_into_sentences(content) if content else []
        
        chunks = []
        chunk_index = 0
        i = 0
        carryover_text = ""  # 이전 페이지에서 넘어온 잘린 텍스트
        carryover_page = None  # 잘린 텍스트가 속한 페이지 번호
        prev_overlap_text = ""  # 오버랩용 텍스트
        
        while i < total_pages:
            current_page = sorted_pages[i]
            current_content_parts = []
            included_pages = []
            current_elements = []
            
            # 1. 오버랩 텍스트 추가 (첫 청크 제외)
            overlap_tokens = 0
            if prev_overlap_text:
                current_content_parts.append(f"[이전 맥락]\n{prev_overlap_text}\n[현재 내용]")
                overlap_tokens = self.count_tokens(prev_overlap_text)
            
            # 2. 이전에서 넘어온 carryover 텍스트가 있으면 먼저 추가
            if carryover_text:
                current_content_parts.append(carryover_text)
                if carryover_page is not None:
                    included_pages.append(carryover_page)
                carryover_text = ""
                carryover_page = None
            
            # 3. 현재 페이지 추가
            page1_content = page_contents[current_page]
            page1_tokens = self.count_tokens(page1_content)
            
            current_content_parts.append(page1_content)
            included_pages.append(current_page)
            current_elements.extend(page_groups[current_page])
            
            current_tokens = self.count_tokens("\n".join(current_content_parts)) - overlap_tokens
            
            # 4. 다음 페이지가 있으면 추가 시도 (window_size까지)
            next_page_idx = i + 1
            if next_page_idx < total_pages and len(included_pages) < self.window_size:
                next_page = sorted_pages[next_page_idx]
                next_content = page_contents[next_page]
                next_tokens = self.count_tokens(next_content)
                
                combined_tokens = current_tokens + next_tokens
                
                if combined_tokens <= self.max_chunk_tokens:
                    # 두 페이지 모두 들어감
                    current_content_parts.append(next_content)
                    included_pages.append(next_page)
                    current_elements.extend(page_groups[next_page])
                    i += 1  # 다음 페이지도 처리됨
                else:
                    # 두 번째 페이지를 문장 단위로 분할
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
                            # 다음 반복에서 같은 페이지 인덱스 유지 (carryover 처리)
                        else:
                            i += 1  # 다음 페이지 완전히 처리됨
                    else:
                        # 공간이 없으면 다음 페이지는 다음 청크로
                        pass
            
            # 5. 청크 생성
            if current_content_parts:
                combined_content = "\n".join(current_content_parts)
                
                # 메타데이터 병합
                metadata = self.merge_metadata(current_elements, source, key, uploaded_at)
                metadata["chunk_index"] = chunk_index
                metadata["window_pages"] = list(set(included_pages))  # 중복 제거
                metadata["has_overlap"] = bool(prev_overlap_text)
                
                chunk = {
                    "content": combined_content,
                    "metadata": metadata
                }
                chunks.append(chunk)
                
                # 다음 청크를 위한 오버랩 텍스트 계산
                # 현재 청크의 마지막 내용에서 추출 (오버랩 마커 제외)
                last_content = current_content_parts[-1] if current_content_parts else ""
                if last_content and not last_content.startswith("[이전 맥락]"):
                    prev_overlap_text = self.get_sentence_based_overlap(
                        last_content, 
                        self.overlap_tokens
                    )
                
                chunk_index += 1
            
            # 6. 다음 페이지로 이동 (carryover가 없는 경우에만)
            if not carryover_text:
                i += 1
        
        return chunks
    
    def chunk_elements(self, elements: List[Dict[str, Any]], source: str, key: str = "", uploaded_at: str = "") -> List[Dict[str, Any]]:
        """
        요소들을 청크로 분할합니다.
        
        Args:
            elements: 요소 리스트 (content, metadata 포함)
            source: 소스 파일명
            
        Returns:
            청크 리스트
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
            
            # 긴 텍스트는 먼저 분할
            text_parts = self.split_long_text(content, self.max_chunk_tokens)
            
            for i, part in enumerate(text_parts):
                part_tokens = self.count_tokens(part)
                
                # 오버랩 텍스트 포함하여 현재 청크 토큰 계산
                if current_content:
                    test_content = current_content + "\n" + part
                elif overlap_text:
                    test_content = overlap_text + "\n" + part
                else:
                    test_content = part
                
                test_tokens = self.count_tokens(test_content)
                
                # max_chunk_tokens 초과 시 현재 청크 저장
                if test_tokens > self.max_chunk_tokens and current_content:
                    # 현재 청크 저장
                    chunk_content = current_content
                    if overlap_text and not current_content.startswith(overlap_text):
                        chunk_content = overlap_text + "\n" + current_content if overlap_text else current_content
                    
                    chunk = {
                        "content": chunk_content.strip(),
                        "metadata": self.merge_metadata(current_elements, source, key, uploaded_at)
                    }
                    chunks.append(chunk)
                    
                    # 오버랩 계산
                    overlap_text = self.get_overlap_text(current_content)
                    
                    # 새 청크 시작
                    current_content = part
                    current_elements = [elem] if i == 0 else []
                else:
                    # 현재 청크에 추가
                    if current_content:
                        current_content = current_content + "\n" + part
                    elif overlap_text:
                        current_content = overlap_text + "\n" + part
                    else:
                        current_content = part
                    
                    if i == 0:  # 첫 번째 파트일 때만 요소 추가
                        current_elements.append(elem)
        
        # 마지막 청크 저장
        if current_content:
            chunk_content = current_content
            chunk = {
                "content": chunk_content.strip(),
                "metadata": self.merge_metadata(current_elements, source, key, uploaded_at)
            }
            chunks.append(chunk)
        
        return chunks
    
    def load_json(self, json_path: str) -> List[Dict[str, Any]]:
        """JSON 파일을 로드합니다."""
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    
    def save_chunks(self, chunks: List[Dict[str, Any]], output_path: str) -> None:
        """청크를 JSON 파일로 저장합니다."""
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False, indent=2)
    
    def process_file(self, json_path: str, output_dir: Optional[str] = None, uploaded_at: Optional[str] = None) -> str:
        """
        JSON 파일을 청크로 분할합니다.
        
        Args:
            json_path: 입력 JSON 파일 경로
            output_dir: 출력 디렉토리 (None이면 입력 파일과 같은 디렉토리)
            uploaded_at: 업로드 시각 (None이면 현재 시각 사용)
            
        Returns:
            출력 파일 경로
        """
        json_path = Path(json_path)
        
        if not json_path.exists():
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {json_path}")
        
        print(f"\n{'='*60}")
        print(f"청킹 시작: {json_path.name}")
        print(f"{'='*60}")
        
        # JSON 로드
        elements = self.load_json(str(json_path))
        print(f"  - 로드된 요소 수: {len(elements)}")
        
        # 소스 파일명 추출
        if elements:
            source = elements[0].get("metadata", {}).get("source", json_path.stem)
            # 경로에서 파일명만 추출
            source = Path(source).name
        else:
            source = json_path.stem
        
        # uploaded_at & key 생성
        if not uploaded_at:
            uploaded_at = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        timestamp_for_id = uploaded_at.replace("-", "").replace("T", "_").replace(":", "")
        source_stem = Path(source).stem
        key = f"{source_stem}_{timestamp_for_id}"
        
        print(f"  - key: {key}")
        print(f"  - uploaded_at: {uploaded_at}")
        
        # 청킹 수행
        if self.use_sliding_window:
            print(f"  - 청킹 방식: 슬라이딩 윈도우 (윈도우 크기: {self.window_size}, 오버랩: {self.overlap_pages} 페이지)")
            chunks = self.chunk_elements_sliding_window(elements, source, key, uploaded_at)
        else:
            print(f"  - 청킹 방식: 토큰 기반 (최소: {self.min_chunk_tokens}, 최대: {self.max_chunk_tokens}, 오버랩: {self.overlap_tokens} 토큰)")
            chunks = self.chunk_elements(elements, source, key, uploaded_at)
        print(f"  - 생성된 청크 수: {len(chunks)}")
        
        # 청크별 통계
        total_tokens = 0
        for i, chunk in enumerate(chunks):
            tokens = self.count_tokens(chunk["content"])
            total_tokens += tokens
            window_pages = chunk['metadata'].get('window_pages', chunk['metadata'].get('page', []))
            print(f"    - 청크 {i+1}: {tokens} 토큰, 페이지 {window_pages}")
        
        print(f"  - 총 토큰 수: {total_tokens}")
        print(f"  - 평균 청크 토큰: {total_tokens // len(chunks) if chunks else 0}")
        
        # 출력 경로 설정
        if output_dir:
            output_dir = Path(output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
        else:
            output_dir = json_path.parent
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = output_dir / f"{json_path.stem}_chunked_{timestamp}.json"
        
        # 저장
        self.save_chunks(chunks, str(output_file))
        print(f"  - 출력 파일: {output_file}")
        
        return str(output_file)


def main():
    """CLI 진입점"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="JSON 파일의 요소들을 RAG용 청크로 분할합니다.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  # 단일 JSON 파일 청킹 (기본: 슬라이딩 윈도우 방식)
  python chunking_main.py output/lec6_graph_20260122_215338.json
  
  # 슬라이딩 윈도우 크기 변경 (3페이지씩 묶기, 1페이지 오버랩)
  python chunking_main.py input.json --window-size 3 --overlap-pages 1
  
  # 토큰 기반 청킹 사용
  python chunking_main.py input.json --token-based --min-tokens 500 --max-tokens 800
  
  # 출력 디렉토리 지정
  python chunking_main.py input.json -o chunks/
"""
    )
    
    parser.add_argument(
        "input",
        help="입력 JSON 파일 경로"
    )
    parser.add_argument(
        "-o", "--output",
        default=None,
        help="출력 디렉토리 (기본값: 입력 파일과 같은 디렉토리)"
    )
    parser.add_argument(
        "--min-tokens",
        type=int,
        default=800,
        help="최소 청크 토큰 수 (기본값: 800)"
    )
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=1000,
        help="최대 청크 토큰 수 (기본값: 1000)"
    )
    parser.add_argument(
        "--overlap",
        type=int,
        default=150,
        help="오버랩 토큰 수 - 토큰 기반 청킹에서 사용 (기본값: 150)"
    )
    parser.add_argument(
        "--token-based",
        action="store_true",
        help="토큰 기반 청킹 사용 (기본값: 슬라이딩 윈도우 방식 사용)"
    )
    parser.add_argument(
        "--window-size",
        type=int,
        default=1,
        help="슬라이딩 윈도우 크기 - 묶을 페이지 수 (기본값: 1)"
    )
    parser.add_argument(
        "--overlap-pages",
        type=int,
        default=1,
        help="오버랩 페이지 수 (기본값: 1)"
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
        print(f"\n완료! 출력 파일: {output_path}")
    except Exception as e:
        print(f"\n오류 발생: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
