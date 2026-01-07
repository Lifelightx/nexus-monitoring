import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams, useOutletContext } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Services from './components/Services';
import Footer from './components/Footer';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import DockerDetails from './pages/docker/DockerDetails';
import DockerImageDetails from './pages/docker/DockerImageDetails';
import DockerNetworkDetails from './pages/docker/DockerNetworkDetails';
import ContainerDetails from './pages/docker/ContainerDetails';
import Dashboard from './pages/dashboard/Dashboard';
import ServerOverview from './pages/server/ServerOverview';
import ServerMetrics from './pages/server/ServerMetrics';
import ServerLogs from './pages/server/ServerLogs';
import AgentInfo from './pages/server/AgentInfo';
import FileExplorer from './pages/server/FileExplorer';
import Containerization from './pages/docker/Containerization';
import MainLayout from './layouts/MainLayout';
import ServerLayout from './layouts/ServerLayout';
import Metrics from './pages/dashboard/Metrics';
import AlertsPage from './pages/alerts/AlertsPage';
import Settings from './pages/dashboard/Settings';
import Servers from './pages/server/Servers';
import GlobalDashboard from './pages/apm/GlobalDashboard';
import ServicesList from './pages/apm/ServicesList';
import ServiceDetails from './pages/apm/ServiceDetails';
import TraceExplorer from './pages/apm/TraceExplorer';
import TraceWaterfall from './pages/apm/TraceWaterfall';

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
  const params = useParams();
  // Handle both :id (from ServerLayout) and :serverId (direct access)
  const serverId = params.id || params.serverId;
  const { tab } = params; // Get tab from URL
  const location = useLocation();
  const context = useOutletContext(); // Get context from ServerLayout

  // Prefer data from location state, then context, then null
  const dockerData = location.state?.dockerData || context?.metrics?.dockerDetails;
  const agentName = location.state?.agentName || context?.agent?.name;

  return <DockerDetails serverId={serverId} dockerData={dockerData} agentName={agentName} initialTab={tab} />;
};

// Docker Image Details Wrapper
// Docker Image Details Wrapper
const DockerImageDetailsWrapper = () => {
  const params = useParams();
  const serverId = params.serverId || params.id;
  const { imageName } = params;
  const location = useLocation();
  const { dockerData, agentName } = location.state || {};
  return <DockerImageDetails serverId={serverId} imageName={imageName} dockerData={dockerData} agentName={agentName} />;
};

// Docker Network Details Wrapper
const DockerNetworkDetailsWrapper = () => {
  const params = useParams();
  const serverId = params.serverId || params.id;
  const { networkName } = params;
  const location = useLocation();
  const { dockerData, agentName } = location.state || {};
  return <DockerNetworkDetails serverId={serverId} networkName={networkName} dockerData={dockerData} agentName={agentName} />;
};

// Container Details Wrapper
const ContainerDetailsWrapper = () => {
  const params = useParams();
  const serverId = params.serverId || params.id;
  const { containerName } = params;
  const location = useLocation();
  const { containerId, agentName } = location.state || {};
  return <ContainerDetails serverId={serverId} containerName={containerName} containerId={containerId} agentName={agentName} />;
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

                  {/* Infrastructure Routes */}
                  <Route path="/servers" element={<Servers />} />
                  <Route path="/metrics" element={<Metrics />} />
                  <Route path="/alerts" element={<AlertsPage />} />
                  <Route path="/settings" element={<Settings />} />

                  {/* APM Routes - Standalone */}
                  <Route path="/traces/:traceId/details" element={<TraceWaterfall />} />

                  {/* Server Routes wrapped in ServerLayout */}
                  <Route path="/server/:id" element={<ServerLayout />}>
                    <Route index element={<Navigate to="overview" replace />} />
                    <Route path="overview" element={<ServerOverview />} />
                    <Route path="metrics" element={<ServerMetrics />} />

                    {/* APM Routes - Host Specific */}
                    <Route path="services" element={<ServicesList />} />
                    <Route path="services/:serviceName" element={<ServiceDetails />} />
                    <Route path="traces/:serviceId" element={<TraceExplorer />} />
                    <Route path="traces/:traceId/details" element={<TraceWaterfall />} />

                    {/* Docker Routes */}
                    <Route path="docker" element={<Navigate to="containers" replace />} />
                    <Route path="docker/:tab" element={<DockerDetailsWrapper />} />
                    <Route path="docker/images/:imageName" element={<DockerImageDetailsWrapper />} />
                    <Route path="docker/networks/:networkName" element={<DockerNetworkDetailsWrapper />} />
                    <Route path="docker/containers/:containerName" element={<ContainerDetailsWrapper />} />

                    <Route path="logs" element={<ServerLogs />} />
                    <Route path="agent-info" element={<AgentInfo />} />
                    <Route path="files" element={<FileExplorer />} />
                  </Route>

                  <Route path="/containerization" element={<Containerization />} />
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
