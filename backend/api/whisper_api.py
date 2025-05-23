import whisper
from fastapi import APIRouter, UploadFile, File
from typing import Optional
import tempfile
import os

router = APIRouter()
model = whisper.load_model("base")  # You can use "tiny", "base", "small", "medium", or "large"

@router.post("/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    try:
        # Save the uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await audio_file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        # Transcribe the audio
        result = model.transcribe(temp_file_path)
        
        # Clean up the temporary file
        os.unlink(temp_file_path)
        
        return {
            "text": result["text"],
            "segments": result["segments"]
        }
    except Exception as e:
        return {"error": str(e)} 