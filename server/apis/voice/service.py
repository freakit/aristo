#!/usr/bin/env python3
"""
학술 기반 면접 발화 분석 시스템 (Academic Speech Analysis System)

Reference Papers & Standards:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1] eGeMAPS (2016) - Geneva Minimalistic Acoustic Parameter Set
    → F0, Formants (F1-F3), HNR, Jitter, Shimmer 등 88개 표준 파라미터
    
[2] Kormos, J. (2006) - Speech Production and Second Language Acquisition
    → Articulation Rate: 4-6 syllables/sec (정상)
    → Phonation Time Ratio: 0.6-0.8 (정상)
    
[3] Goldman-Eisler, F. (1968) - Psycholinguistics: Experiments in Spontaneous Speech
    → Silent Pause Rate: 5-15 pauses/min (정상)
    → Mean Pause Duration: 0.3-0.8 sec (정상)
    
[4] Tavakoli & Skehan (2005) - Fluency Measures
    → Mean Length of Runs (MLR): 일시정지 사이 발화 길이
    → Pruned Speech Rate: 채움말 제외 발화 속도
    
[5] Grabe & Low (2002) - Rhythm Metrics
    → nPVI (normalized Pairwise Variability Index)
    → %V (Vocalic percentage)
    
[6] GRBAS / CAPE-V Voice Quality Standards
    → Jitter: < 1% (안정적인 피치)
    → Shimmer: < 3% (안정적인 음량) 
    → HNR: > 10 dB (명료한 음성)
    
[7] MIT Media Lab (Naim et al., 2015) - Interview Prediction
    → Prosodic features predict interview outcomes with 85%+ accuracy
    
[8] Boersma, P. (2001) - Praat formant analysis
    → F1 (vowel height): 300-900 Hz
    → F2 (vowel backness): 800-2500 Hz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import sys
import json
import numpy as np
import warnings
import io
import re
from typing import Dict, List, Tuple, Optional

# Windows에서 stdout UTF-8 인코딩 강제 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
warnings.filterwarnings("ignore")


class NumpyEncoder(json.JSONEncoder):
    """numpy 타입을 JSON 직렬화 가능하도록 변환"""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


# ============================================================================
# REFERENCE NORMS (학술 기준 정상 범위)
# ============================================================================

REFERENCE_NORMS = {
    # Kormos (2006)
    "articulation_rate": {"min": 4.0, "max": 6.0, "optimal": 5.0, "unit": "syllables/sec"},
    "speech_rate": {"min": 3.0, "max": 5.0, "optimal": 4.0, "unit": "syllables/sec"},
    "phonation_time_ratio": {"min": 0.6, "max": 0.8, "optimal": 0.7},
    
    # Goldman-Eisler (1968)
    "silent_pause_rate": {"min": 5, "max": 15, "optimal": 10, "unit": "pauses/min"},
    "mean_pause_duration": {"min": 0.3, "max": 0.8, "optimal": 0.5, "unit": "seconds"},
    "long_pause_ratio": {"max": 0.2, "optimal": 0.1},
    
    # Tavakoli & Skehan (2005)
    "mean_length_of_runs": {"min": 3.0, "max": 8.0, "optimal": 5.0, "unit": "syllables"},
    
    # eGeMAPS F0
    "f0_variation_cv": {"min": 0.1, "max": 0.3, "optimal": 0.2},
    "f0_range": {"min": 50, "max": 150, "optimal": 100, "unit": "Hz"},
    
    # GRBAS / CAPE-V
    "jitter_percent": {"max": 1.0, "optimal": 0.5, "unit": "%"},
    "shimmer_percent": {"max": 3.0, "optimal": 1.5, "unit": "%"},
    "hnr_db": {"min": 10, "optimal": 15, "unit": "dB"},
    
    # Boersma (2001) Formants
    "f1_mean": {"min": 300, "max": 900, "unit": "Hz"},
    "f2_mean": {"min": 800, "max": 2500, "unit": "Hz"},
    
    # Rhythm (Grabe & Low, 2002)
    "npvi": {"min": 40, "max": 70, "optimal": 55},
}


# ============================================================================
# 1. AUDIO LOADING
# ============================================================================

def load_audio(audio_path: str) -> Tuple[np.ndarray, int]:
    """오디오 파일 로드"""
    try:
        import librosa
        y, sr = librosa.load(audio_path, sr=16000)
        return y, sr
    except Exception as e:
        raise Exception(f"Failed to load audio: {str(e)}")


# ============================================================================
# 2. WAVEFORM EXTRACTION
# ============================================================================

def extract_waveform(y: np.ndarray, sr: int, num_points: int = 500) -> List[Dict]:
    """파형 데이터 추출 (다운샘플링)"""
    hop = max(1, len(y) // num_points)
    waveform = []
    
    for i in range(0, len(y), hop):
        chunk = y[i:i+hop]
        if len(chunk) > 0:
            waveform.append({
                "time": round(i / sr, 3),
                "amplitude": float(np.max(np.abs(chunk)))
            })
    
    return waveform[:num_points]


# ============================================================================
# 3. VOICE ACTIVITY DETECTION (VAD)
# ============================================================================

def detect_speech_segments(y: np.ndarray, sr: int) -> Tuple[List[Dict], List[Dict]]:
    """
    음성/무음 구간 탐지 (Voice Activity Detection)
    Returns: (speech_segments, pause_segments)
    """
    import librosa
    
    frame_length = int(sr * 0.025)  # 25ms frames
    hop_length = int(sr * 0.010)    # 10ms hop
    
    # RMS 에너지 계산
    rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
    
    # 적응형 임계값 (상위 10% 기준)
    threshold = np.percentile(rms, 90) * 0.02
    is_speech = rms > threshold
    
    speech_segments = []
    pause_segments = []
    
    segment_start = None
    is_in_speech = False
    
    for i, speech_flag in enumerate(is_speech):
        time = i * (hop_length / sr)
        
        if speech_flag and not is_in_speech:
            # 발화 시작
            if segment_start is not None and (time - segment_start) >= 0.25:
                pause_segments.append({
                    "start": round(segment_start, 3),
                    "end": round(time, 3),
                    "duration": round(time - segment_start, 3)
                })
            segment_start = time
            is_in_speech = True
        elif not speech_flag and is_in_speech:
            # 발화 종료
            if segment_start is not None:
                duration = time - segment_start
                if duration >= 0.05:  # 최소 50ms 발화
                    speech_segments.append({
                        "start": round(segment_start, 3),
                        "end": round(time, 3),
                        "duration": round(duration, 3)
                    })
            segment_start = time
            is_in_speech = False
    
    # 마지막 세그먼트 처리
    if segment_start is not None:
        final_time = len(y) / sr
        if is_in_speech:
            speech_segments.append({
                "start": round(segment_start, 3),
                "end": round(final_time, 3),
                "duration": round(final_time - segment_start, 3)
            })
        elif (final_time - segment_start) >= 0.25:
            pause_segments.append({
                "start": round(segment_start, 3),
                "end": round(final_time, 3),
                "duration": round(final_time - segment_start, 3)
            })
    
    return speech_segments, pause_segments


# ============================================================================
# 4. WHISPER DATA PARSING & SYLLABLE COUNTING (ASR 기반)
# ============================================================================

def parse_whisper_data(whisper_json_str: str) -> Dict:
    """
    Whisper JSON 문자열 파싱
    Returns: {text, segments, language, duration}
    """
    try:
        data = json.loads(whisper_json_str)
        return {
            "text": data.get("text", ""),
            "segments": data.get("segments", []),
            "language": data.get("language", "en"),
            "duration": data.get("duration", 0)
        }
    except (json.JSONDecodeError, TypeError):
        # 기존 호환성: 단순 텍스트가 전달된 경우
        return {
            "text": whisper_json_str if isinstance(whisper_json_str, str) else "",
            "segments": [],
            "language": "en",
            "duration": 0
        }


def count_syllables_from_text(text: str, language: str = "en") -> int:
    """
    텍스트 기반 음절 수 계산
    
    - auto: 한글은 한글로, 영어는 영어로 각각 인식하여 합산 (하이브리드)
    - ko: 모든 텍스트를 한국어로 간주
    - en: 모든 텍스트를 영어로 간주
    """
    if not text or len(text.strip()) == 0:
        return 0
    
    # 구두점 및 공백 제거
    clean_text = re.sub(r'[\s.,!?;:"\'\-\(\)\[\]…]', '', text)
    
    if language == "auto":
        # 하이브리드 모드: 한글과 영어를 각각 따로 계산
        korean_syllables = len(re.findall(r'[가-힣]', clean_text))
        
        # 한글 제거 후 영어만 추출
        english_text = re.sub(r'[가-힣]', '', clean_text).lower()
        english_syllables = _count_english_syllables(english_text)
        
        total = korean_syllables + english_syllables
        return max(1, total) if clean_text else 0
    
    elif language == "ko":
        # 한국어 강제: 한글 문자 수 = 음절 수
        korean_chars = re.findall(r'[가-힣]', clean_text)
        return len(korean_chars) if korean_chars else max(1, len(clean_text))
    
    else:  # "en" 또는 기타
        # 영어 강제: 모음 기반 음절 카운팅
        return max(1, _count_english_syllables(clean_text.lower()))


def _count_english_syllables(text: str) -> int:
    """
    영어 텍스트 음절 수 계산 (모음 기반 휴리스틱)
    Reference: Simple English syllable counting algorithm
    """
    if not text:
        return 0
    
    vowels = "aeiouy"
    syllable_count = 0
    prev_was_vowel = False
    
    for char in text:
        is_vowel = char in vowels
        if is_vowel and not prev_was_vowel:
            syllable_count += 1
        prev_was_vowel = is_vowel
    
    # 단어 끝의 묵음 'e' 보정
    words = re.findall(r'[a-z]+', text)
    for word in words:
        if len(word) > 2 and word.endswith('e') and word[-2] not in vowels:
            syllable_count = max(1, syllable_count - 1)
    
    return syllable_count


def get_whisper_phonation_metrics(segments: List[Dict]) -> Dict:
    """
    Whisper segments에서 발화 시간 메트릭 추출
    """
    if not segments:
        return {
            "total_segment_duration": 0,
            "first_start": 0,
            "last_end": 0,
            "speech_span": 0
        }
    
    total_duration = sum(seg.get("end", 0) - seg.get("start", 0) for seg in segments)
    first_start = segments[0].get("start", 0)
    last_end = segments[-1].get("end", 0)
    speech_span = last_end - first_start
    
    return {
        "total_segment_duration": round(total_duration, 3),
        "first_start": round(first_start, 3),
        "last_end": round(last_end, 3),
        "speech_span": round(speech_span, 3)
    }


# ============================================================================
# 5. FLUENCY METRICS (학술 기반)
# ============================================================================

def calculate_fluency_metrics(
    y: np.ndarray, 
    sr: int, 
    speech_segments: List[Dict],
    pause_segments: List[Dict],
    syllable_count: int,
    whisper_metrics: Optional[Dict] = None
) -> Dict:
    """
    학술 연구 기반 유창성 지표 계산 (Whisper ASR 데이터 활용)
    
    Reference:
    - Kormos (2006): AR, PTR
    - Tavakoli & Skehan (2005): MLR
    
    변경사항:
    - 음절 수: 텍스트 기반 계산 (더 정확)
    - Articulation Rate: Whisper segment duration 합계 사용
    - Speech Rate: 첫 발화~마지막 발화 구간 사용
    """
    total_duration = len(y) / sr
    
    # VAD 기반 Phonation Time
    vad_phonation_time = sum(seg["duration"] for seg in speech_segments)
    
    # Whisper 기반 발화 시간 (더 정확)
    if whisper_metrics and whisper_metrics.get("total_segment_duration", 0) > 0:
        phonation_time = whisper_metrics["total_segment_duration"]
        speech_span = whisper_metrics.get("speech_span", total_duration)
    else:
        phonation_time = vad_phonation_time
        speech_span = total_duration
    
    # Phonation Time Ratio (PTR)
    ptr = phonation_time / total_duration if total_duration > 0 else 0
    
    # Speech Rate (SR): 발화 구간(첫~끝) 대비 음절 수
    speech_rate = syllable_count / speech_span if speech_span > 0 else 0
    
    # Articulation Rate (AR): 실제 발화 시간 대비 음절 수
    articulation_rate = syllable_count / phonation_time if phonation_time > 0 else 0
    
    # Mean Syllable Duration
    mean_syllable_duration = phonation_time / syllable_count if syllable_count > 0 else 0
    
    # Mean Length of Runs (MLR): pause 사이 평균 발화 길이 (음절 수)
    if len(speech_segments) > 0:
        avg_segment_duration = phonation_time / len(speech_segments)
        mlr = avg_segment_duration * articulation_rate
    else:
        mlr = 0
    
    return {
        "total_duration": round(total_duration, 2),
        "phonation_time": round(phonation_time, 2),
        "phonation_time_ratio": round(ptr, 3),
        "estimated_syllables": syllable_count,
        "syllable_source": "whisper_text",  # 음절 계산 방식 표시
        "speech_rate": round(speech_rate, 2),
        "articulation_rate": round(articulation_rate, 2),
        "mean_syllable_duration": round(mean_syllable_duration, 3),
        "mean_length_of_runs": round(mlr, 2),
        "speech_segment_count": len(speech_segments),
        "vad_phonation_time": round(vad_phonation_time, 2)  # VAD 결과도 보존
    }


# ============================================================================
# 6. PAUSE ANALYSIS (학술 기반)
# ============================================================================

def analyze_pause_patterns(pause_segments: List[Dict], total_duration: float) -> Dict:
    """
    학술 연구 기반 일시정지 패턴 분석
    
    Reference:
    - Goldman-Eisler (1968): Pause analysis
    - Skehan & Foster (1999): L2 pause patterns
    """
    if not pause_segments:
        return {
            "pauses": [],
            "total_pauses": 0,
            "total_pause_time": 0,
            "silent_pause_rate": 0,
            "mean_pause_duration": 0,
            "pause_variability_cv": 0,
            "long_pause_count": 0,
            "long_pause_ratio": 0,
            "pause_ratio": 0
        }
    
    pause_durations = [p["duration"] for p in pause_segments]
    
    # 기본 통계
    mean_pause = np.mean(pause_durations)
    std_pause = np.std(pause_durations)
    total_pause_time = sum(pause_durations)
    
    # Long pause (>= 1초) 분석
    long_pauses = [p for p in pause_segments if p["duration"] >= 1.0]
    long_pause_ratio = len(long_pauses) / len(pause_segments)
    
    # Pause rate (분당 횟수)
    pause_rate = (len(pause_segments) / total_duration) * 60 if total_duration > 0 else 0
    
    # Coefficient of Variation (변동 계수)
    cv = std_pause / mean_pause if mean_pause > 0 else 0
    
    # 타입 분류
    for p in pause_segments:
        if p["duration"] >= 1.0:
            p["type"] = "long"
        elif p["duration"] >= 0.5:
            p["type"] = "medium"
        else:
            p["type"] = "short"
    
    return {
        "pauses": pause_segments,
        "total_pauses": len(pause_segments),
        "total_pause_time": round(total_pause_time, 2),
        "silent_pause_rate": round(pause_rate, 2),
        "mean_pause_duration": round(mean_pause, 3),
        "pause_variability_cv": round(cv, 3),
        "long_pause_count": len(long_pauses),
        "long_pause_ratio": round(long_pause_ratio, 3),
        "pause_ratio": round(total_pause_time / total_duration, 3) if total_duration > 0 else 0
    }


# ============================================================================
# 7. PROSODIC FEATURES (eGeMAPS 기반)
# ============================================================================

def extract_prosodic_features(y: np.ndarray, sr: int) -> Dict:
    """
    eGeMAPS 표준 기반 운율 특성 추출
    
    Reference:
    - Eyben et al. (2016): eGeMAPS specification
    """
    import librosa
    from scipy.signal import find_peaks
    
    # F0 (기본 주파수) 추출
    f0, voiced_flag, voiced_probs = librosa.pyin(y, fmin=50, fmax=500, sr=sr)
    f0_valid = f0[~np.isnan(f0)]
    
    if len(f0_valid) > 0:
        f0_mean = float(np.mean(f0_valid))
        f0_std = float(np.std(f0_valid))
        f0_min = float(np.min(f0_valid))
        f0_max = float(np.max(f0_valid))
        f0_range = f0_max - f0_min
        f0_cv = f0_std / f0_mean if f0_mean > 0 else 0
        
        # F0 contour 패턴 분석
        f0_trend = np.polyfit(range(len(f0_valid)), f0_valid, 1)[0]
        if f0_trend > 1:
            f0_contour = "rising"
        elif f0_trend < -1:
            f0_contour = "falling"
        else:
            f0_contour = "flat"
    else:
        f0_mean = f0_std = f0_min = f0_max = f0_range = f0_cv = 0
        f0_contour = "unknown"
    
    # Intensity 특성
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
    rms_db = librosa.amplitude_to_db(rms, ref=np.max)
    
    intensity_mean = float(np.mean(rms_db))
    intensity_std = float(np.std(rms_db))
    intensity_max = float(np.max(rms_db))
    valid_rms = rms_db[rms_db > -60]
    intensity_min = float(np.min(valid_rms)) if len(valid_rms) > 0 else intensity_mean
    intensity_range = intensity_max - intensity_min
    
    # Loudness peaks (강세 빈도)
    peaks, _ = find_peaks(rms_db, height=intensity_mean, distance=int(0.2 * sr / 512))
    total_duration = len(y) / sr
    peaks_per_second = len(peaks) / total_duration if total_duration > 0 else 0
    
    return {
        "f0_mean": round(f0_mean, 2),
        "f0_std": round(f0_std, 2),
        "f0_min": round(f0_min, 2),
        "f0_max": round(f0_max, 2),
        "f0_range": round(f0_range, 2),
        "f0_variation_cv": round(f0_cv, 3),
        "f0_contour": f0_contour,
        "intensity_mean_db": round(intensity_mean, 2),
        "intensity_std": round(intensity_std, 2),
        "intensity_range": round(intensity_range, 2),
        "loudness_peaks_per_second": round(peaks_per_second, 2)
    }


# ============================================================================
# 8. FORMANT ANALYSIS (Praat/parselmouth 기반)
# ============================================================================

def extract_formant_features(y: np.ndarray, sr: int) -> Dict:
    """
    Praat 기반 포먼트 분석 (F1, F2, F3)
    
    Reference:
    - Boersma (2001): Praat formant analysis
    - eGeMAPS: Formant frequencies as voice quality indicators
    
    F1: 모음 높이 (vowel height) - 역관계
    F2: 모음 전후 위치 (vowel backness)
    F3: r/l 구분, 개인 음색
    """
    try:
        import parselmouth
        from parselmouth.praat import call
        
        # Parselmouth Sound 객체 생성
        snd = parselmouth.Sound(y, sampling_frequency=sr)
        
        # Formant 추출 (Burg method)
        formant = call(snd, "To Formant (burg)", 0.0, 5, 5500, 0.025, 50)
        
        # 시간 범위 가져오기
        n_frames = call(formant, "Get number of frames")
        
        f1_values = []
        f2_values = []
        f3_values = []
        
        for i in range(1, n_frames + 1):
            t = call(formant, "Get time from frame number", i)
            f1 = call(formant, "Get value at time", 1, t, "Hertz", "Linear")
            f2 = call(formant, "Get value at time", 2, t, "Hertz", "Linear")
            f3 = call(formant, "Get value at time", 3, t, "Hertz", "Linear")
            
            if not np.isnan(f1) and 100 < f1 < 1500:
                f1_values.append(f1)
            if not np.isnan(f2) and 500 < f2 < 3500:
                f2_values.append(f2)
            if not np.isnan(f3) and 1500 < f3 < 4500:
                f3_values.append(f3)
        
        f1_mean = float(np.mean(f1_values)) if f1_values else 0
        f2_mean = float(np.mean(f2_values)) if f2_values else 0
        f3_mean = float(np.mean(f3_values)) if f3_values else 0
        
        f1_std = float(np.std(f1_values)) if len(f1_values) > 1 else 0
        f2_std = float(np.std(f2_values)) if len(f2_values) > 1 else 0
        
        # Vowel Space Area (간략화된 근사)
        # 정확한 VSA는 특정 모음 샘플이 필요하지만, 여기서는 F1/F2 분산으로 근사
        formant_dispersion = f1_std + f2_std
        
        return {
            "f1_mean": round(f1_mean, 2),
            "f2_mean": round(f2_mean, 2),
            "f3_mean": round(f3_mean, 2),
            "f1_std": round(f1_std, 2),
            "f2_std": round(f2_std, 2),
            "formant_dispersion": round(formant_dispersion, 2),
            "analysis_method": "praat_burg"
        }
        
    except ImportError:
        # parselmouth 미설치 시 librosa fallback
        return extract_formant_features_fallback(y, sr)
    except Exception as e:
        return extract_formant_features_fallback(y, sr)


def extract_formant_features_fallback(y: np.ndarray, sr: int) -> Dict:
    """parselmouth 없을 때 librosa 기반 근사"""
    import librosa
    
    # LPC 기반 근사 (정확도 낮음)
    try:
        # 스펙트럼에서 피크 찾기
        S = np.abs(librosa.stft(y))
        freqs = librosa.fft_frequencies(sr=sr)
        
        # 평균 스펙트럼
        mean_spectrum = np.mean(S, axis=1)
        
        # 간단한 피크 탐지
        from scipy.signal import find_peaks
        peaks, _ = find_peaks(mean_spectrum, height=np.mean(mean_spectrum))
        
        if len(peaks) >= 3:
            peak_freqs = freqs[peaks[:3]]
            return {
                "f1_mean": round(float(peak_freqs[0]), 2),
                "f2_mean": round(float(peak_freqs[1]), 2),
                "f3_mean": round(float(peak_freqs[2]), 2),
                "f1_std": 0,
                "f2_std": 0,
                "formant_dispersion": 0,
                "analysis_method": "spectral_peaks_fallback"
            }
    except:
        pass
    
    return {
        "f1_mean": 0,
        "f2_mean": 0,
        "f3_mean": 0,
        "f1_std": 0,
        "f2_std": 0,
        "formant_dispersion": 0,
        "analysis_method": "unavailable"
    }


# ============================================================================
# 9. VOICE QUALITY (GRBAS/CAPE-V 기반)
# ============================================================================

def analyze_voice_quality(y: np.ndarray, sr: int) -> Dict:
    """
    음성 품질 분석
    
    Reference:
    - Teixeira et al. (2013): Jitter, Shimmer measurements
    - GRBAS/CAPE-V: Clinical voice quality assessment
    """
    import librosa
    
    # HNR (Harmonics-to-Noise Ratio) 추정
    hnr_mean = estimate_hnr(y, sr)
    
    # Jitter (피치 변동)
    jitter_percent = estimate_jitter(y, sr)
    
    # Shimmer (음량 변동)
    shimmer_percent = estimate_shimmer(y, sr)
    
    # Spectral Flux
    S = np.abs(librosa.stft(y))
    spectral_flux = float(np.mean(np.sqrt(np.sum(np.diff(S, axis=1)**2, axis=0))))
    
    # Zero Crossing Rate
    zcr = librosa.feature.zero_crossing_rate(y)[0]
    zcr_mean = float(np.mean(zcr))
    
    # Energy Consistency
    rms = librosa.feature.rms(y=y)[0]
    energy_consistency = 1 - (np.std(rms) / (np.mean(rms) + 1e-10))
    energy_consistency = max(0, min(1, energy_consistency))
    
    return {
        "hnr_mean_db": round(hnr_mean, 2),
        "jitter_percent": round(jitter_percent, 3),
        "shimmer_percent": round(shimmer_percent, 3),
        "spectral_flux": round(spectral_flux, 4),
        "zcr_mean": round(zcr_mean, 4),
        "energy_consistency": round(float(energy_consistency), 3)
    }


def estimate_hnr(y: np.ndarray, sr: int) -> float:
    """Autocorrelation 기반 HNR 추정"""
    frame_length = int(sr * 0.04)
    hop_length = int(sr * 0.01)
    
    hnr_values = []
    for i in range(0, len(y) - frame_length, hop_length):
        frame = y[i:i + frame_length]
        
        autocorr = np.correlate(frame, frame, mode='full')
        autocorr = autocorr[len(autocorr)//2:]
        
        if len(autocorr) > int(sr / 500):
            peak_idx = np.argmax(autocorr[int(sr/500):int(sr/50)]) + int(sr/500)
            if autocorr[0] > 0 and autocorr[peak_idx] > 0:
                r = autocorr[peak_idx] / autocorr[0]
                if 0 < r < 1:
                    hnr = 10 * np.log10(r / (1 - r + 1e-10))
                    if -10 < hnr < 40:
                        hnr_values.append(hnr)
    
    return float(np.mean(hnr_values)) if hnr_values else 0


def estimate_jitter(y: np.ndarray, sr: int) -> float:
    """Local Jitter 추정"""
    import librosa
    
    f0, _, _ = librosa.pyin(y, fmin=50, fmax=500, sr=sr)
    f0_valid = f0[~np.isnan(f0)]
    
    if len(f0_valid) > 1:
        f0_diffs = np.abs(np.diff(f0_valid))
        return float(np.mean(f0_diffs) / np.mean(f0_valid) * 100)
    return 0


def estimate_shimmer(y: np.ndarray, sr: int) -> float:
    """Local Shimmer 추정"""
    import librosa
    
    rms = librosa.feature.rms(y=y)[0]
    rms_valid = rms[rms > np.max(rms) * 0.1]
    
    if len(rms_valid) > 1:
        rms_diffs = np.abs(np.diff(rms_valid))
        return float(np.mean(rms_diffs) / np.mean(rms_valid) * 100)
    return 0


# ============================================================================
# 10. RHYTHM METRICS (Grabe & Low 2002)
# ============================================================================

def calculate_rhythm_metrics(speech_segments: List[Dict], pause_segments: List[Dict]) -> Dict:
    """
    Speech rhythm 메트릭 계산
    
    Reference:
    - Grabe & Low (2002): nPVI
    - Ramus et al. (1999): %V, ∆C
    """
    if len(speech_segments) < 2:
        return {
            "npvi": 0,
            "vocalic_percentage": 0,
            "interval_variability": 0
        }
    
    durations = [seg["duration"] for seg in speech_segments]
    
    # nPVI (normalized Pairwise Variability Index)
    pvi_sum = 0
    for i in range(len(durations) - 1):
        d1, d2 = durations[i], durations[i + 1]
        if d1 + d2 > 0:
            pvi_sum += abs(d1 - d2) / ((d1 + d2) / 2)
    
    npvi = (pvi_sum / (len(durations) - 1)) * 100 if len(durations) > 1 else 0
    
    # Vocalic percentage (%V)
    total_speech = sum(durations)
    total_pause = sum(p["duration"] for p in pause_segments)
    total_time = total_speech + total_pause
    vocalic_pct = (total_speech / total_time * 100) if total_time > 0 else 0
    
    # Interval variability (표준편차 기반)
    interval_var = float(np.std(durations)) if len(durations) > 1 else 0
    
    return {
        "npvi": round(npvi, 2),
        "vocalic_percentage": round(vocalic_pct, 2),
        "interval_variability": round(interval_var, 3)
    }


# ============================================================================
# 11. TEXT-BASED DISFLUENCY ANALYSIS
# ============================================================================

def analyze_text_disfluency(transcript: str, language: str = "ko") -> Dict:
    """
    STT 텍스트 기반 비유창성 분석
    
    Reference:
    - ACL Anthology disfluency detection research
    - Shriberg (1994): Disfluency patterns
    
    탐지 대상:
    - 채움말 (Filled pauses): "음", "어", "그"
    - 단어 반복 (Word repetitions)
    - 자기 수정 (Self-corrections)
    """
    if not transcript or len(transcript.strip()) == 0:
        return {
            "filler_count": 0,
            "filler_rate": 0,
            "repetition_count": 0,
            "total_words": 0,
            "fillers_detected": [],
            "disfluency_rate": 0
        }
    
    # 한국어 채움말 패턴
    korean_fillers = {
        r'\b음+\b': 'filler_um',
        r'\b어+\b': 'filler_uh', 
        r'\b아+\b': 'filler_ah',
        r'\b그+\b': 'filler_geu',
        r'\b저+\b': 'filler_jeo',
        r'\b뭐+\b': 'filler_mwo',
        r'\b이제+\b': 'filler_ije',
        r'\b근데\b': 'filler_geunde',
        r'\b그러니까\b': 'filler_grt',
        r'\b그래서\b': 'filler_gs',
    }
    
    # 영어 채움말 패턴
    english_fillers = {
        r'\buh+\b': 'filler_uh',
        r'\bum+\b': 'filler_um',
        r'\ber+\b': 'filler_er',
        r'\blike\b': 'filler_like',
        r'\byou know\b': 'filler_youknow',
        r'\bi mean\b': 'filler_imean',
        r'\bso+\b': 'filler_so',
        r'\bwell\b': 'filler_well',
        r'\bbasically\b': 'filler_basically',
        r'\bactually\b': 'filler_actually',
    }
    
    fillers = korean_fillers if language == "ko" else english_fillers
    
    text_lower = transcript.lower()
    fillers_detected = []
    filler_count = 0
    
    for pattern, filler_type in fillers.items():
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        filler_count += len(matches)
        if matches:
            fillers_detected.append({
                "type": filler_type,
                "count": len(matches)
            })
    
    # 단어 수 계산
    words = re.findall(r'\w+', transcript)
    total_words = len(words)
    
    # 연속 단어 반복 탐지
    repetition_count = 0
    for i in range(len(words) - 1):
        if words[i].lower() == words[i + 1].lower() and len(words[i]) > 1:
            repetition_count += 1
    
    # Disfluency rate (채움말 + 반복) / 전체 단어
    disfluency_total = filler_count + repetition_count
    disfluency_rate = disfluency_total / total_words if total_words > 0 else 0
    
    # Filler rate (분당 채움말 수는 음성 길이 필요하므로 여기서는 단어 비율)
    filler_rate = filler_count / total_words * 100 if total_words > 0 else 0
    
    return {
        "filler_count": filler_count,
        "filler_rate": round(filler_rate, 2),
        "repetition_count": repetition_count,
        "total_words": total_words,
        "fillers_detected": fillers_detected,
        "disfluency_rate": round(disfluency_rate * 100, 2)
    }


# ============================================================================
# 12. NORMALIZED SCORING SYSTEM (Z-score 기반)
# ============================================================================

def normalize_score(value: float, ref: Dict, higher_is_better: bool = True) -> float:
    """
    학술 기준 범위 기반 정규화 점수 (0-100)
    """
    if "min" in ref and "max" in ref:
        optimal = ref.get("optimal", (ref["min"] + ref["max"]) / 2)
        
        # 범위 내에 있으면 80-100점
        if ref["min"] <= value <= ref["max"]:
            deviation = abs(value - optimal) / max(abs(ref["max"] - optimal), abs(optimal - ref["min"]))
            return 100 - (deviation * 20)
        
        # 범위 밖
        if value < ref["min"]:
            distance = ref["min"] - value
            max_distance = ref["min"] * 0.5  # 50% 이상 벗어나면 최저점
            return max(20, 80 - (distance / max_distance) * 60)
        else:
            distance = value - ref["max"]
            max_distance = ref["max"] * 0.5
            return max(20, 80 - (distance / max_distance) * 60)
    
    elif "max" in ref:  # 낮을수록 좋음 (jitter, shimmer 등)
        optimal = ref.get("optimal", 0)
        if value <= optimal:
            return 100
        elif value <= ref["max"]:
            return 100 - (value - optimal) / (ref["max"] - optimal) * 20
        else:
            excess = value - ref["max"]
            return max(20, 80 - excess / ref["max"] * 60)
    
    elif "min" in ref:  # 높을수록 좋음 (HNR 등)
        optimal = ref.get("optimal", ref["min"] * 1.5)
        if value >= optimal:
            return 100
        elif value >= ref["min"]:
            return 80 + (value - ref["min"]) / (optimal - ref["min"]) * 20
        else:
            return max(20, 80 * value / ref["min"])
    
    return 50  # 기준 없음


def calculate_interview_scores(
    fluency: Dict,
    pause_analysis: Dict,
    prosody: Dict,
    formants: Dict,
    voice_quality: Dict,
    rhythm: Dict,
    text_disfluency: Dict
) -> Dict:
    """
    학술 기반 종합 면접 점수 계산
    """
    scores = {}
    
    # ========================================
    # 1. FLUENCY SCORE (유창성) - 25%
    # ========================================
    ar_score = normalize_score(fluency["articulation_rate"], REFERENCE_NORMS["articulation_rate"])
    ptr_score = normalize_score(fluency["phonation_time_ratio"], REFERENCE_NORMS["phonation_time_ratio"])
    mlr_score = normalize_score(fluency["mean_length_of_runs"], REFERENCE_NORMS["mean_length_of_runs"])
    
    # 텍스트 기반 disfluency 감점
    disfluency_penalty = min(20, text_disfluency.get("disfluency_rate", 0) * 2)
    
    fluency_score = (ar_score * 0.4 + ptr_score * 0.3 + mlr_score * 0.3) - disfluency_penalty
    fluency_score = max(0, min(100, fluency_score))
    
    scores["fluency"] = {
        "score": round(fluency_score, 1),
        "level": get_level(fluency_score),
        "details": {
            "articulation_rate_score": round(ar_score, 1),
            "articulation_rate_value": fluency["articulation_rate"],
            "phonation_ratio_score": round(ptr_score, 1),
            "phonation_ratio_value": fluency["phonation_time_ratio"],
            "mean_run_length_score": round(mlr_score, 1),
            "mean_run_length_value": fluency["mean_length_of_runs"],
            "disfluency_penalty": round(disfluency_penalty, 1)
        },
        "academic_reference": "Kormos (2006): AR=4-6 syll/s, PTR=0.6-0.8"
    }
    
    # ========================================
    # 2. HESITATION SCORE (뜸들임) - 20%
    # ========================================
    spr_score = normalize_score(pause_analysis["silent_pause_rate"], REFERENCE_NORMS["silent_pause_rate"])
    mpd_score = normalize_score(pause_analysis["mean_pause_duration"], REFERENCE_NORMS["mean_pause_duration"])
    lpr_score = normalize_score(pause_analysis["long_pause_ratio"], REFERENCE_NORMS["long_pause_ratio"], False)
    
    hesitation_score = spr_score * 0.4 + mpd_score * 0.35 + lpr_score * 0.25
    
    scores["hesitation"] = {
        "score": round(hesitation_score, 1),
        "level": get_level(hesitation_score),
        "details": {
            "pause_rate_score": round(spr_score, 1),
            "pause_rate_value": pause_analysis["silent_pause_rate"],
            "pause_duration_score": round(mpd_score, 1),
            "pause_duration_value": pause_analysis["mean_pause_duration"],
            "long_pause_ratio_score": round(lpr_score, 1),
            "long_pause_ratio_value": pause_analysis["long_pause_ratio"]
        },
        "academic_reference": "Goldman-Eisler (1968): 5-15 pauses/min, 0.3-0.8s duration"
    }
    
    # ========================================
    # 3. CONFIDENCE SCORE (자신감) - 20%
    # ========================================
    intensity_score = 100 - min(30, max(0, voice_quality.get("intensity_std", prosody["intensity_std"]) - 10) * 3)
    f0_stability_score = normalize_score(prosody["f0_variation_cv"], REFERENCE_NORMS["f0_variation_cv"])
    hnr_score = normalize_score(voice_quality["hnr_mean_db"], REFERENCE_NORMS["hnr_db"])
    energy_score = voice_quality["energy_consistency"] * 100
    
    confidence_score = intensity_score * 0.25 + f0_stability_score * 0.25 + hnr_score * 0.25 + energy_score * 0.25
    
    scores["confidence"] = {
        "score": round(confidence_score, 1),
        "level": get_level(confidence_score),
        "details": {
            "intensity_stability_score": round(intensity_score, 1),
            "intensity_stability_value_db": prosody["intensity_std"],
            "pitch_stability_score": round(f0_stability_score, 1),
            "pitch_stability_value": prosody["f0_variation_cv"],
            "voice_clarity_score": round(hnr_score, 1),
            "voice_clarity_value_db": voice_quality["hnr_mean_db"],
            "energy_consistency_score": round(energy_score, 1),
            "energy_consistency_percent": voice_quality["energy_consistency"]
        },
        "academic_reference": "MIT Media Lab: Stable intensity + F0 = higher confidence"
    }
    
    # ========================================
    # 4. EXPRESSIVENESS SCORE (표현력) - 15%
    # ========================================
    f0_range_score = normalize_score(prosody["f0_range"], REFERENCE_NORMS["f0_range"])
    npvi_score = normalize_score(rhythm["npvi"], REFERENCE_NORMS["npvi"])
    
    contour_bonus = 5 if prosody["f0_contour"] != "flat" else 0
    
    expressiveness_score = f0_range_score * 0.5 + npvi_score * 0.3 + prosody["loudness_peaks_per_second"] * 3 + contour_bonus
    expressiveness_score = min(100, max(0, expressiveness_score))
    
    scores["expressiveness"] = {
        "score": round(expressiveness_score, 1),
        "level": get_level(expressiveness_score),
        "details": {
            "pitch_range_score": round(f0_range_score, 1),
            "pitch_range_value_hz": prosody["f0_range"],
            "rhythm_variability_score": round(npvi_score, 1),
            "rhythm_variability_npvi": rhythm["npvi"],
            "intonation_pattern": prosody["f0_contour"]
        },
        "academic_reference": "eGeMAPS: F0 range 50-150Hz; Grabe&Low: nPVI 40-70"
    }
    
    # ========================================
    # 5. CLARITY SCORE (명확도) - 10%
    # ========================================
    jitter_score = normalize_score(voice_quality["jitter_percent"], REFERENCE_NORMS["jitter_percent"], False)
    shimmer_score = normalize_score(voice_quality["shimmer_percent"], REFERENCE_NORMS["shimmer_percent"], False)
    
    # Formant 안정성 (분산이 적절할수록 좋음)
    formant_score = 80  # 기본값
    if formants.get("analysis_method") == "praat_burg" and formants["f1_mean"] > 0:
        formant_score = 90 if 300 < formants["f1_mean"] < 900 else 70
    
    clarity_score = jitter_score * 0.3 + shimmer_score * 0.3 + formant_score * 0.2 + hnr_score * 0.2
    
    scores["clarity"] = {
        "score": round(clarity_score, 1),
        "level": get_level(clarity_score),
        "details": {
            "jitter_score": round(jitter_score, 1),
            "jitter_percent": voice_quality["jitter_percent"],
            "shimmer_score": round(shimmer_score, 1),
            "shimmer_percent": voice_quality["shimmer_percent"],
            "formant_quality_score": round(formant_score, 1),
            "formant_f1_hz": formants.get("f1_mean", 0)
        },
        "academic_reference": "GRBAS: Jitter<1%, Shimmer<3%, HNR>10dB"
    }
    
    # ========================================
    # 6. RHYTHM SCORE (리듬) - 10%
    # ========================================
    vocalic_score = normalize_score(rhythm["vocalic_percentage"], {"min": 50, "max": 75, "optimal": 65})
    npvi_raw_score = normalize_score(rhythm["npvi"], REFERENCE_NORMS["npvi"])
    
    rhythm_score = vocalic_score * 0.5 + npvi_raw_score * 0.5
    
    scores["rhythm"] = {
        "score": round(rhythm_score, 1),
        "level": get_level(rhythm_score),
        "details": {
            "vocalic_percentage_score": round(vocalic_score, 1),
            "vocalic_percent": rhythm["vocalic_percentage"],
            "npvi_score": round(npvi_raw_score, 1),
            "npvi_value": rhythm["npvi"]
        },
        "academic_reference": "Grabe & Low (2002): Rhythm class indicators"
    }
    
    # ========================================
    # OVERALL SCORE (종합 점수)
    # ========================================
    overall = (
        scores["fluency"]["score"] * 0.25 +
        scores["hesitation"]["score"] * 0.20 +
        scores["confidence"]["score"] * 0.20 +
        scores["expressiveness"]["score"] * 0.15 +
        scores["clarity"]["score"] * 0.10 +
        scores["rhythm"]["score"] * 0.10
    )
    
    scores["overall"] = {
        "score": round(overall, 1),
        "level": get_level(overall),
        "weights": {
            "fluency": "25%",
            "hesitation": "20%", 
            "confidence": "20%",
            "expressiveness": "15%",
            "clarity": "10%",
            "rhythm": "10%"
        },
        "recommendations": generate_recommendations(scores)
    }
    
    return scores


def get_level(score: float) -> str:
    """점수 등급 반환"""
    if score >= 85:
        return "excellent"
    elif score >= 70:
        return "good"
    elif score >= 50:
        return "average"
    else:
        return "needs_improvement"


def generate_recommendations(scores: Dict) -> List[str]:
    """학술 기반 개선 권장사항 생성"""
    recommendations = []
    
    # 가장 낮은 점수 영역 찾기
    score_items = [
        (k, v["score"]) for k, v in scores.items() 
        if k != "overall" and isinstance(v, dict) and "score" in v
    ]
    score_items.sort(key=lambda x: x[1])
    
    for area, score in score_items[:2]:  # 하위 2개 영역
        if score < 70:
            if area == "fluency":
                recommendations.append(
                    "발화 유창성 향상 필요: 4-6음절/초 속도로 연습하고, "
                    "채움말 사용을 줄이세요. [Kormos, 2006]"
                )
            elif area == "hesitation":
                recommendations.append(
                    "일시정지 패턴 개선 필요: 분당 5-15회, 0.3-0.8초 범위를 "
                    "목표로 하세요. [Goldman-Eisler, 1968]"
                )
            elif area == "confidence":
                recommendations.append(
                    "음성 안정성 향상: 일정한 음량과 피치를 유지하면 "
                    "더 자신감 있게 들립니다. [MIT Media Lab]"
                )
            elif area == "expressiveness":
                recommendations.append(
                    "표현력 향상: 억양 변화(50-150Hz)와 리듬 변화를 주어 "
                    "생동감 있게 표현하세요. [eGeMAPS]"
                )
            elif area == "clarity":
                recommendations.append(
                    "음성 명료도 개선: 충분한 발성과 또렷한 발음을 "
                    "연습하세요. [GRBAS]"
                )
            elif area == "rhythm":
                recommendations.append(
                    "리듬감 향상: 발화와 휴지의 균형잡힌 패턴을 "
                    "연습하세요. [Grabe & Low, 2002]"
                )
    
    if not recommendations:
        recommendations.append(
            "전반적으로 우수한 발화입니다! 현재 수준을 유지하세요."
        )
    
    return recommendations


# ============================================================================
# MAIN FUNCTION
# ============================================================================

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python analyze_audio.py <audio_path> [whisper_json] [language]"}))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    whisper_json_str = sys.argv[2] if len(sys.argv) > 2 else ""
    language = sys.argv[3] if len(sys.argv) > 3 else "en"
    
    try:
        # 1. 오디오 로드
        y, sr = load_audio(audio_path)
        
        # 2. 파형 추출
        waveform = extract_waveform(y, sr)
        
        # 3. VAD - 발화/휴지 구간 탐지
        speech_segments, pause_segments = detect_speech_segments(y, sr)
        
        # 4. Whisper 데이터 파싱 (NEW)
        whisper_data = parse_whisper_data(whisper_json_str)
        transcript_text = whisper_data["text"]
        whisper_segments = whisper_data["segments"]
        
        # 5. 텍스트 기반 음절 수 계산 (CHANGED: 에너지 피크 → 텍스트 기반)
        syllable_count = count_syllables_from_text(transcript_text, language)
        
        # 6. Whisper 발화 시간 메트릭 추출 (NEW)
        whisper_metrics = get_whisper_phonation_metrics(whisper_segments)
        
        # 7. 유창성 메트릭 (Whisper 데이터 활용)
        fluency = calculate_fluency_metrics(
            y, sr, speech_segments, pause_segments, 
            syllable_count, whisper_metrics
        )
        
        # 8. 일시정지 분석
        pause_analysis = analyze_pause_patterns(pause_segments, fluency["total_duration"])
        
        # 9. 운율 특성 (eGeMAPS) - 변경 없음
        prosody = extract_prosodic_features(y, sr)
        
        # 10. 포먼트 분석 (Praat) - 변경 없음
        formants = extract_formant_features(y, sr)
        
        # 11. 음성 품질 (GRBAS) - 변경 없음
        voice_quality = analyze_voice_quality(y, sr)
        
        # 12. 리듬 메트릭 - 변경 없음
        rhythm = calculate_rhythm_metrics(speech_segments, pause_segments)
        
        # 13. 텍스트 기반 disfluency 분석
        text_disfluency = analyze_text_disfluency(transcript_text, language)
        
        # 14. 종합 면접 점수
        interview_scores = calculate_interview_scores(
            fluency, pause_analysis, prosody, formants,
            voice_quality, rhythm, text_disfluency
        )
        
        # 결과 구성
        result = {
            "waveform": waveform,
            "pauses": pause_analysis["pauses"],
            
            # 학술 기반 상세 분석
            "academic_analysis": {
                "fluency_metrics": fluency,
                "pause_analysis": pause_analysis,
                "prosodic_features": prosody,
                "formant_analysis": formants,
                "voice_quality": voice_quality,
                "rhythm_metrics": rhythm,
                "text_disfluency": text_disfluency,
                "reference_norms": REFERENCE_NORMS
            },
            
            # 기존 호환성
            "speech_rate": {
                "total_duration": fluency["total_duration"],
                "speech_duration": fluency["phonation_time"],
                "speech_ratio": fluency["phonation_time_ratio"],
                "silence_ratio": round(1 - fluency["phonation_time_ratio"], 3)
            },
            "volume": {
                "mean_volume_db": prosody["intensity_mean_db"],
                "volume_std": prosody["intensity_std"],
                "dynamic_range": prosody["intensity_range"]
            },
            "pitch": {
                "mean_pitch_hz": prosody["f0_mean"],
                "pitch_std": prosody["f0_std"],
                "pitch_range": prosody["f0_range"],
                "pitch_variation": prosody["f0_variation_cv"]
            },
            
            # 면접 점수
            "interview_scores": interview_scores
        }
        
        print(json.dumps(result, ensure_ascii=False, cls=NumpyEncoder))
        
    except Exception as e:
        import traceback
        print(json.dumps({
            "error": str(e),
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)


def analyze_audio(audio_path: str, whisper_json_str: str = "", language: str = "ko") -> dict:
    """
    음성 분석 API 진입점
    
    Args:
        audio_path: 음성 파일 경로
        whisper_json_str: Whisper STT 결과 JSON 문자열 (선택)
        language: 분석 언어 ("ko" | "en")
    
    Returns:
        분석 결과 딕셔너리
    """
    try:
        y, sr = load_audio(audio_path)
        waveform = extract_waveform(y, sr)
        speech_segments, pause_segments = detect_speech_segments(y, sr)
        whisper_data = parse_whisper_data(whisper_json_str)
        transcript_text = whisper_data["text"]
        whisper_segments = whisper_data["segments"]
        syllable_count = count_syllables_from_text(transcript_text, language)
        whisper_metrics = get_whisper_phonation_metrics(whisper_segments)
        fluency = calculate_fluency_metrics(
            y, sr, speech_segments, pause_segments,
            syllable_count, whisper_metrics
        )
        pause_analysis = analyze_pause_patterns(pause_segments, fluency["total_duration"])
        prosody = extract_prosodic_features(y, sr)
        formants = extract_formant_features(y, sr)
        voice_quality = analyze_voice_quality(y, sr)
        rhythm = calculate_rhythm_metrics(speech_segments, pause_segments)
        text_disfluency = analyze_text_disfluency(transcript_text, language)
        interview_scores = calculate_interview_scores(
            fluency, pause_analysis, prosody, formants,
            voice_quality, rhythm, text_disfluency
        )

        return {
            "success": True,
            "waveform": waveform,
            "pauses": pause_analysis["pauses"],
            "academic_analysis": {
                "fluency_metrics": fluency,
                "pause_analysis": pause_analysis,
                "prosodic_features": prosody,
                "formant_analysis": formants,
                "voice_quality": voice_quality,
                "rhythm_metrics": rhythm,
                "text_disfluency": text_disfluency,
                "reference_norms": REFERENCE_NORMS,
            },
            "speech_rate": {
                "total_duration": fluency["total_duration"],
                "speech_duration": fluency["phonation_time"],
                "speech_ratio": fluency["phonation_time_ratio"],
                "silence_ratio": round(1 - fluency["phonation_time_ratio"], 3),
            },
            "volume": {
                "mean_volume_db": prosody["intensity_mean_db"],
                "volume_std": prosody["intensity_std"],
                "dynamic_range": prosody["intensity_range"],
            },
            "pitch": {
                "mean_pitch_hz": prosody["f0_mean"],
                "pitch_std": prosody["f0_std"],
                "pitch_range": prosody["f0_range"],
                "pitch_variation": prosody["f0_variation_cv"],
            },
            "interview_scores": interview_scores,
        }
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


if __name__ == "__main__":
    main()
