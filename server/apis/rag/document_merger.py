"""
Document Merger Module
변환된 요소들을 병합하여 RAG용 청크로 만드는 모듈
"""

import os
from typing import List, Optional, Callable
from apis.rag.pdf_parser import ParsedDocument, ParsedElement
from apis.rag.element_converter import ElementConverter


class DocumentMerger:
    """문서 병합 클래스"""
    
    def __init__(
        self, 
        converter: Optional[ElementConverter] = None,
        log_callback: Optional[Callable[[str], None]] = None
    ):
        """
        Args:
            converter: ElementConverter 인스턴스 (없으면 새로 생성)
            log_callback: 로그 메시지를 전달받을 콜백 함수
        """
        self.converter = converter or ElementConverter()
        self.log_callback = log_callback
    
    def _log(self, msg: str):
        """로그 메시지 출력 및 콜백 호출"""
        print(msg)
        if self.log_callback:
            self.log_callback(msg)
    
    def process_document(self, parsed_doc: ParsedDocument) -> List[str]:
        """
        파싱된 문서의 모든 요소를 텍스트로 변환
        
        Args:
            parsed_doc: 파싱된 문서 객체
            
        Returns:
            텍스트 청크 리스트
        """
        all_chunks = []
        
        total = len(parsed_doc.elements)
        for i, element in enumerate(parsed_doc.elements, start=1):
            self._log(f"요소 처리 중: {i}/{total} ({element.element_type})")
            
            if element.element_type == "image":
                image_summary = self.converter.convert_image(element)
                if image_summary:
                    all_chunks.append(image_summary)
                    
            elif element.element_type == "table":
                table_text = self.converter.convert_table(element)
                if table_text:
                    all_chunks.append(table_text)
                    
            else:
                # 일반 텍스트 -> 무조건 수식 정제 시도 (사용자 요청)
                content = element.content.strip()
                if content:
                    refined_content = self.converter.refine_text(content)
                    all_chunks.append(refined_content)
        
        return all_chunks

    def process_document_to_objects(self, parsed_doc: ParsedDocument) -> List[dict]:
        """
        파싱된 문서를 JSON 직렬화 가능한 객체 리스트로 변환
        
        Args:
            parsed_doc: 파싱된 문서 객체
            
        Returns:
            메타데이터가 포함된 객체 리스트
        """
        result_objects = []
        
        total = len(parsed_doc.elements)
        for i, element in enumerate(parsed_doc.elements, start=1):
            self._log(f"요소 처리 중: {i}/{total} ({element.element_type})")
            
            content = ""
            is_refined = False 
            if element.element_type == "image":
                content = self.converter.convert_image(element)
            elif element.element_type == "table":
                content = self.converter.convert_table(element)
            else:
                content = element.content.strip()
                if content:
                    # 수식 정제 적용 (무조건)
                    refined_content = self.converter.refine_text(content)
                    if refined_content != content:
                        content = refined_content
                        is_refined = True
                
            if content and content.strip():
                # 메타데이터 구성
                metadata = element.metadata.copy()
                if is_refined:
                    current_type = metadata.get("original_type", str(type(element).__name__))
                    metadata["original_type"] = f"{current_type} (Refined)"
                
                if element.element_type == "image" and element.image_path:
                    # 절대 경로일 수 있으므로 상대 경로로 변환
                    try:
                        rel_path = os.path.relpath(element.image_path)
                        metadata["image_path"] = rel_path
                    except ValueError:
                        # 경로 변환 실패 시 (드라이브가 다른 경우 등) 원본 사용
                        metadata["image_path"] = element.image_path
                    
                    # 기존 path 키 제거 (있다면)
                    if "path" in metadata:
                        del metadata["path"]

                metadata.update({
                    "source": parsed_doc.source_path,
                    "page": element.page_number,
                    "type": element.element_type
                })
                
                obj = {
                    "content": content,
                    "metadata": metadata
                }
                result_objects.append(obj)
        
        return result_objects
    
        return result_objects
    
    def create_chunk_objects(
        self, 
        parsed_doc: ParsedDocument, 
        chunk_size: int = 1000
    ) -> List[dict]:
        """
        문서를 메타데이터가 포함된 청크 객체로 분할
        
        Args:
            parsed_doc: 파싱된 문서
            chunk_size: 청크 크기 제한
            
        Returns:
            청크 객체 리스트
        """
        # 기본 객체들 가져오기
        elements = self.process_document_to_objects(parsed_doc)
        
        chunks = []
        current_chunk_text = []
        current_pages = set()
        current_length = 0
        
        for elem in elements:
            content = elem["content"]
            page = elem["metadata"]["page"]
            length = len(content)
            
            # 현재 청크가 꽉 찼고, 내용이 있는 경우 저장
            if current_length + length > chunk_size and current_length > 0:
                full_text = "\n\n".join(current_chunk_text)
                
                chunk_obj = {
                    "text": full_text,
                    "pages": sorted(list(current_pages)),
                    "length": len(full_text)
                }
                chunks.append(chunk_obj)
                
                # 버퍼 초기화
                current_chunk_text = []
                current_pages = set()
                current_length = 0
            
            # 현재 요소 추가
            current_chunk_text.append(content)
            if page is not None:
                current_pages.add(page)
            current_length += length
            
        # 남은 버퍼 처리
        if current_chunk_text:
            full_text = "\n\n".join(current_chunk_text)
            chunk_obj = {
                "text": full_text,
                "pages": sorted(list(current_pages)),
                "length": len(full_text)
            }
            chunks.append(chunk_obj)
            
        return chunks

    def merge_to_text(self, parsed_doc: ParsedDocument) -> str:
        """
        모든 요소를 하나의 텍스트로 병합
        
        Args:
            parsed_doc: 파싱된 문서
            
        Returns:
            병합된 전체 텍스트
        """
        chunks = self.process_document(parsed_doc)
        return "\n\n".join(chunks)
    
    def merge_to_chunks(
        self, 
        parsed_doc: ParsedDocument, 
        chunk_size: int = 1000,
        overlap: int = 100
    ) -> List[str]:
        """
        문서를 지정된 크기의 청크로 분할 (RAG용)
        
        Args:
            parsed_doc: 파싱된 문서
            chunk_size: 청크당 대략적인 문자 수
            overlap: 청크 간 겹침 문자 수
            
        Returns:
            청크 리스트
        """
        # 먼저 모든 요소를 텍스트로 변환
        all_chunks = self.process_document(parsed_doc)
        
        # 전체 텍스트로 합치기
        full_text = "\n\n".join(all_chunks)
        
        # 청크로 분할
        chunks = []
        start = 0
        
        while start < len(full_text):
            end = start + chunk_size
            
            # 청크 끝이 문장 중간이면 다음 줄바꿈까지 확장
            if end < len(full_text):
                next_newline = full_text.find('\n', end)
                if next_newline != -1 and next_newline - end < 200:
                    end = next_newline
            
            chunk = full_text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # 다음 시작 위치 (겹침 적용)
            start = end - overlap
        
        return chunks


def main():
    """테스트용 메인 함수"""
    from pdf_parser import PDFParser
    import sys
    
    if len(sys.argv) < 2:
        print("사용법: python document_merger.py <pdf_path>")
        return
    
    pdf_path = sys.argv[1]
    
    # PDF 파싱
    parser = PDFParser()
    parsed_doc = parser.parse(pdf_path)
    
    # 문서 병합
    merger = DocumentMerger()
    chunks = merger.process_document(parsed_doc)
    
    print(f"\n=== 결과 ===")
    print(f"총 청크 수: {len(chunks)}")
    
    for i, chunk in enumerate(chunks[:5], start=1):
        print(f"\n--- 청크 {i} ---")
        print(chunk[:300] + "..." if len(chunk) > 300 else chunk)


if __name__ == "__main__":
    main()
