#pragma once

#include <string>
#include <functional>
#include <map>
#include <thread>
#include <mutex>
#include <atomic>
#include <boost/asio.hpp>
#include <boost/beast.hpp>
#include <nlohmann/json.hpp>

namespace nexus {
namespace communication {

using json = nlohmann::json;
namespace beast = boost::beast;
namespace http = beast::http;
namespace websocket = beast::websocket;
namespace net = boost::asio;
using tcp = net::ip::tcp;

struct AgentInfo {
    std::string name;
    std::string hostname;
    std::string os;
    std::string platform;
    std::string arch;
    int cpus;
    uint64_t totalMemory;
    std::string version;
};

struct DockerControlCommand {
    std::string action;
    std::string containerId;
    json payload;
};

class WebSocketClient {
public:
    WebSocketClient(const std::string& url, const std::string& agentName, const std::string& token = "");
    ~WebSocketClient();
    
    // Connection management
    bool connect();
    void disconnect();
    bool isConnected() const;
    void run(); // Run in background thread
    
    // Event emitters (Agent → Backend)
    void emitRegister(const AgentInfo& info);
    void emitMetrics(const json& metrics);
    void emitDockerControlResult(const json& result);
    void emitFileListResult(const json& result);
    
    // Generic emit (public for handlers)
    void emit(const std::string& event, const json& data);
    
    // Event handler setters (Backend → Agent)
    void onConnect(std::function<void()> callback);
    void onDisconnect(std::function<void()> callback);
    void onDockerControl(std::function<void(const DockerControlCommand&)> callback);
    void onDockerLogsStart(std::function<void(const std::string&)> callback);
    void onDockerLogsStop(std::function<void(const std::string&)> callback);
    void onDockerTerminalStart(std::function<void(const std::string&)> callback);
    void onDockerTerminalStop(std::function<void(const std::string&)> callback);
    void onDockerTerminalData(std::function<void(const std::string&, const std::string&)> callback);
    void onFileSystemList(std::function<void(const std::string&, const std::string&)> callback);
    void onDeployCompose(std::function<void(const std::string&, std::function<void(const json&)>)> callback);
    
private:
    void doConnect();
    void doRead();
    void doWrite();
    void handleMessage(const std::string& message);
    
    std::string url_;
    std::string host_;
    std::string port_;
    std::string path_;
    std::string agent_name_;
    std::string token_;
    
    net::io_context ioc_;
    tcp::resolver resolver_;
    websocket::stream<tcp::socket> ws_;
    beast::flat_buffer buffer_;
    
    std::thread io_thread_;
    std::atomic<bool> connected_;
    std::atomic<bool> running_;
    
    std::mutex write_mutex_;
    std::vector<std::string> write_queue_;
    std::chrono::seconds reconnect_delay_;
    
    // Event callbacks
    std::function<void()> on_connect_;
    std::function<void()> on_disconnect_;
    std::function<void(const DockerControlCommand&)> on_docker_control_;
    std::function<void(const std::string&)> on_docker_logs_start_;
    std::function<void(const std::string&)> on_docker_logs_stop_;
    std::function<void(const std::string&)> on_docker_terminal_start_;
    std::function<void(const std::string&)> on_docker_terminal_stop_;
    std::function<void(const std::string&, const std::string&)> on_docker_terminal_data_;
    std::function<void(const std::string&, const std::string&)> on_file_system_list_;
    std::function<void(const std::string&, std::function<void(const json&)>)> on_deploy_compose_;
};

// Helper functions
json agentInfoToJson(const AgentInfo& info);

} // namespace communication
} // namespace nexus
