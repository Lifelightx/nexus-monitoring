#include "nexus/communication/websocket_client.h"
#include "nexus/utils/logger.h"
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/connect.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <curl/curl.h>
#include <sstream>

namespace nexus {
namespace communication {

WebSocketClient::WebSocketClient(const std::string& url, const std::string& agentName, const std::string& token)
    : url_(url), agent_name_(agentName), token_(token),
      resolver_(ioc_), ws_(ioc_), connected_(false), running_(false), reconnect_delay_(5) {
    
    // Parse URL (e.g., "http://localhost:3000")
    size_t protocol_end = url.find("://");
    if (protocol_end != std::string::npos) {
        std::string rest = url.substr(protocol_end + 3);
        size_t port_start = rest.find(":");
        size_t path_start = rest.find("/");
        
        if (port_start != std::string::npos) {
            host_ = rest.substr(0, port_start);
            if (path_start != std::string::npos) {
                port_ = rest.substr(port_start + 1, path_start - port_start - 1);
                path_ = rest.substr(path_start);
            } else {
                port_ = rest.substr(port_start + 1);
                path_ = "/";
            }
        } else {
            if (path_start != std::string::npos) {
                host_ = rest.substr(0, path_start);
                path_ = rest.substr(path_start);
            } else {
                host_ = rest;
                path_ = "/";
            }
            port_ = "3000"; // default
        }
    }
    
    // Socket.io WebSocket path
    path_ = "/socket.io/?EIO=4&transport=websocket";
}

WebSocketClient::~WebSocketClient() {
    disconnect();
}

bool WebSocketClient::connect() {
    // Start background thread for reading/reconnecting
    if (running_) return true; // Already running
    
    running_ = true;
    io_thread_ = std::thread([this]() { this->run(); });
    
    return true; 
}

// Perform a single connection attempt (Synchronous)
void WebSocketClient::doConnect() {
     try {
        Logger::getInstance().info("Connecting to WebSocket at {}:{}...", host_, port_);

        // Prepare auth data for Socket.io handshake
        json auth_data = {
            {"token", token_},
            {"agentName", agent_name_},
            {"os", "linux"}
        };
        
        std::string auth_json = auth_data.dump();
        
        // URL-encode the auth JSON
        CURL* curl_encoder = curl_easy_init();
        char* encoded_auth = curl_easy_escape(curl_encoder, auth_json.c_str(), auth_json.length());
        std::string auth_param = encoded_auth;
        curl_free(encoded_auth);
        curl_easy_cleanup(curl_encoder);
        
        // Connect directly with WebSocket transport
        // Path: /socket.io/?EIO=4&transport=websocket&auth=...
        
        path_ = "/socket.io/?EIO=4&transport=websocket&auth=" + auth_param;
        
        // Resolve hostname
        auto const results = resolver_.resolve(host_, port_);
        
        // Connect to server
        net::connect(ws_.next_layer(), results.begin(), results.end());
        
        // Set WebSocket options
        ws_.set_option(websocket::stream_base::decorator(
            [this](websocket::request_type& req) {
                req.set(http::field::sec_websocket_protocol, "websocket");
            }
        ));
        
        // Perform WebSocket handshake
        ws_.handshake(host_, path_);
        
        connected_ = true;
        Logger::getInstance().info("WebSocket connected to {}:{}", host_, port_);
        
        // Trigger connect callback
        if (on_connect_) {
            on_connect_();
        }
        
    } catch (std::exception const& e) {
        Logger::getInstance().error("WebSocket connection attempt failed: {}", e.what());
        connected_ = false;
        throw; // Re-throw to caller
    }
}

void WebSocketClient::disconnect() {
    running_ = false; // Stop the run loop
    
    if (!connected_) return;
    connected_ = false;
    
    try {
        ws_.close(websocket::close_code::normal);
    } catch (...) {}
    
    if (io_thread_.joinable()) {
        io_thread_.join();
    }
    
    if (on_disconnect_) {
        on_disconnect_();
    }
    
    Logger::getInstance().info("WebSocket disconnected");
}

bool WebSocketClient::isConnected() const {
    return connected_;
}

void WebSocketClient::run() {
    Logger::getInstance().info("WebSocket client thread started");

    while (running_) {
        if (!connected_) {
            try {
                doConnect();
            } catch (...) {
                // Wait before retrying
                std::this_thread::sleep_for(reconnect_delay_);
                continue;
            }
        }

        if (connected_) {
            try {
                doRead();
            } catch (std::exception const& e) {
                Logger::getInstance().error("WebSocket read error: {}", e.what());
                connected_ = false;
                
                // Close socket cleanly if possible
                try { ws_.close(websocket::close_code::abnormal); } catch(...) {}

                if (on_disconnect_) {
                    on_disconnect_();
                }
            }
        }
    }
    Logger::getInstance().info("WebSocket client thread stopped");
}

void WebSocketClient::doRead() {
    buffer_.clear();
    ws_.read(buffer_);
    
    std::string message = beast::buffers_to_string(buffer_.data());
    
    if (message.empty()) return;
    
// Protocol:
    char msg_type = message[0];
    // '0' => Open (Server sends session ID) -> Client must send "40" (Connect to namespace)
    // '2' => Ping -> Client must send "3" (Pong)
    // '4' => Message
    // '40' => Connect (Client -> Server)
    // '42' => Event (Server -> Client)

    if (msg_type == '0') {
        // Open packet received, send Connect packet
        Logger::getInstance().info("Received Open packet, sending Connect");
        try {
             ws_.write(net::buffer("40")); // Connect to default namespace
        } catch (std::exception const& e) {
             Logger::getInstance().error("Failed to send Connect: {}", e.what());
        }
    }
    else if (msg_type == '2') {
        Logger::getInstance().debug("Received PING, sending PONG");
        try {
             ws_.write(net::buffer("3"));
        } catch (std::exception const& e) {
             Logger::getInstance().error("Failed to send PONG: {}", e.what());
        }
    } else if (msg_type == '4' && message.length() > 1) {
        // Socket.io message
        char sub_type = message[1];
        
        if (sub_type == '0') {
            // Connection acknowledged
            Logger::getInstance().info("Socket.io connection acknowledged");
        } else if (sub_type == '2') {
            // Event message
            handleMessage(message);
        }
    }
}

void WebSocketClient::doWrite() {
    std::lock_guard<std::mutex> lock(write_mutex_);
    
    if (write_queue_.empty()) return;
    
    std::string message = write_queue_.front();
    write_queue_.erase(write_queue_.begin());
    
    try {
        ws_.write(net::buffer(message));
    } catch (std::exception const& e) {
        Logger::getInstance().error("WebSocket write error: {}", e.what());
    }
}

void WebSocketClient::emit(const std::string& event, const json& data) {
    if (!connected_) return;
    
    // Socket.io message format: 42["event",{data}]
    json message = json::array({event, data});
    std::string payload = "42" + message.dump();
    
    std::lock_guard<std::mutex> lock(write_mutex_);
    write_queue_.push_back(payload);
    
    // Write immediately if possible
    if (write_queue_.size() == 1) {
        try {
            ws_.write(net::buffer(payload));
            write_queue_.clear();
        } catch (std::exception const& e) {
            Logger::getInstance().error("Failed to emit event {}: {}", event, e.what());
        }
    }
}

void WebSocketClient::emitRegister(const AgentInfo& info) {
    json data = agentInfoToJson(info);
    emit("agent:register", data);
    Logger::getInstance().info("Sent agent registration");
}

void WebSocketClient::emitMetrics(const json& metrics) {
    emit("agent:metrics", metrics);
}

void WebSocketClient::emitDockerControlResult(const json& result) {
    emit("docker:control:result", result);
}

void WebSocketClient::emitFileListResult(const json& result) {
    emit("system:fs:list:result", result);
}

void WebSocketClient::handleMessage(const std::string& message) {
    // Socket.io message format: 42["event",{data}]
    if (message.length() < 3 || message.substr(0, 2) != "42") {
        return;
    }
    
    try {
        std::string json_str = message.substr(2);
        json parsed = json::parse(json_str);
        
        if (!parsed.is_array() || parsed.size() < 2) {
            return;
        }
        
        std::string event = parsed[0].get<std::string>();
        json data = parsed[1];
        
        // Handle different events
        if (event == "docker:control" && on_docker_control_) {
            DockerControlCommand cmd;
            cmd.action = data["action"].get<std::string>();
            cmd.containerId = data.value("containerId", "");
            cmd.payload = data.value("payload", json::object());
            on_docker_control_(cmd);
        }
        else if (event == "docker:logs:start" && on_docker_logs_start_) {
            std::string containerId = data["containerId"].get<std::string>();
            on_docker_logs_start_(containerId);
        }
        else if (event == "docker:logs:stop" && on_docker_logs_stop_) {
            std::string containerId = data["containerId"].get<std::string>();
            on_docker_logs_stop_(containerId);
        }
        else if (event == "docker:terminal:start" && on_docker_terminal_start_) {
            std::string containerId = data["containerId"].get<std::string>();
            on_docker_terminal_start_(containerId);
        }
        else if (event == "docker:terminal:stop" && on_docker_terminal_stop_) {
            std::string containerId = data["containerId"].get<std::string>();
            on_docker_terminal_stop_(containerId);
        }
        else if (event == "docker:terminal:data" && on_docker_terminal_data_) {
            std::string containerId = data["containerId"].get<std::string>();
            std::string termData = data["data"].get<std::string>();
            on_docker_terminal_data_(containerId, termData);
        }
        else if (event == "system:fs:list" && on_file_system_list_) {
            std::string path = data["path"].get<std::string>();
            std::string requestId = data["requestId"].get<std::string>();
            on_file_system_list_(path, requestId);
        }
        else if (event == "agent:deploy:compose" && on_deploy_compose_) {
            std::string composeContent = data.value("composeContent", "");
            auto callback = [this](const json& response) {
                emit("agent:deploy:compose:result", response);
            };
            on_deploy_compose_(composeContent, callback);
        }
        
    } catch (const json::exception& e) {
        Logger::getInstance().error("Failed to parse WebSocket message: {}", e.what());
    }
}

// Event handler setters
void WebSocketClient::onConnect(std::function<void()> callback) {
    on_connect_ = callback;
}

void WebSocketClient::onDisconnect(std::function<void()> callback) {
    on_disconnect_ = callback;
}

void WebSocketClient::onDockerControl(std::function<void(const DockerControlCommand&)> callback) {
    on_docker_control_ = callback;
}

void WebSocketClient::onDockerLogsStart(std::function<void(const std::string&)> callback) {
    on_docker_logs_start_ = callback;
}

void WebSocketClient::onDockerLogsStop(std::function<void(const std::string&)> callback) {
    on_docker_logs_stop_ = callback;
}

void WebSocketClient::onDockerTerminalStart(std::function<void(const std::string&)> callback) {
    on_docker_terminal_start_ = callback;
}

void WebSocketClient::onDockerTerminalStop(std::function<void(const std::string&)> callback) {
    on_docker_terminal_stop_ = callback;
}

void WebSocketClient::onDockerTerminalData(std::function<void(const std::string&, const std::string&)> callback) {
    on_docker_terminal_data_ = callback;
}

void WebSocketClient::onFileSystemList(std::function<void(const std::string&, const std::string&)> callback) {
    on_file_system_list_ = callback;
}

void WebSocketClient::onDeployCompose(std::function<void(const std::string&, std::function<void(const json&)>)> callback) {
    on_deploy_compose_ = callback;
}



} // namespace communication
} // namespace nexus
