"""
Element Converter Module
Module that converts images to text descriptions using Gemini Vision API
"""

import os
import base64
from typing import Optional
from pathlib import Path
from google import genai
from google.genai import types
from dotenv import load_dotenv

from apis.rag.pdf_parser import ParsedElement

# Load environment variables
load_dotenv()


class ElementConverter:
    """Class that converts elements to text (Gemini only)"""
    
    def __init__(self):
        """Initialize Gemini client"""
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_client = None
        
        if self.gemini_api_key:
            self.gemini_client = genai.Client(api_key=self.gemini_api_key)
    
    def convert(self, element: ParsedElement) -> str:
        """
        Convert element to text
        
        Args:
            element: Parsed element
            
        Returns:
            Text content
        """
        if element.element_type == "image":
            return self.convert_image(element)
        elif element.element_type == "table":
            return self.convert_table(element)
        else:
            return element.content
    
    def classify_image(self, image_path: Path) -> str:
        """
        Classify whether image is content or decorative
        
        Args:
            image_path: Image file path
            
        Returns:
            'CONTENT' (Educational content) or 'DECORATIVE' (logos, decorations, etc.)
        """
        if not self.gemini_client:
            # Assume content by default if classification fails
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
                model="gemini-3.1-flash-lite-preview",  # Use fast and cheap model
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
                    http_options={"timeout": 10000}  # 10 seconds timeout
                )
            )
            
            result = response.text.strip().upper()
            if "DECORATIVE" in result:
                return "DECORATIVE"
            return "CONTENT"
            
        except Exception as e:
            print(f"Image classification failed ({image_path.name}): {e}")
            # Assume content by default if classification fails
            return "CONTENT"
    
    def convert_image(self, element: ParsedElement) -> str:
        """
        Convert image to text description (using Gemini Vision)
        
        Args:
            element: Image element
            
        Returns:
            Text description for the image
        """
        if not element.image_path:
            return "[Image: No path]"
        
        image_path = Path(element.image_path)
        if not image_path.exists():
            return f"[Image: File not found - {element.image_path}]"
        
        # Image classification: skip if DECORATIVE
        classification = self.classify_image(image_path)
        if classification == "DECORATIVE":
            print(f"  -> Skipping image (DECORATIVE): {image_path.name}")
            return ""  # Return empty string to exclude from result
        
        if not self.gemini_client:
            return f"[Image: {image_path.name}] (No Gemini API key - cannot generate description)"
        
        try:
            # Encode image as base64
            with open(image_path, "rb") as f:
                image_data = f.read()
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            # Determine image MIME type
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
            
            # Decode Base64 to bytes
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

Include specific terms and details so it can be searched in the RAG system."""

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
            print(f"Image conversion failed ({image_path.name}): {e}")
            return f"[Image: {image_path.name}] (Conversion failed: {str(e)[:50]})"
    
    def convert_table(self, element: ParsedElement) -> str:
        """
        Convert table element to text
        
        Args:
            element: Table element
            
        Returns:
            Text representation of the table
        """
        result_parts = ["[Table]"]
        
        # Add HTML format if present
        if element.metadata.get("html"):
            result_parts.append(f"HTML: {element.metadata['html']}")
        
        # Text content
        if element.content:
            result_parts.append(element.content)
        
        return "\n".join(result_parts)
    
    def refine_text(self, text: str) -> str:
        """
        Convert formulas in text to LaTeX format and refine text
        
        Args:
            text: Original text
            
        Returns:
            Refined text
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
            model_name = "gemini-3.1-flash-lite-preview"
            
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
                            print(f"Text refinement timeout, retrying... ({attempt + 1}/{max_retries})")
                            import time
                            time.sleep(1)  # Retry after 1 sec delay
                            continue
                    raise retry_e
            
        except Exception as e:
            print(f"Text refinement failed: {e}")
            return text
        
        return text


def get_image_summary(image_path: str) -> str:
    """
    Helper function that describes image with Gemini
    
    Args:
        image_path: Image file path
    
    Returns:
        Image description text
    """
    converter = ElementConverter()
    element = ParsedElement(
        content="",
        element_type="image",
        image_path=image_path
    )
    return converter.convert_image(element)


def main():
    """Main function for testing"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python element_converter.py <image_path>")
        return
    
    image_path = sys.argv[1]
    result = get_image_summary(image_path)
    print(result)


if __name__ == "__main__":
    main()
