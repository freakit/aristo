"""
PDF Parser Module (using unstructured)
unstructured 라이브러리를 사용하여 PDF에서 텍스트, 이미지, 표를 추출하는 모듈
"""

from unstructured.partition.pdf import partition_pdf
from dataclasses import dataclass, field
from typing import List, Optional, Any
from pathlib import Path
import os
from PIL import Image


@dataclass
class ParsedElement:
    """파싱된 요소"""
    content: str
    element_type: str  # "text", "image", "table"
    page_number: Optional[int] = None
    image_path: Optional[str] = None  # 이미지인 경우 파일 경로
    metadata: dict = field(default_factory=dict)


@dataclass
class ParsedDocument:
    """파싱된 문서"""
    source_path: str
    elements: List[ParsedElement] = field(default_factory=list)
    image_dir: Optional[str] = None
    
    @property
    def text_elements(self) -> List[ParsedElement]:
        return [e for e in self.elements if e.element_type == "text"]
    
    @property
    def image_elements(self) -> List[ParsedElement]:
        return [e for e in self.elements if e.element_type == "image"]
    
    @property
    def table_elements(self) -> List[ParsedElement]:
        return [e for e in self.elements if e.element_type == "table"]


class PDFParser:
    """PDF 파서 클래스 (unstructured 기반)"""
    
    def __init__(self, image_output_dir: str = "./figures"):
        """
        Args:
            image_output_dir: 이미지 추출 경로
        """
        self.image_output_dir = image_output_dir
    
    def parse(self, pdf_path: str, strategy: str = "hi_res") -> ParsedDocument:
        """
        PDF 파일을 파싱하여 텍스트, 이미지, 표를 추출
        
        Args:
            pdf_path: PDF 파일 경로
            strategy: 파싱 전략 ("hi_res", "fast", "auto")
                - hi_res: 고해상도 모드 (이미지/표 분석에 좋음, 느림)
                - fast: 빠른 모드 (텍스트만)
                - auto: 자동 선택
            
        Returns:
            ParsedDocument: 파싱된 문서 객체
        """
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF 파일을 찾을 수 없습니다: {pdf_path}")
        
        # 이미지 출력 디렉토리 생성
        image_dir = Path(self.image_output_dir)
        image_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"PDF 파싱 중: {pdf_path.name} (전략: {strategy})")
        
        # unstructured로 PDF 파싱
        elements = partition_pdf(
            filename=str(pdf_path),
            strategy=strategy,
            extract_images_in_pdf=True,
            image_output_dir_path=str(image_dir)
        )
        
        # ParsedDocument 생성
        parsed_doc = ParsedDocument(
            source_path=str(pdf_path),
            image_dir=str(image_dir)
        )
        
        # 요소별 처리
        for element in elements:
            parsed_element = self._convert_element(element)
            if parsed_element:
                parsed_doc.elements.append(parsed_element)
        
        print(f"  - 총 요소 수: {len(parsed_doc.elements)}")
        print(f"  - 텍스트: {len(parsed_doc.text_elements)}")
        print(f"  - 이미지: {len(parsed_doc.image_elements)}")
        print(f"  - 표: {len(parsed_doc.table_elements)}")
        
        return parsed_doc
    
    def _convert_element(self, element) -> Optional[ParsedElement]:
        """unstructured 요소를 ParsedElement로 변환"""
        element_type_str = type(element).__name__
        
        # 페이지 번호 추출
        page_number = None
        if hasattr(element, 'metadata') and hasattr(element.metadata, 'page_number'):
            page_number = element.metadata.page_number
        
        # 이미지 요소
        if "Image" in element_type_str:
            image_path = None
            if hasattr(element, 'metadata') and hasattr(element.metadata, 'image_path'):
                image_path = element.metadata.image_path
            
            # 이미지 유효성 검사 및 필터링
            if image_path and os.path.exists(image_path):
                # 1. 파일 크기 확인 (3KB 미만 제거)
                file_size = os.path.getsize(image_path)
                if file_size < 3 * 1024:  # 3KB
                    try:
                        os.remove(image_path)
                        print(f"  [제외] 너무 작은 이미지 파일 삭제: {Path(image_path).name} ({file_size} bytes)")
                    except Exception as e:
                        print(f"  [오류] 파일 삭제 실패: {e}")
                    return None

                # 2. 이미지 차원 확인 (50x50 미만 제거)
                try:
                    with Image.open(image_path) as img:
                        width, height = img.size
                        if width < 50 or height < 50:
                            img.close()  # 윈도우에서 삭제 전 파일 닫기 확인
                            os.remove(image_path)
                            print(f"  [제외] 너무 작은 크기의 이미지 삭제: {Path(image_path).name} ({width}x{height})")
                            return None
                except Exception as e:
                    print(f"  [오류] 이미지 확인 실패: {e}")
                    # 읽을 수 없는 이미지도 제외하는 것이 안전
                    return None
            
            return ParsedElement(
                content="",  # 이미지는 내용 없음, 나중에 Vision API로 설명 생성
                element_type="image",
                page_number=page_number,
                image_path=image_path,
                metadata={"original_type": element_type_str}
            )
        
        # 표 요소
        elif "Table" in element_type_str:
            text_content = element.text if hasattr(element, 'text') else str(element)
            
            # HTML 형식이면 포함
            html_content = None
            if hasattr(element, 'metadata') and hasattr(element.metadata, 'text_as_html'):
                html_content = element.metadata.text_as_html
            
            return ParsedElement(
                content=text_content,
                element_type="table",
                page_number=page_number,
                metadata={
                    "original_type": element_type_str,
                    "html": html_content
                }
            )
        
        # 텍스트 요소 (Title, NarrativeText, ListItem 등)
        else:
            text_content = element.text if hasattr(element, 'text') else str(element)
            
            if text_content.strip():
                return ParsedElement(
                    content=text_content,
                    element_type="text",
                    page_number=page_number,
                    metadata={"original_type": element_type_str}
                )
        
        return None


def main():
    """테스트용 메인 함수"""
    import sys
    
    if len(sys.argv) < 2:
        print("사용법: python pdf_parser.py <pdf_path>")
        return
    
    pdf_path = sys.argv[1]
    parser = PDFParser()
    
    doc = parser.parse(pdf_path)
    
    print(f"\n=== 파싱 결과 ===")
    for i, elem in enumerate(doc.elements[:10]):  # 처음 10개만 출력
        print(f"\n[{i+1}] 타입: {elem.element_type}, 페이지: {elem.page_number}")
        if elem.element_type == "image":
            print(f"    이미지 경로: {elem.image_path}")
        else:
            print(f"    내용: {elem.content[:100]}...")


if __name__ == "__main__":
    main()
