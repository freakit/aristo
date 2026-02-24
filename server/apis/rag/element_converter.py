"""
Element Converter Module
이미지를 Gemini Vision API로 텍스트 설명으로 변환하는 모듈
"""

import os
import base64
from typing import Optional
from pathlib import Path
from google import genai
from google.genai import types
from dotenv import load_dotenv

from apis.rag.pdf_parser import ParsedElement

# 환경 변수 로드
load_dotenv()


class ElementConverter:
    """요소를 텍스트로 변환하는 클래스 (Gemini 전용)"""
    
    def __init__(self):
        """Gemini 클라이언트 초기화"""
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_client = None
        
        if self.gemini_api_key:
            self.gemini_client = genai.Client(api_key=self.gemini_api_key)
    
    def convert(self, element: ParsedElement) -> str:
        """
        요소를 텍스트로 변환
        
        Args:
            element: 파싱된 요소
            
        Returns:
            텍스트 내용
        """
        if element.element_type == "image":
            return self.convert_image(element)
        elif element.element_type == "table":
            return self.convert_table(element)
        else:
            return element.content
    
    def classify_image(self, image_path: Path) -> str:
        """
        이미지가 콘텐츠인지 장식인지 분류
        
        Args:
            image_path: 이미지 파일 경로
            
        Returns:
            'CONTENT' (교육 콘텐츠) 또는 'DECORATIVE' (로고, 장식 등)
        """
        if not self.gemini_client:
            # 분류 불가 시 기본적으로 콘텐츠로 간주
            return "CONTENT"
        
        try:
            with open(image_path, "rb") as f:
                image_bytes = f.read()
            
            suffix = image_path.suffix.lower()
            mime_types = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            }
            mime_type = mime_types.get(suffix, 'image/png')
            
            classification_prompt = """Classify this image into ONE of these categories:
            
CONTENT: Educational content such as diagrams, graphs, code snippets, mathematical formulas, tables, charts, conceptual illustrations, or lecture slides with meaningful text.

DECORATIVE: Publisher logos, company logos, watermarks, page decorations, icons without context, empty or mostly blank images, copyright notices, or book covers.

Reply with ONLY one word: CONTENT or DECORATIVE"""

            response = self.gemini_client.models.generate_content(
                model="gemini-2.5-flash-lite",  # 빠르고 저렴한 모델 사용
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                            types.Part.from_text(text=classification_prompt)
                        ]
                    )
                ],
                config=types.GenerateContentConfig(
                    http_options={"timeout": 10000}  # 10초 타임아웃
                )
            )
            
            result = response.text.strip().upper()
            if "DECORATIVE" in result:
                return "DECORATIVE"
            return "CONTENT"
            
        except Exception as e:
            print(f"이미지 분류 실패 ({image_path.name}): {e}")
            # 분류 실패 시 기본적으로 콘텐츠로 간주
            return "CONTENT"
    
    def convert_image(self, element: ParsedElement) -> str:
        """
        이미지를 텍스트 설명으로 변환 (Gemini Vision 사용)
        
        Args:
            element: 이미지 요소
            
        Returns:
            이미지에 대한 텍스트 설명
        """
        if not element.image_path:
            return "[이미지: 경로 없음]"
        
        image_path = Path(element.image_path)
        if not image_path.exists():
            return f"[이미지: 파일 없음 - {element.image_path}]"
        
        # 이미지 분류: DECORATIVE면 건너뛰기
        classification = self.classify_image(image_path)
        if classification == "DECORATIVE":
            print(f"  → 이미지 건너뜀 (DECORATIVE): {image_path.name}")
            return ""  # 빈 문자열 반환하여 결과에서 제외
        
        if not self.gemini_client:
            return f"[이미지: {image_path.name}] (Gemini API 키 없음 - 설명 생성 불가)"
        
        try:
            # 이미지를 base64로 인코딩
            with open(image_path, "rb") as f:
                image_data = f.read()
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            # 이미지 MIME 타입 결정
            suffix = image_path.suffix.lower()
            mime_types = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            }
            mime_type = mime_types.get(suffix, 'image/png')
            
            model_name = "gemini-3-flash-preview"
            
            # Base64 디코딩하여 바이트로 변환
            image_bytes = base64.b64decode(base64_image)
            
            prompt = """You are an OCR model specialized in transcribing handwritten or typed lecture notes with high accuracy.

Your task is to extract only the essential lecture content from the provided document, following these strict guidelines:

📌 Transcription Rules – Follow Exactly:
1. Preserve all original line breaks and the layout of the text.
2. Convert all mathematical expressions into proper LaTeX syntax.
3. If the content includes any visual elements, describe them using the appropriate tag format below:
   - Use [Image]: for general diagrams, illustrations, or conceptual sketches.
     Format: [Image]: 'Clear and concise description of the visual, including visible text, structure, and logical relationships.'
   - Use [Graph]: for coordinate plots, curves, or any figure displaying a mathematical relationship between variables.
     Format: [Graph]: 'Describe axes, plotted lines/functions, labels, trends, and any annotations.'
   - Use [Table]: for tabular data or matrix-style presentations.
     Format: [Table]: 'Summarize the row/column headers, structure, and key values.'
4. Do not transcribe text or equations directly from any visual content—describe them using the appropriate tag above.
5. If any part of the content is hard to read or ambiguous, mark it as: [unclear]
6. Remove all metadata such as page numbers, section titles, headers, and footers unless they are part of the core lecture text.
7. ⚠️ Additionally, remove any problems, exercises, or example questions that do not have a solution provided in the document.

8. **Classification**:
   - If the image contains ONLY text (like code snippets, simple lists, slide text) and NO diagrams/visuals:
     - Start your response with `[TEXT_ONLY]`.
     - Provide ONLY the transcription. No [Image] tags.
   - If visual elements exist:
     - Follow standard rules.

RAG 시스템에서 검색될 수 있도록 구체적인 용어와 내용을 포함하세요."""

            response = self.gemini_client.models.generate_content(
                model=model_name,
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                            types.Part.from_text(text=prompt)
                        ]
                    )
                ],
                config=types.GenerateContentConfig(
                    http_options={"timeout": 30000}  # 30 seconds timeout for image processing
                )
            )
            description = response.text
            if description.startswith("[TEXT_ONLY]"):
                 element.metadata["original_type"] = "ImageText"
                 return description.replace("[TEXT_ONLY]", "").strip()
            return f"{description}"
                
        except Exception as e:
            print(f"이미지 변환 실패 ({image_path.name}): {e}")
            return f"[이미지: {image_path.name}] (변환 실패: {str(e)[:50]})"
    
    def convert_table(self, element: ParsedElement) -> str:
        """
        표 요소를 텍스트로 변환
        
        Args:
            element: 표 요소
            
        Returns:
            표의 텍스트 표현
        """
        result_parts = ["[표]"]
        
        # HTML 형식이 있으면 추가
        if element.metadata.get("html"):
            result_parts.append(f"HTML: {element.metadata['html']}")
        
        # 텍스트 내용
        if element.content:
            result_parts.append(element.content)
        
        return "\n".join(result_parts)
    
    def refine_text(self, text: str) -> str:
        """
        텍스트 내의 수식을 LaTeX 형식으로 변환하고 텍스트를 다듬음
        
        Args:
            text: 원본 텍스트
            
        Returns:
            다듬어진 텍스트
        """
        if not text or not text.strip():
            return text
        
        if not self.gemini_client:
            return text
            
        prompt = """You are a text formatter specialized in scientific and mathematical documents.
Your task is to identify any mathematical expressions, equations, or symbols in the following text and convert them into proper LaTeX syntax.

Rules:
1. Preserve the non-mathematical text EXACTLY as it is. Do not summarize or rewrite sentences.
2. Convert ALL mathematical expressions to LaTeX (e.g., "x^2", "\\sum", "\\Theta(n)").
3. Do not add any conversational filler like "Here is the refined text". Just return the result.
4. If there are no mathematical expressions, return the text exactly as it is.

Text to refine:
""" + text

        max_retries = 3
        
        try:
            model_name = "gemini-2.5-flash-lite"
            
            for attempt in range(max_retries):
                try:
                    response = self.gemini_client.models.generate_content(
                        model=model_name,
                        contents=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
                        config=types.GenerateContentConfig(
                            http_options={"timeout": 20000}  # 20 seconds timeout
                        )
                    )
                    return response.text.strip()
                except Exception as retry_e:
                    error_str = str(retry_e)
                    if "DEADLINE_EXCEEDED" in error_str or "504" in error_str:
                        if attempt < max_retries - 1:
                            print(f"텍스트 정제 타임아웃, 재시도 중... ({attempt + 1}/{max_retries})")
                            import time
                            time.sleep(1)  # 1초 대기 후 재시도
                            continue
                    raise retry_e
            
        except Exception as e:
            print(f"텍스트 정제 실패: {e}")
            return text
        
        return text


def get_image_summary(image_path: str) -> str:
    """
    이미지를 Gemini로 설명하는 헬퍼 함수
    
    Args:
        image_path: 이미지 파일 경로
    
    Returns:
        이미지 설명 텍스트
    """
    converter = ElementConverter()
    element = ParsedElement(
        content="",
        element_type="image",
        image_path=image_path
    )
    return converter.convert_image(element)


def main():
    """테스트용 메인 함수"""
    import sys
    
    if len(sys.argv) < 2:
        print("사용법: python element_converter.py <image_path>")
        return
    
    image_path = sys.argv[1]
    result = get_image_summary(image_path)
    print(result)


if __name__ == "__main__":
    main()
