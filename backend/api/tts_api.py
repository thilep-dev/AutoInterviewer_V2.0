from TTS.api import TTS
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io

router = APIRouter()

# Initialize TTS model
tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False)

class TTSRequest(BaseModel):
    text: str

@router.post("/synthesize")
async def synthesize_speech(request: TTSRequest):
    try:
        # Create a buffer to store the audio
        audio_buffer = io.BytesIO()
        
        # Generate speech
        tts.tts_to_file(
            text=request.text,
            file_path=audio_buffer,
            speaker_wav=None  # You can add a reference audio for voice cloning
        )
        
        # Reset buffer position
        audio_buffer.seek(0)
        
        # Return the audio as a streaming response
        return StreamingResponse(
            audio_buffer,
            media_type="audio/wav",
            headers={
                "Content-Disposition": f'attachment; filename="speech.wav"'
            }
        )
    except Exception as e:
        return {"error": str(e)} 