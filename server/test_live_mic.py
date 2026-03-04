"""
Gemini Live Q&A - 실시간 마이크/스피커 대화 테스트
- 마이크로 말하면 → WebSocket → Gemini → 스피커로 응답

실행 전:
  1. python main.py  (서버 실행)
  2. python test_live_mic.py

Ctrl+C로 종료
"""

import asyncio
import json
import threading
import httpx
import websockets
import pyaudio

# ====== 설정 ======
SERVER_URL = "http://localhost:8000"
WS_URL     = "ws://localhost:8000"

# 오디오 포맷
FORMAT           = pyaudio.paInt16
CHANNELS         = 1
SEND_SAMPLE_RATE   = 16000  # 마이크: 16kHz → Gemini
RECEIVE_SAMPLE_RATE = 24000  # 스피커: 24kHz ← Gemini
CHUNK_SIZE       = 1024     # 마이크 읽기 단위 (bytes)


async def create_session() -> str:
    """세션 생성"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{SERVER_URL}/api/live-question/session",
            json={
                "student_info": {"name": "실시간테스트", "id": "MIC001"},
                "exam_info": {
                    "name": "실시간 음성 테스트",
                    "content": "자유롭게 대화해보세요.",
                },
                "rag_keys": None,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        print(f"✅ 세션 생성: {data['session_id']}")
        return data["session_id"]


async def mic_to_ws(ws, pya: pyaudio.PyAudio, stop_event: asyncio.Event):
    """마이크 오디오 → WebSocket 전송"""
    mic_info = pya.get_default_input_device_info()
    stream = await asyncio.to_thread(
        pya.open,
        format=FORMAT,
        channels=CHANNELS,
        rate=SEND_SAMPLE_RATE,
        input=True,
        input_device_index=mic_info["index"],
        frames_per_buffer=CHUNK_SIZE,
    )
    print(f"🎙️  마이크 시작: {mic_info['name']} ({SEND_SAMPLE_RATE}Hz)")
    try:
        while not stop_event.is_set():
            data = await asyncio.to_thread(
                stream.read, CHUNK_SIZE, **{"exception_on_overflow": False}
            )
            await ws.send(data)
    finally:
        stream.stop_stream()
        stream.close()


async def ws_to_speaker(ws, pya: pyaudio.PyAudio, stop_event: asyncio.Event):
    """WebSocket 수신 → 스피커 재생"""
    speaker = await asyncio.to_thread(
        pya.open,
        format=FORMAT,
        channels=CHANNELS,
        rate=RECEIVE_SAMPLE_RATE,
        output=True,
    )
    print(f"🔊 스피커 준비: {RECEIVE_SAMPLE_RATE}Hz\n")
    print("─" * 50)
    print("말씀하세요! (Ctrl+C로 종료)")
    print("─" * 50)
    try:
        while not stop_event.is_set():
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=0.1)

                # 바이너리 = 오디오 PCM → 스피커 재생
                if isinstance(msg, bytes):
                    await asyncio.to_thread(speaker.write, msg)

                # JSON = 상태 메시지
                else:
                    data = json.loads(msg)
                    msg_type = data.get("type", "")

                    if msg_type == "turn_complete":
                        print("\n[Gemini 응답 완료]\n" + "─" * 50)
                    elif msg_type == "transcript":
                        print(f"[텍스트] {data.get('message', '')}")
                    elif msg_type == "tool_call_start":
                        print("[🔍 학습 자료 검색 중...]")
                    elif msg_type == "tool_call_end":
                        print("[✅ 검색 완료, 응답 생성 중...]")
                    elif msg_type == "error":
                        print(f"[❌ 오류] {data.get('message', '')}")
                        stop_event.set()

            except asyncio.TimeoutError:
                continue
    finally:
        speaker.stop_stream()
        speaker.close()


async def run_mic_test():
    """메인 실행"""
    print("=" * 50)
    print("🎙️  Gemini Live - 실시간 마이크 대화 테스트")
    print("=" * 50)

    # 서버 확인
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{SERVER_URL}/api/health", timeout=3)
            print(f"🟢 서버 상태: {resp.json()['status']}\n")
    except Exception:
        print("❌ 서버에 연결할 수 없습니다. 먼저 서버를 시작하세요: python main.py")
        return

    # 세션 생성
    session_id = await create_session()
    uri = f"{WS_URL}/api/live-question/ws/{session_id}"

    pya = pyaudio.PyAudio()
    stop_event = asyncio.Event()

    try:
        async with websockets.connect(uri, max_size=None) as ws:
            # ready 대기
            raw = await asyncio.wait_for(ws.recv(), timeout=15)
            msg = json.loads(raw)
            if msg.get("type") != "ready":
                print(f"❌ 예상치 못한 응답: {msg}")
                return
            print(f"✅ Gemini Live 연결됨\n")

            # 마이크 → WS, WS → 스피커 동시 실행
            async with asyncio.TaskGroup() as tg:
                tg.create_task(mic_to_ws(ws, pya, stop_event))
                tg.create_task(ws_to_speaker(ws, pya, stop_event))

    except KeyboardInterrupt:
        print("\n\n종료 중...")
        stop_event.set()
        try:
            async with websockets.connect(uri) as ws:
                await ws.send(json.dumps({"type": "end"}))
        except Exception:
            pass
    finally:
        pya.terminate()
        print("👋 종료됨")


if __name__ == "__main__":
    try:
        asyncio.run(run_mic_test())
    except KeyboardInterrupt:
        print("\n종료")
