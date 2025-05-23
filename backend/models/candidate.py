from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    resume_path = Column(String)
    experience = Column(String)
    resume_text = Column(String, nullable=True)  # stores filename
    parsed_info = Column(JSON, nullable=True)    # stores parsed resume info
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    interviews = relationship("Interview", back_populates="candidate")

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    job_description = Column(String)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    technical_score = Column(Float, nullable=True)
    communication_score = Column(Float, nullable=True)
    culture_fit_score = Column(Float, nullable=True)
    status = Column(String)  # "pending", "in_progress", "completed"
    final_decision = Column(String, nullable=True)  # "selected", "rejected", "ongoing"
    
    candidate = relationship("Candidate", back_populates="interviews")
    transcript = relationship("Transcript", back_populates="interview")

class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"))
    speaker = Column(String)  # "ai" or "candidate"
    text = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    ai_feedback = Column(String, nullable=True)
    
    interview = relationship("Interview", back_populates="transcript") 