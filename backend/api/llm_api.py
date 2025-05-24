from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import ollama
import json
from models.interview_evaluation import InterviewEvaluation
from db import get_db
from fastapi import Depends
from sqlalchemy.orm import Session

router = APIRouter()

class InterviewContext(BaseModel):
    resume: str
    job_description: str
    experience: str
    current_question: Optional[str] = None
    candidate_answer: Optional[str] = None
    interview_history: Optional[List[dict]] = None

class LLMResponse(BaseModel):
    question: str
    feedback: Optional[str] = None
    score: Optional[float] = None
    next_action: str  # "follow_up", "new_topic", "end_interview"

class EvaluationRequest(BaseModel):
    candidate_id: int
    conversation: list

@router.post("/generate_question")
async def generate_question(context: InterviewContext):
    try:
        # Construct the prompt
        prompt = f"""You are an AI interviewer for a position. Here's the context:

Resume: {context.resume}
Job Description: {context.job_description}
Experience: {context.experience}

"""
        if context.current_question and context.candidate_answer:
            prompt += f"""
Previous Question: {context.current_question}
Candidate's Answer: {context.candidate_answer}

Based on the candidate's answer, provide:
1. A follow-up question or new topic question
2. Brief feedback on their answer
3. A score from 0-1
4. Next action (follow_up, new_topic, or end_interview)

Format your response as JSON:
{{
    "question": "your question here",
    "feedback": "your feedback here",
    "score": 0.85,
    "next_action": "follow_up"
}}
"""
        else:
            prompt += """
Generate the first question to start the interview. Focus on their experience and skills.

Format your response as JSON:
{
    "question": "your question here",
    "feedback": null,
    "score": null,
    "next_action": "new_topic"
}
"""

        # Get response from Ollama
        response = ollama.generate(
            model="mistral",
            prompt=prompt
        )

        # Parse the response
        try:
            result = json.loads(response['response'])
            return LLMResponse(**result)
        except json.JSONDecodeError:
            # Fallback if the response isn't valid JSON
            return LLMResponse(
                question=response['response'],
                next_action="new_topic"
            )

    except Exception as e:
        return {"error": str(e)}

@router.post("/evaluate_candidate")
async def evaluate_candidate(
    req: EvaluationRequest,
    db: Session = Depends(get_db)
):
    candidate_id = req.candidate_id
    conversation = req.conversation
    # Compose prompt and call LLM as before...
    prompt = "Evaluate the following interview conversation:\n"
    for turn in conversation:
        prompt += f"{turn['role']}: {turn['content']}\n"
    prompt += "\nProvide a summary, strengths, weaknesses, and a final score (0-1) as JSON."

    # Call your LLM (Ollama, OpenAI, etc.)
    response = ollama.generate(
        model="mistral",
        prompt=prompt
    )
    evaluation_text = response['response']
    # Optionally parse score from response
    score = None
    try:
        import json
        parsed = json.loads(evaluation_text)
        score = parsed.get("score")
    except Exception:
        pass

    evaluation = InterviewEvaluation(
        candidate_id=candidate_id,
        evaluation_text=evaluation_text,
        score=score
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    return {"evaluation": evaluation_text, "score": score}

@router.get("/evaluations")
def get_evaluations(db: Session = Depends(get_db)):
    return db.query(InterviewEvaluation).all() 