"""
Gemini Live Q&A WebSocket test script
- Server must be running (python main.py)
- Test Gemini Live voice response with text input
"""

import asyncio
import json
import httpx
import websockets
import wave
import os

SERVER_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000"

# File to save received audio (24kHz 16-bit mono PCM)
OUTPUT_WAV = "test_output.wav"


async def create_session() -> str:
    """1. Create session with REST API"""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SERVER_URL}/api/live-question/session",
            json={
                "student_info": {"name": "TestStudent", "id": "T001"},
                "exam_info": {
                    "name": "Data Structure Test",
                    "content": "Evaluation of Stack concepts and applications.",
                    "first_question": "Please explain what a Stack is. Also mention its characteristics and real-world examples.",
                },
                "rag_keys": None,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        session_id = data["session_id"]
        print(f"[OK] Session created: {session_id}")
        return session_id


async def run_ws_test(session_id: str):
    """2. Connect WebSocket -> Send text -> Receive audio response"""
    uri = f"{WS_URL}/api/live-question/ws/{session_id}"

    audio_chunks = []

    print(f"[Connect] Connecting to WebSocket: {uri}")
    async with websockets.connect(uri) as ws:

        # -- Wait for ready message --
        raw = await asyncio.wait_for(ws.recv(), timeout=15)
        msg = json.loads(raw)
        print(f"📨 Server: {msg}")

        if msg.get("type") != "ready":
            print("[Error] Did not receive ready message.")
            return

        # -- Send text input --
        text_input = "Hello. A stack is LIFO. Is that right?"
        print(f"\n📤 Sent text: {text_input}")
        await ws.send(json.dumps({"type": "text", "content": text_input}))

        # -- Response receive loop --
        print("\n🎧 Waiting for response... (15s timeout)")
        turn_done = False
        while not turn_done:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=15)

                # Binary = Audio PCM
                if isinstance(raw, bytes):
                    audio_chunks.append(raw)
                    print(f"   🔊 Received audio: {len(raw)} bytes (total {sum(len(c) for c in audio_chunks)} bytes)")

                # JSON = Control message
                else:
                    msg = json.loads(raw)
                    msg_type = msg.get("type", "")
                    print(f"   📨 {msg_type}: {msg.get('message', '')}")

                    if msg_type == "turn_complete":
                        print("\n[OK] Gemini response complete!")
                        turn_done = True

                    elif msg_type == "error":
                        print(f"\n[Error] Error: {msg.get('message')}")
                        turn_done = True

                    elif msg_type in ("tool_call_start", "tool_call_end"):
                        pass  # RAG search status message

            except asyncio.TimeoutError:
                print("\n⏱️ Timeout (no response within 15s)")
                break

        # -- End session --
        await ws.send(json.dumps({"type": "end"}))
        print("👋 Sent session end")

    # -- Save audio --
    if audio_chunks:
        total_audio = b"".join(audio_chunks)
        with wave.open(OUTPUT_WAV, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)          # 16-bit
            wf.setframerate(24000)      # 24kHz
            wf.writeframes(total_audio)
        print(f"\n💾 Audio saved: {OUTPUT_WAV} ({len(total_audio)} bytes, {len(total_audio)/48000:.1f}s)")
        print(f"   -> Open the file to play!")
    else:
        print("\n[Warning] No audio received")


async def main():
    print("=" * 50)
    print("🎙️ Gemini Live Q&A WebSocket Test")
    print("=" * 50)

    # Server healthcheck
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{SERVER_URL}/api/health", timeout=3)
            print(f"🟢 Server status: {resp.json()['status']}\n")
    except Exception:
        print("❌ Cannot connect to server. Start server with 'python main.py' first.")
        return

    # Create session
    session_id = await create_session()

    # WebSocket test
    await run_ws_test(session_id)

    print("\n" + "=" * 50)
    print("Test complete!")


if __name__ == "__main__":
    asyncio.run(main())
