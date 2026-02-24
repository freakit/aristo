"""
PDF to Text Pipeline for RAG (using unstructured)
PDF 파일을 RAG용 텍스트로 변환하는 메인 파이프라인
"""

import os
import sys
import json
from pathlib import Path
from typing import Optional, List, Callable
from datetime import datetime

from apis.rag.pdf_parser import PDFParser
from apis.rag.element_converter import ElementConverter
from apis.rag.document_merger import DocumentMerger


# Poppler 경로 수동 추가 (환경 변수 미적용 시 대비)
POPPLER_PATH = r"C:\Program Files\poppler\poppler-25.12.0\Library\bin"
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR"
if os.path.exists(POPPLER_PATH) and POPPLER_PATH not in os.environ["PATH"]:
    os.environ["PATH"] += os.pathsep + POPPLER_PATH
if os.path.exists(TESSERACT_PATH) and TESSERACT_PATH not in os.environ["PATH"]:
    os.environ["PATH"] += os.pathsep + TESSERACT_PATH


def process_pdf(
    pdf_path: str,
    output_dir: str = "output",
    image_dir: str = "./figures",
    strategy: str = "hi_res",
    save_chunks: bool = False,
    chunk_size: int = 1000,
    log_callback: Optional[Callable[[str], None]] = None
) -> str:
    """
    PDF 파일을 텍스트로 변환하는 메인 함수
    
    Args:
        pdf_path: PDF 파일 경로
        output_dir: 출력 디렉토리
        image_dir: 이미지 추출 디렉토리
        strategy: 파싱 전략 ("hi_res", "fast", "auto")
        save_chunks: 청크별로 저장할지 여부
        chunk_size: 청크 크기 (문자 수)
        log_callback: 로그 메시지를 전달받을 콜백 함수
        
    Returns:
        출력 파일 경로
    """
    def log(msg: str):
        print(msg)
        if log_callback:
            log_callback(msg)
    
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF 파일을 찾을 수 없습니다: {pdf_path}")
    
    # 출력 디렉토리 생성
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    log(f"[1/3] PDF 파싱 중: {pdf_path.name}")
    
    # 1. PDF 파싱 (unstructured 사용)
    parser = PDFParser(image_output_dir=image_dir)
    parsed_doc = parser.parse(str(pdf_path), strategy=strategy)
    
    # 2. 요소 변환 및 병합
    log(f"[2/3] 요소 변환 중...")
    
    converter = ElementConverter()
    merger = DocumentMerger(converter, log_callback=log_callback)
    
    if save_chunks:
        # 청크 객체 생성
        result_data = merger.create_chunk_objects(parsed_doc, chunk_size=chunk_size)
        log(f"생성된 청크 수: {len(result_data)}")
    else:
        # 일반 요소 객체 생성
        result_data = merger.process_document_to_objects(parsed_doc)
        log(f"변환된 요소 수: {len(result_data)}")
    
    # 3. 결과 저장
    log(f"[3/3] 결과 저장 중...")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = pdf_path.stem
    
    # 이미지 폴더 이동: figures/* -> figures/{timestamp}_{PDF이름}/*
    image_dir_path = Path(image_dir)
    new_image_subdir = image_dir_path / f"{timestamp}_{base_name}"
    
    if image_dir_path.exists():
        # 새 서브디렉토리 생성
        new_image_subdir.mkdir(parents=True, exist_ok=True)
        
        # figures 폴더 내 파일들을 새 폴더로 이동
        import shutil
        for item in image_dir_path.iterdir():
            if item.is_file():
                dest = new_image_subdir / item.name
                shutil.move(str(item), str(dest))
        
        # result_data 내 image_path 업데이트
        for item in result_data:
            if isinstance(item, dict) and "metadata" in item:
                metadata = item["metadata"]
                if "image_path" in metadata:
                    old_path = Path(metadata["image_path"])
                    # 기존 경로에서 파일명만 추출하여 새 경로로 변경
                    new_path = new_image_subdir / old_path.name
                    try:
                        metadata["image_path"] = str(new_path.relative_to(Path.cwd()))
                    except ValueError:
                        metadata["image_path"] = str(new_path)
        
        log(f"이미지 폴더 이동 완료: {new_image_subdir}")
    
    if save_chunks:
        output_file = output_dir / f"{base_name}_{timestamp}_chunks.json"
    else:
        output_file = output_dir / f"{base_name}_{timestamp}.json"
        
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result_data, f, ensure_ascii=False, indent=2)
    
    log(f"출력 파일: {output_file}")
    return str(output_file)


