import fitz  # PyMuPDF
import re
from typing import Dict, Any

class ResumeParser:
    def __init__(self):
        self.skills_keywords = [
            "python", "java", "javascript", "react", "node", "sql", "aws", "docker",
            "kubernetes", "machine learning", "ai", "data science", "cloud", "devops"
        ]

    def extract_email(self, text: str) -> str:
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        match = re.search(email_pattern, text)
        return match.group(0) if match else ""

    def extract_phone(self, text: str) -> str:
        phone_pattern = r'\+?[\d\s-()]{10,}'
        match = re.search(phone_pattern, text)
        return match.group(0) if match else ""

    def extract_skills(self, text: str) -> list:
        text_lower = text.lower()
        found_skills = []
        for skill in self.skills_keywords:
            if skill in text_lower:
                found_skills.append(skill)
        return found_skills

    def extract_experience(self, text: str) -> str:
        experience_pattern = r'(\d+)\s*(?:years?|yrs?)\s*(?:of)?\s*experience'
        match = re.search(experience_pattern, text.lower())
        return match.group(1) if match else ""

    def parse(self, file_path: str) -> Dict[str, Any]:
        try:
            # Open PDF
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()

            # Extract information
            parsed_info = {
                "full_text": text,
                "email": self.extract_email(text),
                "phone": self.extract_phone(text),
                "skills": self.extract_skills(text),
                "experience": self.extract_experience(text)
            }

            return parsed_info
        except Exception as e:
            raise Exception(f"Error parsing resume: {str(e)}") 