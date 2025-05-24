import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

const CompareCandidates = () => {
  const [evaluations, setEvaluations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/llm/evaluations').then(res => setEvaluations(res.data));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200 mt-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Compare Candidates</h1>
        <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
      </div>
      {evaluations.length === 0 ? (
        <div className="text-slate-500">No evaluations available yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-slate-200 rounded-xl">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b">Candidate ID</th>
                <th className="px-4 py-2 border-b">Score</th>
                <th className="px-4 py-2 border-b">Summary</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map(ev => (
                <tr key={ev.id} className="border-b">
                  <td className="px-4 py-2">{ev.candidate_id}</td>
                  <td className="px-4 py-2">{ev.score !== null ? ev.score : 'N/A'}</td>
                  <td className="px-4 py-2" style={{ maxWidth: 400, whiteSpace: 'pre-wrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {typeof ev.evaluation_text === 'string' ? ev.evaluation_text.slice(0, 300) : ''}
                    {ev.evaluation_text && ev.evaluation_text.length > 300 ? '...' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CompareCandidates; 