def process_pdf_with_callback(
    pdf_path: str,
    output_dir: str = "output",
    image_dir: str = "./figures",
    strategy: str = "hi_res",
    save_chunks: bool = False,
    chunk_size: int = 1000,
    log_callback: Optional[Callable[[str], None]] = None
) -> str:
    """process_pdf의 별칭 함수 (콜백 지원 명시)"""
    return process_pdf(
        pdf_path=pdf_path,
        output_dir=output_dir,
        image_dir=image_dir,
        strategy=strategy,
        save_chunks=save_chunks,
        chunk_size=chunk_size,
        log_callback=log_callback
    )



def process_directory(
    input_dir: str,
    output_dir: str = "output",
    image_dir: str = "./figures",
    strategy: str = "hi_res"
) -> List[str]:
    """
    디렉토리 내 모든 PDF 파일 처리
    """
    input_dir = Path(input_dir)
    pdf_files = list(input_dir.glob("*.pdf"))
    
    if not pdf_files:
        print(f"PDF 파일을 찾을 수 없습니다: {input_dir}")
        return []
    
    print(f"총 {len(pdf_files)}개의 PDF 파일을 처리합니다.\n")
    
    output_files = []
    for i, pdf_file in enumerate(pdf_files, start=1):
        print(f"\n{'#'*60}")
        print(f"# [{i}/{len(pdf_files)}] 처리 중: {pdf_file.name}")
        print(f"{'#'*60}")
        
        try:
            output_path = process_pdf(
                str(pdf_file),
                output_dir,
                image_dir=image_dir,
                strategy=strategy
            )
            output_files.append(output_path)
        except Exception as e:
            print(f"오류 발생: {e}")
            continue
    
    return output_files


def main():
    """CLI 진입점"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="PDF 파일을 RAG용 텍스트로 변환합니다. (unstructured 사용)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  # 단일 PDF 파일 처리 (고해상도 모드)
  python main.py document.pdf
  
  # 빠른 모드로 처리 (텍스트만)
  python main.py document.pdf --strategy fast
  
  # 디렉토리 내 모든 PDF 처리
  python main.py documents/ -o output/
  
  # 청크로 분할하여 저장
  python main.py document.pdf --chunks --chunk-size 500
"""
    )
    
    parser.add_argument(
        "input",
        help="PDF 파일 경로 또는 PDF가 있는 디렉토리"
    )
    parser.add_argument(
        "-o", "--output",
        default="output",
        help="출력 디렉토리 (기본값: output)"
    )
    parser.add_argument(
        "--image-dir",
        default="./figures",
        help="이미지 추출 디렉토리 (기본값: ./figures)"
    )
    parser.add_argument(
        "--strategy",
        choices=["hi_res", "fast", "auto"],
        default="hi_res",
        help="파싱 전략 (기본값: hi_res)"
    )
    parser.add_argument(
        "--chunks",
        action="store_true",
        help="청크로 분할하여 저장"
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=1000,
        help="청크 크기 (문자 수, 기본값: 1000)"
    )
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    
    if input_path.is_file():
        # 단일 파일 처리
        process_pdf(
            str(input_path),
            args.output,
            args.image_dir,
            args.strategy,
            args.chunks,
            args.chunk_size
        )
    elif input_path.is_dir():
        # 디렉토리 처리
        process_directory(
            str(input_path),
            args.output,
            args.image_dir,
            args.strategy
        )
    else:
        print(f"경로를 찾을 수 없습니다: {input_path}")
        sys.exit(1)


if __name__ == "__main__":
    main()