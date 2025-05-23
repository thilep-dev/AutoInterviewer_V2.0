from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status
import os
import jwt
import time
import json
from typing import Optional, Dict
from pydantic import BaseModel

router = APIRouter()

# LiveKit configuration
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "secret")
LIVEKIT_HOST = os.getenv("LIVEKIT_HOST", "http://localhost:7880")

# Store active connections
active_connections: Dict[str, WebSocket] = {}

class RoomRequest(BaseModel):
    room_name: str

class TokenRequest(BaseModel):
    room_name: str
    identity: str
    name: Optional[str] = None

@router.post("/create-room")
async def create_room(request: RoomRequest):
    try:
        return {
            "room": {
                "name": request.room_name,
                "num_participants": len([c for c in active_connections.values() if c.room_name == request.room_name]),
                "metadata": "",
                "creation_time": int(time.time())
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/get-token")
async def get_token(request: TokenRequest):
    try:
        # Create a JWT token for LiveKit
        now = int(time.time())
        exp = now + 3600  # Token expires in 1 hour

        # Create the token payload
        payload = {
            "iss": LIVEKIT_API_KEY,
            "sub": request.identity,
            "exp": exp,
            "nbf": now,
            "name": request.name or request.identity,
            "video": {
                "room": request.room_name,
                "roomJoin": True
            }
        }

        # Sign the token
        token = jwt.encode(
            payload,
            LIVEKIT_API_SECRET,
            algorithm="HS256"
        )

        return {"token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, room_name: str, identity: str):
        await websocket.accept()
        connection_id = f"{room_name}:{identity}"
        self.active_connections[connection_id] = websocket
        return connection_id

    def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]

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

@router.websocket("/ws/{room_name}/{identity}")
async def websocket_endpoint(websocket: WebSocket, room_name: str, identity: str):
    connection_id = None
    try:
        print(f"Attempting WebSocket connection for room: {room_name}, identity: {identity}")
        
        # Accept the connection with CORS headers
        await websocket.accept()
        connection_id = f"{room_name}:{identity}"
        manager.active_connections[connection_id] = websocket
        
        print(f"WebSocket connection accepted: {connection_id}")
        
        # Send welcome message
        welcome_message = json.dumps({
            "type": "system",
            "message": f"Welcome to room {room_name}!",
            "sender": "system"
        })
        print(f"Sending welcome message: {welcome_message}")
        await websocket.send_text(welcome_message)
        
        while True:
            try:
                data = await websocket.receive_text()
                print(f"Received message from {connection_id}: {data}")
                
                # Parse the incoming message
                try:
                    message_data = json.loads(data)
                    if isinstance(message_data, str):
                        message_data = {"message": message_data}
                except json.JSONDecodeError:
                    message_data = {"message": data}
                
                # Broadcast the message to the room
                broadcast_message = message_data.get("message", data)
                print(f"Broadcasting message: {broadcast_message}")
                await manager.broadcast_to_room(
                    room_name,
                    broadcast_message,
                    identity,
                    connection_id
                )
            except WebSocketDisconnect:
                print(f"WebSocket disconnected: {connection_id}")
                break
            except Exception as e:
                print(f"Error processing message: {str(e)}")
                error_message = json.dumps({
                    "type": "error",
                    "message": f"Error processing message: {str(e)}",
                    "sender": "system"
                })
                await websocket.send_text(error_message)
    except WebSocketDisconnect:
        print(f"Client disconnected: {connection_id}")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        if connection_id:
            try:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": f"Connection error: {str(e)}",
                    "sender": "system"
                }))
            except:
                pass
    finally:
        if connection_id:
            print(f"Cleaning up connection: {connection_id}")
            manager.disconnect(connection_id)
            try:
                # Notify other participants
                await manager.broadcast_to_room(
                    room_name,
                    f"{identity} has left the room",
                    "system",
                    connection_id
                )
            except Exception as e:
                print(f"Error broadcasting disconnect message: {str(e)}") 