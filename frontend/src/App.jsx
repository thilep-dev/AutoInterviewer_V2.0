import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from './components/ui/toaster';
import HRDashboard from './pages/HRDashboard';
import InterviewPage from './pages/InterviewPage';
import CandidateForm from './pages/CandidateForm';
import CandidateDetail from './pages/CandidateDetail';
import CompareCandidates from './pages/CompareCandidates';
import MeetingPage from './pages/MeetingPage';

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red', padding: 20 }}>Something went wrong: {this.state.error?.toString()}</div>;
    }
    return this.props.children;
  }
}

// Navigation logger
function NavigationLogger() {
  const location = useLocation();
  React.useEffect(() => {
    console.log('Navigated to:', location.pathname);
  }, [location]);
  return null;
}

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Router>
        <div className="container mx-auto p-6">
          <Toaster />
          <NavigationLogger />
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<HRDashboard />} />
              <Route path="/interview" element={<InterviewPage />} />
              <Route path="/candidate/new" element={<CandidateForm />} />
              <Route path="/candidate/:id" element={<CandidateDetail />} />
              <Route path="/compare" element={<CompareCandidates />} />
              <Route path="/meeting/:roomName" element={<MeetingPage />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </Router>
    </div>
  );
}

export default App; 