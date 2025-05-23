import asyncio
import websockets
import json
from vosk import Model, KaldiRecognizer
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Path to your unzipped Vosk model
MODEL_PATH = "D:/Projects/AI_v2.0/vosk-model-small-en-us-0.15"

try:
    model = Model(MODEL_PATH)
    logger.info("Vosk model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Vosk model: {str(e)}")
    raise

async def recognize(websocket):
    client_id = id(websocket)
    logger.info(f"Client {client_id} connected")
    
    try:
        rec = KaldiRecognizer(model, 16000)
        rec.SetWords(True)
        
        # Send initial connection success message
        await websocket.send(json.dumps({
            "type": "system",
            "message": "Vosk connection established",
            "sender": "system"
        }))
        
        while True:
            try:
                data = await websocket.recv()
                if isinstance(data, bytes):
                    if rec.AcceptWaveform(data):
                        result = rec.Result()
                        print("SENDING FINAL:", result)
                        logger.debug(f"Result for client {client_id}: {result}")
                        await websocket.send(result)
                    else:
                        partial = rec.PartialResult()
                        print("SENDING PARTIAL:", partial)
                        if partial.strip():  # Only send non-empty partials
                            await websocket.send(partial)
                else:
                    logger.warning(f"Client {client_id} sent non-bytes data")
            except websockets.ConnectionClosed:
                logger.info(f"Client {client_id} disconnected")
                break
            except Exception as e:
                logger.error(f"Error processing data for client {client_id}: {str(e)}")
                try:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": f"Processing error: {str(e)}",
                        "sender": "system"
                    }))
                except:
                    break
    except Exception as e:
        logger.error(f"Error in recognize for client {client_id}: {str(e)}")
    finally:
        logger.info(f"Cleaning up connection for client {client_id}")

async def main():
    try:
        async with websockets.serve(
            recognize,
            "localhost",
            2700,
            max_size=2**24,
            max_queue=32,
            ping_interval=20,  # Send ping every 20 seconds
            ping_timeout=10,   # Wait 10 seconds for pong response
            close_timeout=5    # Wait 5 seconds for close handshake
        ):
            logger.info("Vosk WebSocket server running on ws://localhost:2700")
            await asyncio.Future()  # run forever
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        raise

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server stopped due to error: {str(e)}") 