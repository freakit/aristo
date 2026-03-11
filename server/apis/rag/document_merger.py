"""
Document Merger Module
Module for merging converted elements into chunks for RAG
"""

import os
from typing import List, Optional, Callable
from apis.rag.pdf_parser import ParsedDocument, ParsedElement
from apis.rag.element_converter import ElementConverter


class DocumentMerger:
    """Document Merger Class"""
    
    def __init__(
        self, 
        converter: Optional[ElementConverter] = None,
        log_callback: Optional[Callable[[str], None]] = None
    ):
        """
        Args:
            converter: ElementConverter instance (creates new if None)
            log_callback: Callback function to receive log messages
        """
        self.converter = converter or ElementConverter()
        self.log_callback = log_callback
    
    def _log(self, msg: str):
        """Print log message and call callback"""
        print(msg)
        if self.log_callback:
            self.log_callback(msg)
    
    def process_document(self, parsed_doc: ParsedDocument) -> List[str]:
        """
        Convert all elements of parsed document to text
        
        Args:
            parsed_doc: Parsed document object
            
        Returns:
            List of text chunks
        """
        all_chunks = []
        
        total = len(parsed_doc.elements)
        for i, element in enumerate(parsed_doc.elements, start=1):
            self._log(f"Processing element: {i}/{total} ({element.element_type})")
            
            if element.element_type == "image":
                image_summary = self.converter.convert_image(element)
                if image_summary:
                    all_chunks.append(image_summary)
                    
            elif element.element_type == "table":
                table_text = self.converter.convert_table(element)
                if table_text:
                    all_chunks.append(table_text)
                    
            else:
                # Normal text -> unconditionally attempt formula refinement (user request)
                content = element.content.strip()
                if content:
                    refined_content = self.converter.refine_text(content)
                    all_chunks.append(refined_content)
        
        return all_chunks

    def process_document_to_objects(self, parsed_doc: ParsedDocument) -> List[dict]:
        """
        Convert parsed document to JSON serializable object list
        
        Args:
            parsed_doc: Parsed document object
            
        Returns:
            List of objects with metadata
        """
        result_objects = []
        
        total = len(parsed_doc.elements)
        for i, element in enumerate(parsed_doc.elements, start=1):
            self._log(f"Processing element: {i}/{total} ({element.element_type})")
            
            content = ""
            is_refined = False 
            if element.element_type == "image":
                content = self.converter.convert_image(element)
            elif element.element_type == "table":
                content = self.converter.convert_table(element)
            else:
                content = element.content.strip()
                if content:
                    # Apply formula refinement (unconditional)
                    refined_content = self.converter.refine_text(content)
                    if refined_content != content:
                        content = refined_content
                        is_refined = True
                
            if content and content.strip():
                # Construct metadata
                metadata = element.metadata.copy()
                if is_refined:
                    current_type = metadata.get("original_type", str(type(element).__name__))
                    metadata["original_type"] = f"{current_type} (Refined)"
                
                if element.element_type == "image" and element.image_path:
                    # Convert to relative path since it might be absolute path
                    try:
                        rel_path = os.path.relpath(element.image_path)
                        metadata["image_path"] = rel_path
                    except ValueError:
                        # Use original if path conversion fails (e.g., different drive)
                        metadata["image_path"] = element.image_path
                    
                    # Remove existing path key (if any)
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
        Split document into chunk objects with metadata
        
        Args:
            parsed_doc: Parsed document
            chunk_size: Chunk size limit
            
        Returns:
            List of chunk objects
        """
        # Get basic objects
        elements = self.process_document_to_objects(parsed_doc)
        
        chunks = []
        current_chunk_text = []
        current_pages = set()
        current_length = 0
        
        for elem in elements:
            content = elem["content"]
            page = elem["metadata"]["page"]
            length = len(content)
            
            # Save if current chunk is full and has content
            if current_length + length > chunk_size and current_length > 0:
                full_text = "\n\n".join(current_chunk_text)
                
                chunk_obj = {
                    "text": full_text,
                    "pages": sorted(list(current_pages)),
                    "length": len(full_text)
                }
                chunks.append(chunk_obj)
                
                # Initialize buffer
                current_chunk_text = []
                current_pages = set()
                current_length = 0
            
            # Add current element
            current_chunk_text.append(content)
            if page is not None:
                current_pages.add(page)
            current_length += length
            
        # Process remaining buffer
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
        Merge all elements into a single text
        
        Args:
            parsed_doc: Parsed document
            
        Returns:
            Merged full text
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
        Split document into chunks of specified size (for RAG)
        
        Args:
            parsed_doc: Parsed document
            chunk_size: Approximate number of characters per chunk
            overlap: Number of overlapping characters between chunks
            
        Returns:
            List of chunks
        """
        # Convert all elements to text first
        all_chunks = self.process_document(parsed_doc)
        
        # Combine into full text
        full_text = "\n\n".join(all_chunks)
        
        # Split into chunks
        chunks = []
        start = 0
        
        while start < len(full_text):
            end = start + chunk_size
            
            # If chunk end is in the middle of a sentence, extend to next newline
            if end < len(full_text):
                next_newline = full_text.find('\n', end)
                if next_newline != -1 and next_newline - end < 200:
                    end = next_newline
            
            chunk = full_text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Next start position (apply overlap)
            start = end - overlap
        
        return chunks


def main():
    """Main function for testing"""
    from pdf_parser import PDFParser
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python document_merger.py <pdf_path>")
        return
    
    pdf_path = sys.argv[1]
    
    # Parse PDF
    parser = PDFParser()
    parsed_doc = parser.parse(pdf_path)
    
    # Merge document
    merger = DocumentMerger()
    chunks = merger.process_document(parsed_doc)
    
    print(f"\n=== Results ===")
    print(f"Total chunks: {len(chunks)}")
    
    for i, chunk in enumerate(chunks[:5], start=1):
        print(f"\n--- Chunk {i} ---")
        print(chunk[:300] + "..." if len(chunk) > 300 else chunk)


if __name__ == "__main__":
    main()
