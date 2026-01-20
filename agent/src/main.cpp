#include <iostream>
#include <csignal>
#include <atomic>
#include <thread>
#include <chrono>
#include "nexus/utils/logger.h"
#include "nexus/utils/config.h"
#include "nexus/utils/agent_info.h"
#include "nexus/utils/metrics_serializer.h"
#include "nexus/utils/otlp_converter.h"
#include "nexus/collectors/system_metrics.h"
#include "nexus/collectors/process_scanner.h"
#include "nexus/collectors/security_collector.h"
#include "nexus/collectors/log_collector.h"
#include "nexus/collectors/docker_monitor.h"
#include "nexus/handlers/docker_handler.h"
#include "nexus/handlers/command_handler.h"
#include "nexus/handlers/file_handler.h"
#include "nexus/detectors/service_detector.h"
#include "nexus/communication/http_agent_client.h"
#include "nexus/communication/websocket_client.h"
#include "nexus/orchestrator/instrumentation_manager.h"

using namespace nexus;

std::atomic<bool> running(true);

void signalHandler(int signal) {
    if (signal == SIGINT || signal == SIGTERM) {
        nexus::Logger::getInstance().info("Received signal {}, shutting down...", signal);
        running = false;
    }
}

int main(int argc, char* argv[]) {
    // Default config file
    std::string configFile = "/etc/nexus-agent/agent.conf";
    
    // Parse command line arguments
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if ((arg == "-c" || arg == "--config") && i + 1 < argc) {
            configFile = argv[++i];
        } else if (arg == "-h" || arg == "--help") {
            std::cout << "Usage: nexus-agent [OPTIONS]\n"
                      << "Options:\n"
                      << "  -c, --config FILE     Configuration file (default: /etc/nexus-agent/agent.conf)\n"
                      << "  -h, --help            Show this help\n"
                      << "  --version             Show version\n";
            return 0;
        } else if (arg == "--version") {
            std::cout << "Nexus Agent v1.0.0\n";
            return 0;
        }
    }
    
    // Load configuration
    auto& config = nexus::Config::getInstance();
    if (!config.load(configFile)) {
        std::cerr << "Failed to load configuration from: " << configFile << std::endl;
        return 1;
    }
    
    // Initialize logger
    std::string logFile = config.get("logging", "file", "/var/log/nexus-agent/agent.log");
    std::string logLevel = config.get("logging", "level", "info");
    nexus::Logger::getInstance().init(logFile, logLevel);
    
    auto& logger = nexus::Logger::getInstance();
    logger.info("=== Nexus Agent Starting ===");
    logger.info("Config file: {}", configFile);
    
    std::string agentName = config.get("agent", "name", "unknown");
    std::string backendUrl = config.get("agent", "backend_url", "http://localhost:3000");
    std::string agentToken = config.get("agent", "token", "");
    int collectionInterval = config.getInt("metrics", "collection_interval", 5);
    
    logger.info("Agent name: {}", agentName);
    logger.info("Backend URL: {}", backendUrl);
    
    // Register signal handlers
    std::signal(SIGINT, signalHandler);
    std::signal(SIGTERM, signalHandler);
    
    // Initialize collectors
    // Use correct namespaces
    nexus::collectors::SystemMetrics sysMetrics;
    nexus::collectors::ProcessScanner procScanner;
    nexus::collectors::SecurityCollector secCollector; // Added SecurityCollector
    nexus::collectors::LogCollector logCollector;
    
    // Initialize Docker monitor
    std::string dockerSocket = config.get("docker", "socket_path", "/var/run/docker.sock");
    bool dockerEnabled = config.getBool("docker", "enabled", true);
    
    // Instantiate DockerMonitor
    nexus::collectors::DockerMonitor dockerMonitor(dockerSocket);
    bool dockerAvailable = dockerEnabled && dockerMonitor.isAvailable();
    if (dockerAvailable) {
        logger.info("Docker monitoring enabled (socket: {})", dockerSocket);
    } else if (dockerEnabled) {
        logger.warn("Docker enabled but not available");
    } else {
        logger.info("Docker monitoring disabled");
    }

    // Initialize Instrumentation Manager (Extracts files on startup)
    std::string nodeInjectorPath = config.get("instrumentation", "nodejs_injector_path", "/opt/nexus-agent/instrumentation/nodejs");
    nexus::orchestrator::InstrumentationManager instrManager(nodeInjectorPath);

    // Initialize HTTP Client (Shared Ptr for CommandHandler)
    // Note: HttpAgentClient takes (baseUrl, token)
    auto httpClient = std::make_shared<nexus::communication::HttpAgentClient>(backendUrl, agentToken);

    // Register agent
    logger.info("Registering agent with backend...");
    auto agentInfo = nexus::utils::collectAgentInfo(agentName);
    
    // Debug payload
    nlohmann::json infoJson = nexus::communication::agentInfoToJson(agentInfo);
    logger.info("Registration payload: {}", infoJson.dump());

    // Retry registration loop
    // Try registration once
    if (httpClient->registerAgent(agentInfo)) {
        logger.info("Agent registered successfully");
    } else {
        logger.warn("Failed to register agent. Continuing in offline mode...");
    }

    if (!running) return 0; // Exited during retry
    logger.info("Agent registered successfully");

    // Initialize Docker Handler (Control)
    auto dockerHandler = std::make_shared<nexus::handlers::DockerHandler>();

    // Initialize File Handler (Cross-Platform)
    auto fileHandler = std::make_shared<nexus::handlers::FileHandler>();

    // WebSocket disabled - using HTTP polling instead
    // auto wsClient = std::make_shared<nexus::communication::WebSocketClient>(backendUrl, agentName, agentToken);
    // wsClient->onDockerLogsStart([dockerHandler, wsClient](const std::string& id) { ... });
    // wsClient->onDockerLogsStop([dockerHandler](const std::string& id) { ... });
    // wsClient->connect();
    logger.info("WebSocket disabled - using HTTP-only mode");

    // Initialize Command Handler (Polling)
    int pollIntervalMs = config.getInt("agent", "command_poll_ms", 500);
    logger.info("Command polling interval: {} ms", pollIntervalMs);
    
    nexus::handlers::CommandHandler commandHandler(httpClient, dockerHandler, fileHandler, agentName, pollIntervalMs);
    commandHandler.start();

    logger.info("Agent running. Press Ctrl+C to stop.");
    
    // Main loop
    int iteration = 0;
    auto lastMetricsSend = std::chrono::steady_clock::now();
    auto lastHeartbeat = std::chrono::steady_clock::now();
    const int heartbeatInterval = 30; // seconds
    
    while (running) {
        auto now = std::chrono::steady_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(now - lastMetricsSend).count();
        
        if (elapsed >= collectionInterval) {
            // Collect system metrics
            if (sysMetrics.collect()) {
                const auto& cpu = sysMetrics.getCpuMetrics();
                const auto& mem = sysMetrics.getMemoryMetrics();
                logger.info("Collected metrics - CPU: {:.1f}%, Memory: {:.1f}%", cpu.usage_percent, mem.usage_percent);
            }
            
            // Collect Docker data
            if (dockerAvailable) {
                dockerMonitor.collect();
            }

            // Collect and send system logs
            if (dockerAvailable) {
                logCollector.collect(&dockerMonitor);
            } else {
                logCollector.collect(nullptr);
            }
            auto logs = logCollector.getAndClearLogs();
            if (!logs.empty()) {
                nlohmann::json logsJson = nlohmann::json::array();
                for (const auto& log : logs) {
                    logsJson.push_back({
                        {"type", log.type},
                        {"level", log.level},
                        {"source", log.source},
                        {"message", log.message},
                        {"timestamp", log.timestamp},
                        {"metadata", log.metadata}
                    });
                }
                if (httpClient->sendLogs(logsJson)) {
                     logger.debug("Sent {} logs to backend", logs.size());
                }
            }
            
            // Scan processes every 4 iterations (20s)
            if (iteration % 4 == 0) {
                procScanner.scan();
                logger.debug("Scanned {} processes", procScanner.getProcesses().size());
                
                // Orchestrate instrumentation
                std::string nodeInjectorPath = config.get("instrumentation", "nodejs_injector_path", "/opt/nexus-agent/instrumentation/nodejs");
                nexus::orchestrator::InstrumentationManager instrManager(nodeInjectorPath);
                
                // Unified service detection
                // Note: detectServices is already called later for metrics, but we do it here for orchestration
                // Optimization: We could reuse valid detection results if logic flow permits 
                // But for now, just calling it is safer and cleaner
                auto services = nexus::detectors::detectServices(procScanner.getProcesses(), dockerMonitor.getContainers());
                auto statuses = instrManager.scan(services);
            }
            
            // Send metrics to backend via OTLP format
            // Convert system metrics to OTLP
            auto otlpSystemMetrics = nexus::utils::OTLPConverter::convertSystemMetrics(
                agentName, sysMetrics
            );
            
            // Convert Docker metrics to OTLP (if available)
            nlohmann::json otlpDockerMetrics;
            if (dockerAvailable) {
                otlpDockerMetrics = nexus::utils::OTLPConverter::convertDockerMetrics(
                    agentName, dockerMonitor
                );
            }
            
            // Send system metrics via OTLP endpoint
            if (httpClient->sendOTLPMetrics(otlpSystemMetrics)) {
                logger.info("✓ Sent system metrics (OTLP) to backend");
            } else {
                logger.warn("✗ Failed to send system metrics (OTLP)");
            }
            
            // Send Docker metrics if available
            if (dockerAvailable && !otlpDockerMetrics.empty()) {
                if (httpClient->sendOTLPMetrics(otlpDockerMetrics)) {
                    logger.info("✓ Sent Docker metrics (OTLP) to backend");
                } else {
                    logger.warn("✗ Failed to send Docker metrics (OTLP)");
                }
            }
            
            // Send full Docker details to /api/agent/metrics (for management UI)
            if (dockerAvailable) {
                // Detect services from processes and containers
                auto services = nexus::detectors::detectServices(procScanner.getProcesses(), dockerMonitor.getContainers());
                auto servicesJson = nexus::detectors::serializeServices(services);
                
                // Serialize processes
                auto processesJson = nexus::utils::serializeProcesses(procScanner.getProcesses());
                
                nlohmann::json fullMetrics = {
                    {"agent", agentName},
                    {"dockerDetails", nexus::utils::serializeDockerData(dockerMonitor)},
                    {"services", servicesJson},
                    {"processes", processesJson},
                    {"cpu", {
                        {"usage_percent", sysMetrics.getCpuMetrics().usage_percent}
                    }},
                    {"memory", {
                        {"usage_percent", sysMetrics.getMemoryMetrics().usage_percent},
                        {"used_bytes", sysMetrics.getMemoryMetrics().used_bytes},
                        {"total_bytes", sysMetrics.getMemoryMetrics().total_bytes}
                    }}
                };
                
                if (httpClient->sendMetrics(fullMetrics)) {
                    logger.info("✓ Sent Docker details to backend");
                } else {
                    logger.warn("✗ Failed to send Docker details");
                }
            }
            
            lastMetricsSend = now;
            iteration++;
        }
        
        // Send heartbeat every 30 seconds to keep agent status updated
        auto heartbeatElapsed = std::chrono::duration_cast<std::chrono::seconds>(now - lastHeartbeat).count();
        if (heartbeatElapsed >= heartbeatInterval) {
            if (httpClient->sendHeartbeat(agentName)) {
                logger.debug("✓ Heartbeat sent successfully");
            } else {
                logger.warn("✗ Heartbeat failed");
            }
            lastHeartbeat = now;
        }
        
        // Sleep briefly
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
    
    commandHandler.stop();
    // wsClient->disconnect(); // WebSocket disabled
    logger.info("=== Nexus Agent Stopped ===");
    return 0;
}
