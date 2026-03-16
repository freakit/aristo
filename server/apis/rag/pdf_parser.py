"""
PDF Parser Module (using unstructured)
Module for extracting text, images, and tables from PDF using unstructured library
"""

from unstructured.partition.pdf import partition_pdf
from dataclasses import dataclass, field
from typing import List, Optional, Any
from pathlib import Path
import os
from PIL import Image


@dataclass
class ParsedElement:
    """Parsed element"""
    content: str
    element_type: str  # "text", "image", "table"
    page_number: Optional[int] = None
    image_path: Optional[str] = None  # File path if image
    metadata: dict = field(default_factory=dict)


@dataclass
class ParsedDocument:
    """Parsed document"""
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
    """PDF Parser Class (unstructured based)"""
    
    def __init__(self, image_output_dir: str = "./figures"):
        """
        Args:
            image_output_dir: Image extraction path
        """
        self.image_output_dir = image_output_dir
    
    def parse(self, pdf_path: str, strategy: str = "hi_res") -> ParsedDocument:
        """
        Parse PDF file and extract text, images, and tables
        
        Args:
            pdf_path: PDF file path
            strategy: Parsing strategy ("hi_res", "fast", "auto")
                - hi_res: High resolution mode (good for image/table analysis, slow)
                - fast: Fast mode (text only)
                - auto: Automatic selection
            
        Returns:
            ParsedDocument: Parsed document object
        """
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        # Create image output directory
        image_dir = Path(self.image_output_dir)
        image_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"Parsing PDF: {pdf_path.name} (Strategy: {strategy})")
        
        # Parse PDF with unstructured
        elements = partition_pdf(
            filename=str(pdf_path),
            strategy=strategy,
            extract_images_in_pdf=True,
            image_output_dir_path=str(image_dir)
        )
        
        # Create ParsedDocument
        parsed_doc = ParsedDocument(
            source_path=str(pdf_path),
            image_dir=str(image_dir)
        )
        
        # Process per element
        for element in elements:
            parsed_element = self._convert_element(element)
            if parsed_element:
                parsed_doc.elements.append(parsed_element)
        
        print(f"  - Total elements: {len(parsed_doc.elements)}")
        print(f"  - Text: {len(parsed_doc.text_elements)}")
        print(f"  - Images: {len(parsed_doc.image_elements)}")
        print(f"  - Tables: {len(parsed_doc.table_elements)}")
        
        return parsed_doc
    
    def _convert_element(self, element) -> Optional[ParsedElement]:
        """Convert unstructured element to ParsedElement"""
        element_type_str = type(element).__name__
        
        # Extract page number
        page_number = None
        if hasattr(element, 'metadata') and hasattr(element.metadata, 'page_number'):
            page_number = element.metadata.page_number
        
        # Image element
        if "Image" in element_type_str:
            image_path = None
            if hasattr(element, 'metadata') and hasattr(element.metadata, 'image_path'):
                image_path = element.metadata.image_path
            
            # Image validation and filtering
            if image_path and os.path.exists(image_path):
                # 1. Check file size (remove if under 3KB)
                file_size = os.path.getsize(image_path)
                if file_size < 3 * 1024:  # 3KB
                    try:
                        os.remove(image_path)
                        print(f"  [Skip] Delete image file that's too small: {Path(image_path).name} ({file_size} bytes)")
                    except Exception as e:
                        print(f"  [Error] Failed to delete file: {e}")
                    return None

                # 2. Check image dimensions (remove if under 50x50)
                try:
                    with Image.open(image_path) as img:
                        width, height = img.size
                        if width < 50 or height < 50:
                            img.close()  # In Windows Confirm file close before delete
                            os.remove(image_path)
                            print(f"  [Skip] Delete image that's too small: {Path(image_path).name} ({width}x{height})")
                            return None
                except Exception as e:
                    print(f"  [Error] Failed to check image: {e}")
                    # It's safer to exclude unreadable images as well
                    return None
            
            return ParsedElement(
                content="",  # Image has no content, generate description later with Vision API
                element_type="image",
                page_number=page_number,
                image_path=image_path,
                metadata={"original_type": element_type_str}
            )
        
        # Table element
        elif "Table" in element_type_str:
            text_content = element.text if hasattr(element, 'text') else str(element)
            
            # Include if HTML format
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
        
        # Text element (Title, NarrativeText, ListItem, etc.)
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
    """Main function for testing"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python pdf_parser.py <pdf_path>")
        return
    
    pdf_path = sys.argv[1]
    parser = PDFParser()
    
    doc = parser.parse(pdf_path)
    
    print(f"\n=== Parsing Results ===")
    for i, elem in enumerate(doc.elements[:10]):  # Print first 10 only
        print(f"\n[{i+1}] Type: {elem.element_type}, Page: {elem.page_number}")
        if elem.element_type == "image":
            print(f"    Image Path: {elem.image_path}")
        else:
            print(f"    Content: {elem.content[:100]}...")


if __name__ == "__main__":
    main()
