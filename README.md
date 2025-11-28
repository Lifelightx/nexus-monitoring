# Nexus Monitor

Nexus Monitor is a comprehensive, enterprise-grade server monitoring and management solution. It provides real-time insights into your infrastructure, allowing you to monitor system metrics, manage Docker containers, and track server health across your entire fleet from a single, beautiful dashboard.

## 🚀 Features

### Core Monitoring
-   **Real-time Metrics**: Live tracking of CPU usage, Memory consumption, and Network traffic (RX/TX).
-   **Multi-Server Dashboard**: View all your connected servers in a grid view with status indicators (Online/Offline).
-   **Historical Data**: Interactive charts showing resource usage trends over time.

### Docker Management
-   **Container Visualization**: View all running and stopped containers on connected servers.
-   **Remote Control**: Start, Stop, and Restart Docker containers directly from the dashboard.
-   **Detailed Insights**: Inspect container logs, port bindings, environment variables, and resource usage stats.

### User Experience
-   **Modern UI**: Built with a "dark mode first" aesthetic using glassmorphism and smooth animations.
-   **Modular Design**: Scalable architecture with a sidebar navigation for easy access to different modules.
-   **Interactive Guide**: Built-in installation guide to help you connect new servers in seconds.

## 🛠️ Tech Stack

-   **Frontend**: React (Vite), TailwindCSS, Recharts, Socket.io Client.
-   **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io, JWT Authentication.
-   **Agent**: Node.js, Systeminformation, Dockerode.

## 📦 Installation & Setup

### Prerequisites
-   Node.js (v16 or higher)
-   MongoDB (Local or Atlas)
-   Docker (running on the machine where the Agent is installed)

### 1. Backend Setup
```bash
cd BACKEND
npm install
# Create a .env file based on .env.example (or set MONGO_URI and JWT_SECRET)
npm run dev
```
The backend will start on `http://localhost:3000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will start on `http://localhost:5173`.

### 3. Agent Setup (Target Server)
To monitor a machine, you need to run the agent on it.
```bash
cd agent
npm install
# Configure .env to point to your Backend URL
node index.js
```

## 📝 Usage

1.  **Register/Login**: Create an account on the frontend.
2.  **Connect a Server**:
    *   Go to the Dashboard.
    *   Follow the "Installation Guide" to set up the agent on your target machine.
    *   Once the agent starts, it will automatically appear in your "Your Servers" list.
3.  **Monitor & Manage**:
    *   Click on a server card to view detailed metrics.
    *   Navigate to the "Docker" section to manage containers.

## 🗺️ Roadmap

-   [ ] **Alerting System**: Configurable alerts for CPU/Memory thresholds.
-   [ ] **Logs Management**: Centralized log aggregation for servers.
-   [ ] **SaaS Features**: Multi-tenancy and team management.
-   [ ] **Advanced Analytics**: Long-term trend analysis and reporting.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
