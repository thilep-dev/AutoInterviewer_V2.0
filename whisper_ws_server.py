import asyncio
import websockets
import whisper
import numpy as np
import tempfile
import os
os.environ["TMPDIR"] = "D:/Projects/AI_v2.0/tmp"

model = whisper.load_model("base")

async def transcribe(websocket):
    print("Client connected")
    audio_chunks = []
    try:
        async for message in websocket:
            audio_chunks.append(message)
            if len(audio_chunks) >= 8:  # ~2 seconds if chunked at 250ms
                with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
                    for chunk in audio_chunks:
                        f.write(chunk)
                    f.flush()
                    temp_path = f.name
                try:
                    result = model.transcribe(temp_path)
                    print("Transcript:", result["text"])
                    await websocket.send(result["text"])
                finally:
                    os.remove(temp_path)
                audio_chunks.clear()
    except websockets.ConnectionClosed:
        print("Client disconnected")

async def main():
    async with websockets.serve(transcribe, "localhost", 9090, max_size=2**24, max_queue=32):
        print("Whisper WebSocket server running on ws://localhost:9090")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())