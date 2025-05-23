from fastapi import APIRouter, UploadFile, File
import fitz  # PyMuPDF
import tempfile
import os

router = APIRouter()

@router.post("/parse-resume")
async def parse_resume(resume_file: UploadFile = File(...)):
    try:
        # Save the uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await resume_file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        # Extract text from PDF
        doc = fitz.open(temp_file_path)
        text = ""
        for page in doc:
            text += page.get_text()

        # Clean up
        doc.close()
        os.unlink(temp_file_path)

        # Basic information extraction (you can enhance this with more sophisticated parsing)
        lines = text.split('\n')
        info = {
            "full_text": text,
            "name": lines[0] if lines else "",
            "email": next((line for line in lines if '@' in line), ""),
            "phone": next((line for line in lines if any(c.isdigit() for c in line)), ""),
            "skills": [line.strip() for line in lines if any(skill in line.lower() for skill in 
                ["python", "java", "javascript", "react", "node", "sql", "aws", "docker"])],
            "experience": [line.strip() for line in lines if any(exp in line.lower() for exp in 
                ["experience", "worked", "job", "position", "role"])]
        }

        return info

    except Exception as e:
        return {"error": str(e)} 