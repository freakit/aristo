"""
AI Client Module
Initializes Gemini API client.
"""

import os
import sys
import google.generativeai as genai

def gemini_setup() -> None:
    """Initialize Google Gemini client"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[Warning] GEMINI_API_KEY environment variable is required.")
        sys.exit(1)
    genai.configure(api_key=api_key)

def init_ai_client() -> None:
    """Full AI client setup (called once on server start)"""
    gemini_setup()
    print("[OK] Google Gemini client configured.")
