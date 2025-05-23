from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import uvicorn
from models.candidate import Base
from api import whisper_api, tts_api, llm_api, resume_api, candidates_api, livekit_api
from db import engine, SessionLocal, get_db
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
import websockets
import subprocess
import numpy as np
import time

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Interview Platform", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # <-- Use your frontend's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # In production, replace with your actual domain
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_locks: Dict[str, asyncio.Lock] = {}

    async def connect(self, websocket: WebSocket, room_name: str, identity: str) -> str:
        connection_id = f"{room_name}:{identity}"
        if connection_id not in self.connection_locks:
            self.connection_locks[connection_id] = asyncio.Lock()
        
        async with self.connection_locks[connection_id]:
            if connection_id in self.active_connections:
                try:
                    await self.active_connections[connection_id].close()
                except:
                    pass
            self.active_connections[connection_id] = websocket
            return connection_id

    def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        if connection_id in self.connection_locks:
            del self.connection_locks[connection_id]

    async def broadcast_to_room(self, room_name: str, message: str, sender: str, exclude: str = None):
        for conn_id, conn in self.active_connections.items():
            if conn_id.startswith(f"{room_name}:") and conn_id != exclude:
                try:
                    await conn.send_text(json.dumps({
                        "type": "message",
                        "message": message,
                        "sender": sender
                    }))
                except:
                    pass

manager = ConnectionManager()

# Add WebSocket endpoint for chat
@app.websocket("/ws/chat/{room_name}/{identity}")
async def chat_websocket(websocket: WebSocket, room_name: str, identity: str):
    connection_id = None
    try:
        print(f"Attempting chat WebSocket connection for room: {room_name}, identity: {identity}")
        
        # Accept the connection
        await websocket.accept()
        connection_id = await manager.connect(websocket, room_name, identity)
        print(f"Chat WebSocket connection accepted: {connection_id}")
        
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "system",
            "message": f"Welcome to room {room_name}!",
            "sender": "system"
        }))
        
        # Main message loop
        while True:
            try:
                data = await websocket.receive_text()
                print(f"Received message from {connection_id}: {data}")
                
                try:
                    message_data = json.loads(data)
                    if isinstance(message_data, str):
                        message_data = {"message": message_data}
                    
                    # Handle init message
                    if message_data.get("type") == "init":
                        print(f"Received init message from {connection_id}")
                        await websocket.send_text(json.dumps({
                            "type": "system",
                            "message": "Connection initialized successfully",
                            "sender": "system"
                        }))
                        # Keep the connection alive
                        continue
                    
                    # Handle ping message
                    if message_data.get("type") == "ping":
                        print(f"Received ping from {connection_id}")
                        await websocket.send_text(json.dumps({
                            "type": "pong",
                            "message": "pong",
                            "sender": "system"
                        }))
                        continue
                    
                    # Handle regular messages
                    broadcast_message = message_data.get("message", data)
                    await manager.broadcast_to_room(
                        room_name,
                        broadcast_message,
                        identity,
                        connection_id
                    )
                except json.JSONDecodeError:
                    # Handle non-JSON messages
                    await manager.broadcast_to_room(
                        room_name,
                        data,
                        identity,
                        connection_id
                    )
            except WebSocketDisconnect:
                print(f"WebSocket disconnected: {connection_id}")
                break
            except Exception as e:
                print(f"Error processing message: {str(e)}")
                try:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"Error processing message: {str(e)}",
                        "sender": "system"
                    }))
                except:
                    break
    except WebSocketDisconnect:
        print(f"Client disconnected: {connection_id}")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
    finally:
        if connection_id:
            print(f"Cleaning up connection: {connection_id}")
            manager.disconnect(connection_id)
            try:
                await manager.broadcast_to_room(
                    room_name,
                    f"{identity} has left the room",
                    "system",
                    connection_id
                )
            except Exception as e:
                print(f"Error broadcasting disconnect message: {str(e)}")

def convert_to_pcm(input_bytes):
    process = subprocess.Popen(
        [
            'ffmpeg', '-i', 'pipe:0', '-f', 's16le', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', 'pipe:1'
        ],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    out, err = process.communicate(input=input_bytes)
    return out

def is_silence(pcm_data, threshold=100):
    arr = np.frombuffer(pcm_data, dtype=np.int16)
    return np.abs(arr).sum() < threshold

@app.websocket("/ws/audio_stream/{room_name}/{identity}")
async def audio_stream(websocket: WebSocket, room_name: str, identity: str):
    connection_id = f"{room_name}:{identity}"
    vosk_ws = None
    try:
        await websocket.accept()
        print(f"Audio WebSocket connection accepted: {connection_id}")
        
        # Send initial connection success message
        await websocket.send_text(json.dumps({
            "type": "system",
            "message": "Audio connection established",
            "sender": "system"
        }))
        
        # Connect to Vosk WebSocket server with retry logic
        max_retries = 3
        retry_delay = 1  # seconds
        
        for attempt in range(max_retries):
            try:
                vosk_ws = await websockets.connect("ws://localhost:2700")
                print(f"Connected to Vosk server on attempt {attempt + 1}")
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    raise Exception(f"Failed to connect to Vosk server after {max_retries} attempts: {str(e)}")
                print(f"Failed to connect to Vosk server (attempt {attempt + 1}): {str(e)}")
                await asyncio.sleep(retry_delay)
        
        async def forward_audio():
            audio_buffer = bytearray()
            CHUNK_SIZE = 16000 * 2 * 5  # 5 seconds of 16kHz 16-bit mono audio
            last_activity = time.time()
            
            while True:
                try:
                    # Set a timeout for receiving data
                    data = await asyncio.wait_for(websocket.receive_bytes(), timeout=10.0)
                    last_activity = time.time()
                    audio_buffer.extend(data)
                    
                    if len(audio_buffer) >= CHUNK_SIZE:
                        pcm_data = convert_to_pcm(audio_buffer)
                        if not is_silence(pcm_data):
                            await vosk_ws.send(pcm_data)
                        audio_buffer = bytearray()
                except asyncio.TimeoutError:
                    # Check if we've been inactive for too long
                    if time.time() - last_activity > 30:  # 30 seconds timeout
                        print(f"Connection {connection_id} timed out due to inactivity")
                        break
                    continue
                except Exception as e:
                    print(f"Error in forward_audio: {str(e)}")
                    break
        
        async def receive_transcript():
            try:
                async for message in vosk_ws:
                    if websocket.client_state.CONNECTED:
                        await websocket.send_text(message)
            except Exception as e:
                print(f"Error in receive_transcript: {str(e)}")
        
        # Run both tasks concurrently
        await asyncio.gather(forward_audio(), receive_transcript())
        
    except WebSocketDisconnect:
        print(f"Client disconnected: {connection_id}")
    except Exception as e:
        print(f"Audio stream error for {connection_id}: {str(e)}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Connection error: {str(e)}",
                "sender": "system"
            }))
        except:
            pass
    finally:
        if vosk_ws:
            await vosk_ws.close()
        try:
            await websocket.close()
        except:
            pass

# Include routers
app.include_router(whisper_api.router, prefix="/api/stt", tags=["Speech-to-Text"])
app.include_router(tts_api.router, prefix="/api/tts", tags=["Text-to-Speech"])
app.include_router(llm_api.router, prefix="/api/llm", tags=["LLM"])
app.include_router(resume_api.router, prefix="/api/resume", tags=["Resume"])
app.include_router(candidates_api.router, prefix="/api", tags=["Candidates"])
app.include_router(livekit_api.router, prefix="/api/livekit", tags=["LiveKit"])

# Basic health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 