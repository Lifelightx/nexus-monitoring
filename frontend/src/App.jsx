import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Services from './components/Services';
import Footer from './components/Footer';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DockerDetails from './pages/DockerDetails';
import DockerImageDetails from './pages/DockerImageDetails';
import DockerNetworkDetails from './pages/DockerNetworkDetails';
import ContainerDetails from './pages/ContainerDetails';
import Dashboard from './pages/Dashboard';
import ServerDetails from './pages/ServerDetails';
import FileExplorer from './pages/FileExplorer';
import Containerization from './pages/Containerization';
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

// Docker Details Wrapper to handle location state and params
const DockerDetailsWrapper = () => {
  const { serverId } = useParams();
  const location = useLocation();
  const { dockerData, agentName } = location.state || {};
  return <DockerDetails serverId={serverId} dockerData={dockerData} agentName={agentName} />;
};

// Docker Image Details Wrapper
const DockerImageDetailsWrapper = () => {
  const { serverId, imageName } = useParams();
  const location = useLocation();
  const { dockerData, agentName } = location.state || {};
  return <DockerImageDetails serverId={serverId} imageName={imageName} dockerData={dockerData} agentName={agentName} />;
};

// Docker Network Details Wrapper
const DockerNetworkDetailsWrapper = () => {
  const { serverId, networkName } = useParams();
  const location = useLocation();
  const { dockerData, agentName } = location.state || {};
  return <DockerNetworkDetails serverId={serverId} networkName={networkName} dockerData={dockerData} agentName={agentName} />;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SocketProvider>
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
                  <Route path="/server/:serverId/docker-details" element={<DockerDetailsWrapper />} />
                  <Route path="/server/:serverId/docker/images/:imageName" element={<DockerImageDetailsWrapper />} />
                  <Route path="/server/:serverId/docker-details/network/:networkName" element={<DockerNetworkDetailsWrapper />} />
                  <Route path="/server/:serverId/docker-details/:containerId" element={<ContainerDetails />} />
                  <Route path="/server/:id/files" element={<FileExplorer />} />

                  {/* Placeholder routes for sidebar links */}
                  <Route path="/metrics" element={<div className="text-white p-8">Metrics Monitoring - Coming Soon</div>} />
                  <Route path="/containerization" element={<Containerization />} />
                  <Route path="/servers" element={<Navigate to="/dashboard" />} />
                  <Route path="/alerts" element={<div className="text-white p-8">Logs & Alerts - Coming Soon</div>} />
                  <Route path="/settings" element={<div className="text-white p-8">Settings - Coming Soon</div>} />
                </Route>
              </Routes>
            </div>
          </Router>
        </SocketProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
