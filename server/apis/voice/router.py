"""
음성 분석 API 라우터
eGeMAPS, GRBAS 기반 음성 품질 분석
"""

import os
import json
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from apis.voice.service import analyze_audio, NumpyEncoder
from common.config import UPLOAD_DIR

router = APIRouter(prefix="/api/voice", tags=["Voice - 음성 분석"])


@router.post("/analyze")
async def api_analyze_audio(
    audio: UploadFile = File(..., description="음성 파일"),
    whisper_json: str = Form("", description="Whisper STT 결과 JSON (선택)"),
    language: str = Form("ko", description="분석 언어 (ko/en)"),
):
    """
    음성 파일 종합 분석

    - **audio**: 음성 파일 업로드
    - **whisper_json**: STT 결과 JSON 문자열 (유창성 분석 정확도 향상)
    - **language**: 분석 언어 (ko: 한국어, en: 영어)

    반환값:
    - waveform: 파형 데이터
    - pauses: 휴지 구간 정보
    - academic_analysis: 학술 기반 상세 분석 (유창성, 운율, 포먼트, 음질, 리듬)
    - speech_rate: 발화 속도 메트릭
    - volume: 음량 메트릭
    - pitch: 피치 메트릭
    - interview_scores: 종합 면접 점수
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="파일이 없습니다.")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    suffix = os.path.splitext(audio.filename)[1] or ".wav"

    with tempfile.NamedTemporaryFile(
        dir=UPLOAD_DIR, suffix=suffix, delete=False
    ) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = analyze_audio(tmp_path, whisper_json, language)

        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "음성 분석 실패"),
            )

        # NumpyEncoder로 직렬화 후 반환 (numpy 타입 호환)
        return json.loads(json.dumps(result, ensure_ascii=False, cls=NumpyEncoder))

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/transcribe-and-analyze")
async def api_transcribe_and_analyze(
    audio: UploadFile = File(..., description="음성 파일"),
    language: str = Form("auto", description="STT 언어 (auto/kor/eng)"),
    analysis_language: str = Form("ko", description="분석 언어 (ko/en)"),
):
    """
    STT + 음성 분석 통합 API

    음성 파일을 업로드하면:
    1. STT 수행 (Whisper)
    2. STT 결과를 활용한 음성 분석 수행
    3. 통합 결과 반환

    기존 Node.js /api/transcribe 엔드포인트의 대체
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="파일이 없습니다.")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    suffix = os.path.splitext(audio.filename)[1] or ".wav"

    with tempfile.NamedTemporaryFile(
        dir=UPLOAD_DIR, suffix=suffix, delete=False
    ) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # 1. STT 수행
        from apis.stt.service import transcribe
        stt_result = transcribe(tmp_path, language)

        if not stt_result.get("success"):
            raise HTTPException(status_code=500, detail="STT 처리 실패")

        # 2. 음성 분석 수행 (STT 결과 포함)
        whisper_json_str = json.dumps(stt_result, ensure_ascii=False)
        analysis_result = analyze_audio(tmp_path, whisper_json_str, analysis_language)

        if not analysis_result.get("success"):
            raise HTTPException(status_code=500, detail="음성 분석 실패")

        # 3. 통합 결과
        combined = json.loads(json.dumps(analysis_result, ensure_ascii=False, cls=NumpyEncoder))
        combined["transcription"] = {
            "text": stt_result.get("text", ""),
            "segments": stt_result.get("segments", []),
            "language": stt_result.get("language", ""),
            "method": stt_result.get("method", ""),
        }

        return combined

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
