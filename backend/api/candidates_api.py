from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from models.candidate import Candidate
from db import get_db
from pydantic import BaseModel
from typing import List, Optional
from fastapi.responses import FileResponse
import os
import shutil
from services.resume_parser import ResumeParser

router = APIRouter()

class CandidateCreate(BaseModel):
    name: str
    email: str
    phone: str
    experience: str
    resume_text: Optional[str] = None
    parsed_info: Optional[dict] = None

class CandidateOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    experience: str
    resume_text: Optional[str] = None

    class Config:
        orm_mode = True

@router.post("/candidates", response_model=CandidateOut)
def create_candidate(candidate: CandidateCreate, db: Session = Depends(get_db)):
    db_candidate = Candidate(
        name=candidate.name,
        email=candidate.email,
        phone=candidate.phone,
        experience=candidate.experience,
        resume_text=candidate.resume_text,
        parsed_info=candidate.parsed_info
    )
    db.add(db_candidate)
    db.commit()
    db.refresh(db_candidate)
    return db_candidate

@router.get("/candidates", response_model=List[CandidateOut])
def list_candidates(db: Session = Depends(get_db)):
    return db.query(Candidate).all()

# --- Added detail, update, and delete endpoints ---
from fastapi import Path

@router.get("/candidates/{candidate_id}", response_model=CandidateOut)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    experience: Optional[str] = None
    resume_text: Optional[str] = None
    parsed_info: Optional[dict] = None

@router.put("/candidates/{candidate_id}", response_model=CandidateOut)
def update_candidate(candidate_id: int, candidate: CandidateUpdate, db: Session = Depends(get_db)):
    db_candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    update_data = candidate.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_candidate, key, value)
    db.commit()
    db.refresh(db_candidate)
    return db_candidate

@router.delete("/candidates/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    db_candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.delete(db_candidate)
    db.commit()
    return {"ok": True}

RESUME_DIR = "resumes"  # Directory to store uploaded resumes
os.makedirs(RESUME_DIR, exist_ok=True)

@router.get("/candidates/{candidate_id}/resume")
def download_resume(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate or not candidate.resume_text:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume_path = os.path.join(RESUME_DIR, candidate.resume_text)
    if not os.path.isfile(resume_path):
        raise HTTPException(status_code=404, detail="Resume file not found")
    return FileResponse(resume_path, filename=os.path.basename(resume_path))

@router.post("/candidates/{candidate_id}/upload-resume")
async def upload_and_parse_resume(
    candidate_id: int,
    resume_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        # Save the file
        file_path = os.path.join(RESUME_DIR, resume_file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(resume_file.file, buffer)

        # Parse the resume
        parser = ResumeParser()
        parsed_info = parser.parse(file_path)

        # Update candidate record
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        # Update candidate fields with parsed info
        candidate.resume_text = resume_file.filename
        candidate.parsed_info = parsed_info
        
        # Optionally update other fields if they're empty
        if not candidate.email and parsed_info.get("email"):
            candidate.email = parsed_info["email"]
        if not candidate.phone and parsed_info.get("phone"):
            candidate.phone = parsed_info["phone"]
        if not candidate.experience and parsed_info.get("experience"):
            candidate.experience = parsed_info["experience"]

        db.commit()
        db.refresh(candidate)
        
        return {
            "ok": True,
            "parsed_info": parsed_info,
            "message": "Resume uploaded and parsed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 