#pragma once

#include <string>
#include <nlohmann/json.hpp>
#include "websocket_client.h" // For AgentInfo struct

namespace nexus {
namespace communication {

using json = nlohmann::json;

class HttpAgentClient {
public:
    HttpAgentClient(const std::string& baseUrl, const std::string& token);
    ~HttpAgentClient();
    
    // Agent lifecycle
    bool registerAgent(const AgentInfo& info);
    bool sendHeartbeat(const std::string& agentName);
    
    // Metrics submission
    bool sendMetrics(const json& metrics);
    
    // Status check
    json getAgentStatus(const std::string& agentName);

    // Generic HTTP methods for CommandHandler
    struct Response {
        int statusCode;
        std::string body;
    };
    
    Response post(const std::string& endpoint, const json& data);
    Response get(const std::string& endpoint);
    
private:
    std::string baseUrl_;
    std::string token_;
    std::string agentId_;
    
    // Legacy internal helpers (can eventually replace with above)
    json httpPost(const std::string& endpoint, const json& data);
    json httpGet(const std::string& endpoint);
    
    static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp);
};

// Helper functions
json agentInfoToJson(const AgentInfo& info);

} // namespace communication
} // namespace nexus
