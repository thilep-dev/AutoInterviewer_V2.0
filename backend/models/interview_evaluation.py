from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .candidate import Base

class InterviewEvaluation(Base):
    __tablename__ = "interview_evaluations"
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    interview_id = Column(Integer, nullable=True)
    evaluation_text = Column(String)
    score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    candidate = relationship("Candidate") 