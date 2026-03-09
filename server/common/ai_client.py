"""
AI 클라이언트 모듈
Gemini API 클라이언트를 초기화합니다.
"""

import os
import sys
import google.generativeai as genai

def gemini_setup() -> None:
    """Google Gemini 클라이언트 초기화"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[Warning] GEMINI_API_KEY 환경변수가 필요합니다.")
        sys.exit(1)
    genai.configure(api_key=api_key)

def init_ai_client() -> None:
    """AI 클라이언트 전체 설정 (서버 시작 시 1회 호출)"""
    gemini_setup()
    print("[OK] Google Gemini 클라이언트가 설정되었습니다.")
