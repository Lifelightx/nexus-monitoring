# Nexus Monitor

Nexus Monitor is a comprehensive, enterprise-grade server monitoring and management solution. It provides real-time insights into your infrastructure, allowing you to monitor system metrics, manage Docker containers, and track server health across your entire fleet from a single, beautiful dashboard.

## 🚀 Features

### 📊 Core Monitoring
-   **Real-time Metrics**: Live tracking of CPU usage, Memory consumption, and Network traffic (RX/TX).
-   **Multi-Server Dashboard**: View all your connected servers in a grid view with status indicators (Online/Offline).
-   **Historical Data**: Interactive charts showing resource usage trends over time.
-   **System Info**: Detailed hardware specifications (CPU model, OS, Uptime, etc.).

### 🐳 Docker Management
-   **Container Visualization**: View all running and stopped containers with their status and resource usage.
-   **Remote Control**: Start, Stop, Restart, and Remove Docker containers directly from the dashboard.
-   **Live Logs**: Stream real-time logs from any container.
-   **Interactive Terminal**: Execute commands inside containers directly from your browser (supports `sh`/`bash`).
-   **Image Management**: View and remove Docker images.
-   **Volume Management**: List and inspect Docker volumes.
-   **Bulk Actions**: Stop or delete multiple containers at once.

### 📂 File System Explorer
-   **Live File Browser**: Browse the remote server's file system in real-time.
-   **Disk Analysis**: View disk usage statistics and file details.
-   **Optimized Sync**: Smart caching ensures only changed file data is transmitted to save bandwidth.

### 🔐 Security & Architecture
-   **Secure Communication**: All data between Agents and Backend is encrypted.
-   **Agent-Based**: Lightweight Node.js agent runs on target servers.
-   **Fallback Mechanisms**: Smart fallbacks for features like the terminal (works even without native build tools).

### 🎨 User Experience
-   **Modern UI**: Built with a "dark mode first" aesthetic using glassmorphism and smooth animations.
-   **Responsive Design**: Fully responsive layout that works on desktop and mobile.
-   **Interactive Guide**: Built-in installation guide to help you connect new servers in seconds.

## 🛠️ Tech Stack

-   **Frontend**: React v19, TailwindCSS, Recharts, Xterm.js, Socket.io Client.
-   **Backend**: Node.js v22, Express v5, MongoDB (Mongoose v9), Socket.io, JWT Authentication.
-   **Agent**: Node.js, Systeminformation, Dockerode, Socket.io Client.

## 📦 Installation & Setup

### Prerequisites
-   Node.js (v16 or higher)
-   MongoDB (Local or Atlas)
-   Docker (running on the machine where the Agent is installed)

### 1. Backend Setup
```bash
cd backend
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

## 🔑 Default Login Credentials

If you are running the application locally for testing, you can use the following credentials (or register a new user):

-   **Email**: `admin@example.com`
-   **Password**: `admin123`

## 📝 Usage

1.  **Register/Login**: Create an account on the frontend.
2.  **Connect a Server**:
    *   Go to the Dashboard.
    *   Follow the "Installation Guide" to set up the agent on your target machine.
    *   Once the agent starts, it will automatically appear in your "Your Servers" list.
3.  **Monitor & Manage**:
    *   Click on a server card to view detailed metrics.
    *   Navigate to the "Docker" section to manage containers, view logs, or open a terminal.
    *   Use the "Files" tab to explore the server's file system.

## 🗺️ Roadmap

-   [ ] **Alerting System**: Configurable alerts for CPU/Memory thresholds.
-   [ ] **Logs Management**: Centralized log aggregation for servers.
-   [ ] **SaaS Features**: Multi-tenancy and team management.
-   [ ] **Advanced Analytics**: Long-term trend analysis and reporting.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
