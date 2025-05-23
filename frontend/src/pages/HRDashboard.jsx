import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/use-toast';

const HRDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get('/api/candidates');
      setCandidates(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch candidates",
        variant: "destructive"
      });
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCandidates = Array.isArray(candidates) ? candidates.filter(candidate =>
    candidate?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    candidate?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'selected':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'rejected':
        return 'bg-rose-100 text-rose-800 border border-rose-200';
      case 'ongoing':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  };

  return (
    <>
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              HR Dashboard
            </h1>
            <p className="text-slate-600 mt-1">Manage and track your candidates</p>
          </div>
          <Button 
            onClick={() => navigate('/candidate/new')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            Add New Candidate
          </Button>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-slate-200">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search candidates by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:max-w-md pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19 19L14.65 14.65"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Candidates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((candidate) => (
            <Card key={candidate.id} className="bg-white hover:shadow-lg transition-all duration-200 border border-slate-200">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">{candidate.name}</h3>
                    <p className="text-slate-600">{candidate.email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(candidate.status)}`}>
                    {candidate.status}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-slate-600">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {candidate.phone}
                  </div>
                  <div className="flex items-start text-slate-600">
                    <svg className="w-5 h-5 mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{candidate.experience}</span>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/candidate/${candidate.id}`)}
                    className="border-slate-200 hover:bg-slate-50"
                  >
                    View Details
                  </Button>
                  {candidate.status === 'pending' && (
                    <Button
                      onClick={() => navigate(`/interview/${candidate.id}`)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    >
                      Start Interview
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredCandidates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">No candidates found</h3>
          <p className="text-slate-600">Try adjusting your search or add a new candidate</p>
        </div>
      )}
    </>
  );
};

export default HRDashboard; 