# AI Interview Platform

An intelligent interview system that conducts voice-based interviews using AI, featuring speech-to-text, text-to-speech, and LLM capabilities.

## Features

- 🎤 Voice-based AI interviews
- 📝 Resume parsing and analysis
- 🧠 Dynamic question generation using LLM
- 🎯 Real-time interview feedback
- 📊 Candidate scoring and comparison
- 👥 HR dashboard for candidate management

## Tech Stack

### Backend
- FastAPI (Python)
- Whisper (Speech-to-Text)
- Coqui TTS (Text-to-Speech)
- Ollama with Mistral/LLaMA3 (LLM)
- PyMuPDF (Resume parsing)
- SQLite (Database)

### Frontend
- React
- Tailwind CSS
- shadcn/ui components
- Web Audio API
- WebRTC (future)

## Prerequisites

- Python 3.8+
- Node.js 16+
- Ollama installed locally
- FFmpeg (for audio processing)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-interview-platform.git
cd ai-interview-platform
```

2. Set up the backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up the frontend:
```bash
cd frontend
npm install
```

4. Create a `.env` file in the backend directory:
```env
DATABASE_URL=sqlite:///./interview_platform.db
OLLAMA_HOST=http://localhost:11434
```

## Running the Application

1. Start the backend server:
```bash
cd backend
uvicorn main:app --reload
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

3. Access the application at `http://localhost:5173`

## Usage

1. **Adding a Candidate**
   - Navigate to the HR Dashboard
   - Click "Add New Candidate"
   - Fill in candidate details and upload resume

2. **Starting an Interview**
   - From the HR Dashboard, click "Start Interview" on a candidate card
   - The AI will introduce itself and begin asking questions
   - Use the recording controls to capture candidate responses

3. **Monitoring Interviews**
   - View real-time transcript
   - See AI feedback and scoring
   - Access interview history

4. **Comparing Candidates**
   - Use the comparison view to evaluate multiple candidates
   - Compare scores, feedback, and interview performance

## API Endpoints

### Speech-to-Text
- `POST /api/stt/transcribe` - Convert audio to text

### Text-to-Speech
- `POST /api/tts/synthesize` - Convert text to speech

### LLM
- `POST /api/llm/generate_question` - Generate interview questions

### Resume
- `POST /api/resume/parse-resume` - Parse resume PDF

### Candidates
- `GET /api/candidates` - List all candidates
- `POST /api/candidates` - Add new candidate
- `GET /api/candidates/{id}` - Get candidate details
- `PUT /api/candidates/{id}` - Update candidate
- `DELETE /api/candidates/{id}` - Delete candidate

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Whisper for speech recognition
- Coqui TTS for text-to-speech
- Ollama for LLM capabilities
- FastAPI for the backend framework
- React and Tailwind CSS for the frontend 
