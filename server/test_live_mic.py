"""
Gemini Live Q&A - Real-time mic/speaker conversation test
- Speak into mic -> WebSocket -> Gemini -> Respond via speaker

Before running:
  1. python main.py (Run server)
  2. python test_live_mic.py

Press Ctrl+C to exit
"""

import asyncio
import json
import threading
import httpx
import websockets
import pyaudio

# ====== Settings ======
SERVER_URL = "http://localhost:8000"
WS_URL     = "ws://localhost:8000"

# Audio format
FORMAT           = pyaudio.paInt16
CHANNELS         = 1
SEND_SAMPLE_RATE   = 16000  # Mic: 16kHz -> Gemini
RECEIVE_SAMPLE_RATE = 24000  # Speaker: 24kHz <- Gemini
CHUNK_SIZE       = 1024     # Mic read chunk size (bytes)


async def create_session() -> str:
    """Create Session"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{SERVER_URL}/api/live-question/session",
            json={
                "student_info": {"name": "RealTimeTest", "id": "MIC001"},
                "exam_info": {
                    "name": "Real-time Voice Test",
                    "content": "Feel free to converse.",
                },
                "rag_keys": None,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        print(f"[OK] Session created: {data['session_id']}")
        return data["session_id"]


async def mic_to_ws(ws, pya: pyaudio.PyAudio, stop_event: asyncio.Event):
    """Mic audio -> WebSocket send"""
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
    print(f"🎙️  Mic started: {mic_info['name']} ({SEND_SAMPLE_RATE}Hz)")
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
    """WebSocket receive -> Speaker play"""
    speaker = await asyncio.to_thread(
        pya.open,
        format=FORMAT,
        channels=CHANNELS,
        rate=RECEIVE_SAMPLE_RATE,
        output=True,
    )
    print(f"🔊 Speaker ready: {RECEIVE_SAMPLE_RATE}Hz\n")
    print("─" * 50)
    print("Speak now! (Press Ctrl+C to exit)")
    print("─" * 50)
    try:
        while not stop_event.is_set():
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=0.1)

                # Binary = Audio PCM -> Speaker play
                if isinstance(msg, bytes):
                    await asyncio.to_thread(speaker.write, msg)

                # JSON = Status message
                else:
                    data = json.loads(msg)
                    msg_type = data.get("type", "")

                    if msg_type == "turn_complete":
                        print("\n[Gemini Response Complete]\n" + "─" * 50)
                    elif msg_type == "transcript":
                        print(f"[Text] {data.get('message', '')}")
                    elif msg_type == "tool_call_start":
                        print("[🔍 Searching learning materials...]")
                    elif msg_type == "tool_call_end":
                        print("[✅ Search complete, generating response...]")
                    elif msg_type == "error":
                        print(f"[❌ Error] {data.get('message', '')}")
                        stop_event.set()

            except asyncio.TimeoutError:
                continue
    finally:
        speaker.stop_stream()
        speaker.close()


async def run_mic_test():
    """Main execution"""
    print("=" * 50)
    print("🎙️  Gemini Live - Real-time mic conversation test")
    print("=" * 50)

    # Check server
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{SERVER_URL}/api/health", timeout=3)
            print(f"🟢 Server status: {resp.json()['status']}\n")
    except Exception:
        print("❌ Cannot connect to server. Start server first: python main.py")
        return

    # Create session
    session_id = await create_session()
    uri = f"{WS_URL}/api/live-question/ws/{session_id}"

    pya = pyaudio.PyAudio()
    stop_event = asyncio.Event()

    try:
        async with websockets.connect(uri, max_size=None) as ws:
            # Wait for ready
            raw = await asyncio.wait_for(ws.recv(), timeout=15)
            msg = json.loads(raw)
            if msg.get("type") != "ready":
                print(f"❌ Unexpected response: {msg}")
                return
            print(f"[OK] Gemini Live connected\n")

            # Run Mic -> WS, WS -> Speaker concurrently
            async with asyncio.TaskGroup() as tg:
                tg.create_task(mic_to_ws(ws, pya, stop_event))
                tg.create_task(ws_to_speaker(ws, pya, stop_event))

    except KeyboardInterrupt:
        print("\n\nTerminating...")
        stop_event.set()
        try:
            async with websockets.connect(uri) as ws:
                await ws.send(json.dumps({"type": "end"}))
        except Exception:
            pass
    finally:
        pya.terminate()
        print("👋 Terminated")


if __name__ == "__main__":
    try:
        asyncio.run(run_mic_test())
    except KeyboardInterrupt:
        print("\nExit")
