import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Services from './components/Services';
import Footer from './components/Footer';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DockerDetails from './pages/DockerDetails';
import Dashboard from './pages/Dashboard';
import ServerDetails from './pages/ServerDetails';
import MainLayout from './layouts/MainLayout';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

// Landing Page Component
const LandingPage = () => (
  <>
    <Navbar />
    <main>
      <Hero />
      <Features />
      <Services />
    </main>
    <Footer />
  </>
);

// Docker Details Wrapper to handle location state
const DockerDetailsWrapper = () => {
  const location = useLocation();
  const { dockerData, agentName } = location.state || {};
  return <DockerDetails dockerData={dockerData} agentName={agentName} />;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <div className="min-h-screen bg-bg-dark text-text-primary font-sans selection:bg-accent selection:text-white transition-colors duration-300">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected Routes wrapped in MainLayout */}
              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/server/:id" element={<ServerDetails />} />
                <Route path="/docker-details" element={<DockerDetailsWrapper />} />

                {/* Placeholder routes for sidebar links */}
                <Route path="/metrics" element={<div className="text-white p-8">Metrics Monitoring - Coming Soon</div>} />
                <Route path="/containerization" element={<div className="text-white p-8">Containerization SaaS - Coming Soon</div>} />
                <Route path="/servers" element={<Navigate to="/dashboard" />} />
                <Route path="/alerts" element={<div className="text-white p-8">Logs & Alerts - Coming Soon</div>} />
                <Route path="/settings" element={<div className="text-white p-8">Settings - Coming Soon</div>} />
              </Route>
            </Routes>
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
