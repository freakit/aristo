"""
STT (Speech-to-Text) 서비스 모듈
Whisper 기반 음성 인식을 제공합니다.
- faster-whisper (기본)
- transformers
- openai-whisper (fallback)
"""

import warnings
from typing import Optional

warnings.filterwarnings("ignore")


def transcribe_with_faster_whisper(audio_path: str, language: str) -> dict:
    """faster-whisper를 사용한 음성 인식"""
    try:
        from faster_whisper import WhisperModel

        model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")

        lang = None if language == "auto" else language
        if language == "eng":
            lang = "en"
        elif language == "kor":
            lang = "ko"

        transcribe_options = {
            "language": lang,
            "beam_size": 5,
            "vad_filter": True,
            "vad_parameters": dict(min_silence_duration_ms=500),
            "task": "transcribe",
        }
        if language == "auto":
            transcribe_options["word_timestamps"] = True

        segments, info = model.transcribe(audio_path, **transcribe_options)

        result_segments = []
        full_text = ""
        for segment in segments:
            result_segments.append({
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": segment.text.strip(),
            })
            full_text += segment.text.strip() + " "

        return {
            "success": True,
            "method": "faster-whisper",
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "text": full_text.strip(),
            "segments": result_segments,
        }
    except Exception as e:
        return {"success": False, "method": "faster-whisper", "error": str(e)}


def transcribe_with_transformers(audio_path: str, language: str) -> dict:
    """transformers를 사용한 음성 인식"""
    try:
        import torch
        from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

        device = "cuda:0" if torch.cuda.is_available() else "cpu"
        torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        model_id = "openai/whisper-large-v3-turbo"
        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            model_id, torch_dtype=torch_dtype, low_cpu_mem_usage=True
        )
        model.to(device)
        processor = AutoProcessor.from_pretrained(model_id)

        pipe = pipeline(
            "automatic-speech-recognition",
            model=model,
            tokenizer=processor.tokenizer,
            feature_extractor=processor.feature_extractor,
            torch_dtype=torch_dtype,
            device=device,
        )

        generate_kwargs = {}
        if language != "auto":
            lang = language
            if language == "kor":
                lang = "korean"
            elif language == "eng":
                lang = "english"
            generate_kwargs["language"] = lang

        result = pipe(
            audio_path,
            return_timestamps=True,
            generate_kwargs=generate_kwargs,
        )

        segments = []
        if "chunks" in result:
            for chunk in result["chunks"]:
                ts = chunk.get("timestamp", (0, 0))
                segments.append({
                    "start": round(ts[0] if ts[0] else 0, 2),
                    "end": round(ts[1] if ts[1] else 0, 2),
                    "text": chunk["text"].strip(),
                })

        return {
            "success": True,
            "method": "transformers",
            "text": result["text"].strip(),
            "segments": segments,
        }
    except Exception as e:
        return {"success": False, "method": "transformers", "error": str(e)}


def transcribe_with_openai_whisper(audio_path: str, language: str) -> dict:
    """openai whisper를 사용한 음성 인식"""
    try:
        import whisper

        model = whisper.load_model("large-v3")
        options = {"task": "transcribe"}
        if language != "auto":
            lang = language
            if language == "kor":
                lang = "ko"
            elif language == "eng":
                lang = "en"
            options["language"] = lang

        result = model.transcribe(audio_path, **options)

        segments = []
        for seg in result.get("segments", []):
            segments.append({
                "start": round(seg["start"], 2),
                "end": round(seg["end"], 2),
                "text": seg["text"].strip(),
            })

        return {
            "success": True,
            "method": "openai-whisper",
            "language": result.get("language", ""),
            "text": result["text"].strip(),
            "segments": segments,
        }
    except Exception as e:
        return {"success": False, "method": "openai-whisper", "error": str(e)}


def transcribe(audio_path: str, language: str = "auto") -> dict:
    """
    음성 인식 수행 (우선순위: faster-whisper → transformers → openai-whisper)
    """
    methods = [
        transcribe_with_faster_whisper,
        transcribe_with_transformers,
        transcribe_with_openai_whisper,
    ]

    for method in methods:
        result = method(audio_path, language)
        if result.get("success"):
            return result
        print(f"[STT] {result.get('method')} 실패: {result.get('error')}")

    return {
        "success": False,
        "error": "모든 STT 방법이 실패했습니다.",
        "text": "",
        "segments": [],
    }
