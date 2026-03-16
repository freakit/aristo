"""
PDF to Text Pipeline for RAG (using unstructured)
Main pipeline to convert PDF files into text for RAG
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


# Manually add Poppler path (fallback if env var not applied)
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
    Main function to convert PDF files into text
    
    Args:
        pdf_path: PDF file path
        output_dir: Output directory
        image_dir: Image extraction directory
        strategy: Parsing strategy ("hi_res", "fast", "auto")
        save_chunks: Whether to save in chunks
        chunk_size: Chunk size (character count)
        log_callback: Callback function for log messages
        
    Returns:
        Output file path
    """
    def log(msg: str):
        print(msg)
        if log_callback:
            log_callback(msg)
    
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    # Create output directory
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    log(f"[1/3] Parsing PDF: {pdf_path.name}")
    
    # 1. Parse PDF (using unstructured)
    parser = PDFParser(image_output_dir=image_dir)
    parsed_doc = parser.parse(str(pdf_path), strategy=strategy)
    
    # 2. Element conversion and merging
    log(f"[2/3] Converting elements...")
    
    converter = ElementConverter()
    merger = DocumentMerger(converter, log_callback=log_callback)
    
    if save_chunks:
        # Create chunk objects
        result_data = merger.create_chunk_objects(parsed_doc, chunk_size=chunk_size)
        log(f"Generated chunks: {len(result_data)}")
    else:
        # Create general element objects
        result_data = merger.process_document_to_objects(parsed_doc)
        log(f"Converted elements: {len(result_data)}")
    
    # 3. Save results
    log(f"[3/3] Saving results...")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = pdf_path.stem
    
    # Move image folder: figures/* -> figures/{timestamp}_{PDF_name}/*
    image_dir_path = Path(image_dir)
    new_image_subdir = image_dir_path / f"{timestamp}_{base_name}"
    
    if image_dir_path.exists():
        # Create new subdirectory
        new_image_subdir.mkdir(parents=True, exist_ok=True)
        
        # Move files from figures folder to the new folder
        import shutil
        for item in image_dir_path.iterdir():
            if item.is_file():
                dest = new_image_subdir / item.name
                shutil.move(str(item), str(dest))
        
        # Update image_path in result_data
        for item in result_data:
            if isinstance(item, dict) and "metadata" in item:
                metadata = item["metadata"]
                if "image_path" in metadata:
                    old_path = Path(metadata["image_path"])
                    # Extract only the filename from the old path and update to the new path
                    new_path = new_image_subdir / old_path.name
                    try:
                        metadata["image_path"] = str(new_path.relative_to(Path.cwd()))
                    except ValueError:
                        metadata["image_path"] = str(new_path)
        
        log(f"Image folder move complete: {new_image_subdir}")
    
    if save_chunks:
        output_file = output_dir / f"{base_name}_{timestamp}_chunks.json"
    else:
        output_file = output_dir / f"{base_name}_{timestamp}.json"
        
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result_data, f, ensure_ascii=False, indent=2)
    
    log(f"Output file: {output_file}")
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
    """Alias for process_pdf (explicit callback support)"""
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
    Process all PDF files in directory
    """
    input_dir = Path(input_dir)
    pdf_files = list(input_dir.glob("*.pdf"))
    
    if not pdf_files:
        print(f"No PDF files found: {input_dir}")
        return []
    
    print(f"Processing a total of {len(pdf_files)} PDF files.\n")
    
    output_files = []
    for i, pdf_file in enumerate(pdf_files, start=1):
        print(f"\n{'#'*60}")
        print(f"# [{i}/{len(pdf_files)}] Processing: {pdf_file.name}")
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
            print(f"Error occurred: {e}")
            continue
    
    return output_files


def main():
    """CLI Entry Point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Converts PDF files into text for RAG (using unstructured).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example:
  # Process single PDF file (Hi-Res mode)
  python main.py document.pdf
  
  # Process in fast mode (text only)
  python main.py document.pdf --strategy fast
  
  # Process all PDFs in directory
  python main.py documents/ -o output/
  
  # Save in chunks
  python main.py document.pdf --chunks --chunk-size 500
"""
    )
    
    parser.add_argument(
        "input",
        help="Path to PDF file or directory containing PDFs"
    )
    parser.add_argument(
        "-o", "--output",
        default="output",
        help="Output directory (default: output)"
    )
    parser.add_argument(
        "--image-dir",
        default="./figures",
        help="Image extraction directory (default: ./figures)"
    )
    parser.add_argument(
        "--strategy",
        choices=["hi_res", "fast", "auto"],
        default="hi_res",
        help="Parsing strategy (default: hi_res)"
    )
    parser.add_argument(
        "--chunks",
        action="store_true",
        help="Split and save as chunks"
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=1000,
        help="Chunk size (character count, default: 1000)"
    )
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    
    if input_path.is_file():
        # Process single file
        process_pdf(
            str(input_path),
            args.output,
            args.image_dir,
            args.strategy,
            args.chunks,
            args.chunk_size
        )
    elif input_path.is_dir():
        # Process directory
        process_directory(
            str(input_path),
            args.output,
            args.image_dir,
            args.strategy
        )
    else:
        print(f"Path not found: {input_path}")
        sys.exit(1)


if __name__ == "__main__":
    main()