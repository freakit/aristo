"""
AI 클라이언트 모듈
Gemini API 호출을 관리합니다.
"""

import os
import sys
import json
import base64
import mimetypes
import requests
from typing import Any, Dict, List, Optional

import google.generativeai as genai

from common.config import SETTINGS_GEMINI, ATTACHMENT_MODE


def gemini_setup() -> None:
    """Google Gemini 클라이언트 초기화"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("⚠️ GEMINI_API_KEY 환경변수가 필요합니다.")
        sys.exit(1)
    genai.configure(api_key=api_key)


def init_ai_client() -> None:
    """AI 클라이언트 전체 설정 (서버 시작 시 1회 호출)"""
    gemini_setup()
    print("✅ Google Gemini 클라이언트가 설정되었습니다.")


# ====== API 호출 함수들 ======

def gemini_call(messages: List[Dict[str, str]], images: Optional[List[str]] = None) -> Optional[str]:
    """Gemini API 호출"""
    try:
        model = genai.GenerativeModel(SETTINGS_GEMINI["model"])

        system_prompt = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_parts = [m["content"] for m in messages if m["role"] != "system"]

        combined_prompt = f"{system_prompt}\n\n" + "\n".join(user_parts)

        while True:
            try:
                response = model.generate_content(
                    combined_prompt,
                    generation_config=genai.GenerationConfig(
                        temperature=SETTINGS_GEMINI["temperature"],
                        max_output_tokens=SETTINGS_GEMINI["max_tokens"],
                    ),
                    request_options={"timeout": 60},
                )
                break
            except Exception as e:
                print(f"Gemini API 호출 재시도: {e}")

        return response.text if response and response.text else None

    except Exception as e:
        print(f"\nGemini API 호출 오류: {e}")
        return None


def ai_call(messages: List[Dict[str, Any]], images: Optional[List[str]] = None) -> Optional[str]:
    """AI 통합 호출 인터페이스 (Gemini)"""
    return gemini_call(messages, images=images)


# ====== 첨부파일 처리 ======

def url_to_data_url(url: str) -> str:
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    ctype = r.headers.get("Content-Type") or mimetypes.guess_type(url)[0] or "image/jpeg"
    b64 = base64.b64encode(r.content).decode("ascii")
    return f"data:{ctype};base64,{b64}"


def prepare_attachments(urls: List[str]) -> List[str]:
    if not urls:
        return []
    if ATTACHMENT_MODE.lower() != "dataurl":
        return urls
    out = []
    for u in urls:
        try:
            out.append(url_to_data_url(u))
        except Exception as e:
            print(f"[attachments] dataurl 변환 실패, URL로 대체: {u} | {e}")
            out.append(u)
    return out


# ====== JSON 파싱 ======

def parse_json_response(assistant_response: str, retry_count: int = 0) -> Any:
    """AI 응답을 JSON으로 파싱"""
    if "</think>" in assistant_response:
        assistant_response = assistant_response.split("</think>")[-1]
    if "```json" in assistant_response:
        assistant_response = assistant_response.split("```json")[-1].strip()
        assistant_response = assistant_response.split("```")[0].strip()
    elif "```" in assistant_response: # General code block support
        assistant_response = assistant_response.split("```")[-1].strip()
        assistant_response = assistant_response.split("```")[0].strip()

    try:
        parsed = json.loads(assistant_response.strip())

        if "missing_list" in parsed:
            return parsed["missing_list"]
        elif "question" in parsed:
            return parsed
        elif "bonus" in parsed:
            return parsed["bonus"]
        else:
            print("JSON 응답에 예상 키가 없습니다.")
            return None

    except json.JSONDecodeError:
        print(f"\n[Error] JSON 파싱 실패 (시도 {retry_count + 1}/3)")
        print(f"[Raw Content]: {assistant_response[:2000]}..." if len(assistant_response) > 2000 else f"[Raw Content]: {assistant_response}")
        
        if retry_count >= 2:
            print("⚠️ 최대 재시도 횟수 초과. 복구 중단.")
            return None
            
        return _repair_json_with_ai(assistant_response, retry_count + 1)


def _repair_json_with_ai(broken_json: str, retry_count: int) -> Any:
    """AI를 사용한 JSON 복구"""
    repair_prompt = """You are a JSON repair and completion assistant. Your task is to analyze broken or incomplete JSON data and return a valid, complete JSON object. If a field appears to be cut off, intelligently infer and complete the content while preserving the original meaning. Do not change key names or structures unless clearly necessary for correction. Your output must only include the fixed JSON (no explanations or extra commentary). Here's the broken JSON:

parsing example:
{
  "missing_list": [
    {
      "content": "missing_point_1",
      "type": "missing",
      "description": "Detailed, document-grounded or logic-based explanation"
    }
  ]
}

or

{
  "question": "a single answer-constructive Socratic follow-up question",
  "model_answer": "a correct, concise model answer"
}
"""

    model = genai.GenerativeModel("gemini-2.5-flash-lite")
    prompt = f"{repair_prompt}\n\n{broken_json}\n\nPlease provide the corrected JSON."
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(temperature=0.0, max_output_tokens=2048), # Lower temperature for stability
        )
        repaired = response.text
        print("AI JSON 복구 완료")
        return parse_json_response(repaired, retry_count) # Pass current retry count, don't increment again here as it's the same attempt cycle
    except Exception as e:
        print(f"JSON 복구 AI 호출 실패: {e}")
        return None
