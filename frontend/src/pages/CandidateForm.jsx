import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../components/ui/use-toast';

const CandidateForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    experience: '',
    resume: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (file && allowedTypes.includes(file.type)) {
      setFormData(prev => ({
        ...prev,
        resume: file
      }));
    } else {
      toast({
        title: "Error",
        description: "Please upload a PDF, DOC, or DOCX file",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let resume_text = null;
      let parsed_info = null;
      if (formData.resume) {
        // Upload and parse the resume file using FormData
        const resumeFormData = new FormData();
        resumeFormData.append('resume_file', formData.resume);
        const resumeData = await axios.post('/api/resume/parse-resume', resumeFormData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        resume_text = formData.resume.name;
        parsed_info = resumeData.data;
      }

      // Then, create the candidate
      const candidateData = {
        ...formData,
        resume_text,
        parsed_info
      };

      const response = await axios.post('/api/candidates', candidateData);
      
      toast({
        title: "Success",
        description: "Candidate added successfully"
      });
      navigate(`/candidate/${response.data.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add candidate",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add New Candidate</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="experience">Experience Summary</Label>
          <Textarea
            id="experience"
            name="experience"
            value={formData.experience}
            onChange={handleInputChange}
            rows={4}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="resume">Resume (PDF, DOC, DOCX)</Label>
          <Input
            id="resume"
            name="resume"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            required
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Adding..." : "Add Candidate"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default CandidateForm; 