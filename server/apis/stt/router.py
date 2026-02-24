"""
STT (Speech-to-Text) API 라우터
"""

import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from apis.stt.service import transcribe
from common.config import UPLOAD_DIR

router = APIRouter(prefix="/api/stt", tags=["STT - 음성 인식"])


@router.post("/transcribe")
async def api_transcribe(
    audio: UploadFile = File(..., description="음성 파일 (wav, mp3, webm, m4a 등)"),
    language: str = Form("auto", description="언어 설정 (auto/kor/eng)"),
):
    """
    음성 파일을 텍스트로 변환

    - **audio**: 음성 파일 업로드
    - **language**: 언어 설정
      - `auto`: 자동 감지 (기본값)
      - `kor`: 한국어
      - `eng`: 영어

    반환값:
    - text: 전체 인식 텍스트
    - segments: 타임스탬프별 세그먼트 목록
    - method: 사용된 STT 엔진
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="파일이 없습니다.")

    # 임시 파일 저장
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    suffix = os.path.splitext(audio.filename)[1] or ".wav"

    with tempfile.NamedTemporaryFile(
        dir=UPLOAD_DIR, suffix=suffix, delete=False
    ) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = transcribe(tmp_path, language)

        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "STT 처리 실패"),
            )

        return result

    finally:
        # 임시 파일 정리
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
