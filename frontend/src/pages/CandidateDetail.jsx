import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const CandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', experience: '', skills: '', resumeUrl: '' });
  const [newResume, setNewResume] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/candidates/${id}`);
        setCandidate(response.data);
        setForm({
          name: response.data.name || '',
          email: response.data.email || '',
          experience: response.data.experience || '',
          skills: response.data.skills ? response.data.skills.join(', ') : '',
          resumeUrl: response.data.resumeUrl || ''
        });
      } catch (err) {
        setError('Failed to fetch candidate details.');
      } finally {
        setLoading(false);
      }
    };
    fetchCandidate();
  }, [id]);

  const handleEdit = () => setEditing(true);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      try {
        await axios.delete(`/api/candidates/${id}`);
        alert('Candidate deleted.');
        navigate('/candidates');
      } catch (err) {
        alert('Failed to delete candidate.');
      }
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleResumeFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setNewResume(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      let resume_text = candidate.resume_text;
      let parsed_info = candidate.parsed_info;
      if (newResume) {
        setUploading(true);
        const formData = new FormData();
        formData.append('resume_file', newResume);
        const uploadRes = await axios.post(
          `/api/candidates/${candidate.id}/upload-resume`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        resume_text = newResume.name;
        parsed_info = uploadRes.data.parsed_info;
        setUploading(false);
      }
      // Now update the candidate with the new resume info (if any)
      await axios.put(`/api/candidates/${candidate.id}`, {
        ...form,
        resume_text,
        parsed_info,
        skills: form.skills.split(',').map(s => s.trim())
      });
      setCandidate({ ...candidate, ...form, resume_text, parsed_info });
      setEditing(false);
      alert('Candidate updated.');
    } catch (err) {
      setUploading(false);
      alert('Failed to update candidate.');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!candidate) return <div className="p-6">No candidate found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{candidate.name}</h2>
        <div>
          <button className="mr-2 px-4 py-2 bg-blue-500 text-white rounded" onClick={handleEdit}>Edit</button>
          <button className="px-4 py-2 bg-red-500 text-white rounded" onClick={handleDelete}>Delete</button>
        </div>
      </div>
      {editing ? (
        <form onSubmit={handleSave} className="mb-4">
          <div className="mb-2">
            <label className="block font-semibold">Name:</label>
            <input name="name" value={form.name} onChange={handleChange} className="border p-2 w-full" required />
          </div>
          <div className="mb-2">
            <label className="block font-semibold">Email:</label>
            <input name="email" value={form.email} onChange={handleChange} className="border p-2 w-full" required />
          </div>
          <div className="mb-2">
            <label className="block font-semibold">Experience (years):</label>
            <input name="experience" value={form.experience} onChange={handleChange} className="border p-2 w-full" required />
          </div>
          <div className="mb-2">
            <label className="block font-semibold">Skills (comma separated):</label>
            <input name="skills" value={form.skills} onChange={handleChange} className="border p-2 w-full" required />
          </div>
          <div className="mb-2">
            <label className="block font-semibold">Current Resume:</label>
            {candidate.resume_text ? (
              <a
                href={`/api/candidates/${candidate.id}/resume`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                View / Download Resume
              </a>
            ) : (
              <span className="text-gray-500">No resume uploaded</span>
            )}
          </div>
          <div className="mb-2">
            <label className="block font-semibold">Upload New Resume:</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleResumeFileChange}
              disabled={uploading}
            />
            {uploading && <span className="ml-2 text-blue-500">Uploading...</span>}
          </div>
          <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded mr-2" disabled={uploading}>Save</button>
          <button type="button" className="px-4 py-2 bg-gray-300 rounded" onClick={() => setEditing(false)} disabled={uploading}>Cancel</button>
        </form>
      ) : (
        <>
          <p><strong>Email:</strong> {candidate.email}</p>
          <p><strong>Experience:</strong> {candidate.experience} years</p>
          <p><strong>Skills:</strong> {
            Array.isArray(candidate.skills)
              ? candidate.skills.join(', ')
              : (candidate.skills || '')
          }</p>
          <p>
            <strong>Resume:</strong>
            {candidate.resume_text ? (
              <>
                <a
                  href={`/api/candidates/${candidate.id}/resume`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline ml-2"
                >
                  View / Download Resume
                </a>
              </>
            ) : (
              <span className="text-gray-500 ml-2">No resume uploaded</span>
            )}
          </p>
        </>
      )}
      <hr className="my-4" />
      <h3 className="text-xl font-semibold mb-2">Interview History</h3>
      {candidate.interviews && candidate.interviews.length > 0 ? (
        <ul className="list-disc pl-5">
          {candidate.interviews.map((interview, idx) => (
            <li key={idx} className="mb-2">
              <strong>Date:</strong> {interview.date} <br />
              <strong>Result:</strong> {interview.result} <br />
              <strong>Notes:</strong> {interview.notes}
            </li>
          ))}
        </ul>
      ) : (
        <p>No interviews yet.</p>
      )}
    </div>
  );
};

export default CandidateDetail; 