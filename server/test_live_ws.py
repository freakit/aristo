"""
Gemini Live Q&A WebSocket 테스트 스크립트
- 서버가 실행 중이어야 합니다 (python main.py)
- 텍스트 입력으로 Gemini Live 음성 응답 테스트
"""

import asyncio
import json
import httpx
import websockets
import wave
import os

SERVER_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000"

# 받은 오디오를 저장할 파일 (24kHz 16-bit mono PCM)
OUTPUT_WAV = "test_output.wav"


async def create_session() -> str:
    """1. REST API로 세션 생성"""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SERVER_URL}/api/live-question/session",
            json={
                "student_info": {"name": "테스트학생", "id": "T001"},
                "exam_info": {
                    "name": "테스트시험",
                    "content": "자료구조에서 스택(Stack)이란 무엇인지 설명해보세요.",
                },
                "rag_keys": None,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        session_id = data["session_id"]
        print(f"✅ 세션 생성됨: {session_id}")
        return session_id


async def run_ws_test(session_id: str):
    """2. WebSocket 연결 후 텍스트 전송 → 오디오 응답 수신"""
    uri = f"{WS_URL}/api/live-question/ws/{session_id}"

    audio_chunks = []

    print(f"🔗 WebSocket 연결 중: {uri}")
    async with websockets.connect(uri) as ws:

        # ── ready 메시지 대기 ──
        raw = await asyncio.wait_for(ws.recv(), timeout=15)
        msg = json.loads(raw)
        print(f"📨 서버: {msg}")

        if msg.get("type") != "ready":
            print("❌ ready 메시지를 받지 못했습니다.")
            return

        # ── 텍스트 입력 전송 ──
        text_input = "안녕하세요. 스택은 LIFO 구조입니다. 맞나요?"
        print(f"\n📤 텍스트 전송: {text_input}")
        await ws.send(json.dumps({"type": "text", "content": text_input}))

        # ── 응답 수신 루프 ──
        print("\n🎧 응답 대기 중... (15초 타임아웃)")
        turn_done = False
        while not turn_done:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=15)

                # 바이너리 = 오디오 PCM
                if isinstance(raw, bytes):
                    audio_chunks.append(raw)
                    print(f"   🔊 오디오 수신: {len(raw)} bytes (누적 {sum(len(c) for c in audio_chunks)} bytes)")

                # JSON = 제어 메시지
                else:
                    msg = json.loads(raw)
                    msg_type = msg.get("type", "")
                    print(f"   📨 {msg_type}: {msg.get('message', '')}")

                    if msg_type == "turn_complete":
                        print("\n✅ Gemini 응답 완료!")
                        turn_done = True

                    elif msg_type == "error":
                        print(f"\n❌ 에러: {msg.get('message')}")
                        turn_done = True

                    elif msg_type in ("tool_call_start", "tool_call_end"):
                        pass  # RAG 검색 상태 메시지

            except asyncio.TimeoutError:
                print("\n⏱️ 타임아웃 (15초 내 응답 없음)")
                break

        # ── 세션 종료 ──
        await ws.send(json.dumps({"type": "end"}))
        print("👋 세션 종료 전송")

    # ── 오디오 저장 ──
    if audio_chunks:
        total_audio = b"".join(audio_chunks)
        with wave.open(OUTPUT_WAV, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)          # 16-bit
            wf.setframerate(24000)      # 24kHz
            wf.writeframes(total_audio)
        print(f"\n💾 오디오 저장됨: {OUTPUT_WAV} ({len(total_audio)} bytes, {len(total_audio)/48000:.1f}초)")
        print(f"   → 파일을 열어서 재생해 보세요!")
    else:
        print("\n⚠️ 수신된 오디오 없음")


async def main():
    print("=" * 50)
    print("🎙️ Gemini Live Q&A WebSocket 테스트")
    print("=" * 50)

    # 서버 healthcheck
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{SERVER_URL}/api/health", timeout=3)
            print(f"🟢 서버 상태: {resp.json()['status']}\n")
    except Exception:
        print("❌ 서버에 연결할 수 없습니다. 먼저 'python main.py'로 서버를 시작하세요.")
        return

    # 세션 생성
    session_id = await create_session()

    # WebSocket 테스트
    await run_ws_test(session_id)

    print("\n" + "=" * 50)
    print("테스트 완료!")


if __name__ == "__main__":
    asyncio.run(main())
