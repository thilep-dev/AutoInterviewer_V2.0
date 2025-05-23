import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function InterviewPage() {
  const navigate = useNavigate();

  const startInterview = () => {
    // Replace with a real room name or generate one dynamically
    const roomName = 'interview-123';
    navigate(`/meeting/${roomName}`);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>AI Interview</h1>
      <p>Click the button below to start your interview with the AI bot.</p>
      <button onClick={startInterview} style={{ padding: '10px 20px', fontSize: '16px' }}>
        Start Interview
      </button>
    </div>
  );
} 