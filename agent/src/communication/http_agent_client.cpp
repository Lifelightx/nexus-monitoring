#include "nexus/communication/http_agent_client.h"
#include "nexus/utils/logger.h"
#include <curl/curl.h>
#include <sstream>

namespace nexus {
namespace communication {

size_t HttpAgentClient::WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    userp->append((char*)contents, size * nmemb);
    return size * nmemb;
}

HttpAgentClient::HttpAgentClient(const std::string& baseUrl, const std::string& token)
    : baseUrl_(baseUrl), token_(token) {
    curl_global_init(CURL_GLOBAL_DEFAULT);
}

HttpAgentClient::~HttpAgentClient() {
    curl_global_cleanup();
}

bool HttpAgentClient::registerAgent(const AgentInfo& info) {
    try {
        json data = agentInfoToJson(info);
        json response = httpPost("/api/agent/register", data);
        
        if (response.contains("success") && response["success"].get<bool>()) {
            if (response.contains("agentId")) {
                agentId_ = response["agentId"].get<std::string>();
                Logger::getInstance().info("Agent registered successfully, ID: {}", agentId_);
                return true;
            }
        }
        
        std::string error = response.contains("error") ? response["error"].get<std::string>() : "Unknown error";
        Logger::getInstance().error("Agent registration failed: {}", error);
        return false;
        
    } catch (const std::exception& e) {
        Logger::getInstance().error("Agent registration exception: {}", e.what());
        return false;
    }
}

bool HttpAgentClient::sendHeartbeat(const std::string& agentName) {
    try {
        json data = {
            {"agentName", agentName}
        };
        
        json response = httpPost("/api/agent/heartbeat", data);
        return response.contains("success") && response["success"].get<bool>();
        
    } catch (const std::exception& e) {
        Logger::getInstance().error("Heartbeat failed: {}", e.what());
        return false;
    }
}

bool HttpAgentClient::sendMetrics(const json& metrics) {
    try {
        auto response = httpPost("/api/agent/metrics", metrics);
        return response.contains("success") && response["success"].get<bool>();
    } catch (const std::exception& e) {
        nexus::Logger::getInstance().error("Failed to send metrics: {}", e.what());
        return false;
    }
}



bool HttpAgentClient::sendLogs(const json& logs) {
    try {
        if (!agentId_.empty()) {
            json payload = {
                {"agentId", agentId_},
                {"logs", logs}
            };
            auto response = httpPost("/api/logs/batch", payload);
            return response.contains("success") && response["success"].get<bool>();
        } else {
             // Fallback if agentId not set yet (should not happen if registered)
             // Try to just send logs, backend might need token
             return false;
        }
    } catch (const std::exception& e) {
        nexus::Logger::getInstance().error("Failed to send logs: {}", e.what());
        return false;
    }
}

bool HttpAgentClient::sendOTLPMetrics(const json& otlpMetrics) {
    try {
        // Send to backend's OTLP endpoint
        auto response = httpPost("/api/otlp/v1/metrics", otlpMetrics);
        return response.contains("success") && response["success"].get<bool>();
    } catch (const std::exception& e) {
        nexus::Logger::getInstance().error("Failed to send OTLP metrics: {}", e.what());
        return false;
    }
}

json HttpAgentClient::getAgentStatus(const std::string& agentName) {
    try {
        return httpGet("/api/agent/status/" + agentName);
    } catch (const std::exception& e) {
        Logger::getInstance().error("Status check failed: {}", e.what());
        return json{{"success", false}, {"error", e.what()}};
    }
}

// Generic HTTP methods
HttpAgentClient::Response HttpAgentClient::post(const std::string& endpoint, const json& data) {
    try {
        std::string url = baseUrl_ + endpoint;
        std::string responseBuffer;
        std::string payload = data.dump();
        
        CURL* curl = curl_easy_init();
        if (curl) {
            struct curl_slist* headers = NULL;
            headers = curl_slist_append(headers, "Content-Type: application/json");
            std::string authHeader = "Authorization: Bearer " + token_;
            headers = curl_slist_append(headers, authHeader.c_str());
            
            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            curl_easy_setopt(curl, CURLOPT_POST, 1L);
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseBuffer);
            curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L); 
            
            CURLcode res = curl_easy_perform(curl);
            
            long http_code = 0;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
            
            curl_slist_free_all(headers);
            curl_easy_cleanup(curl);
            
            if (res != CURLE_OK) {
                Logger::getInstance().error("HTTP POST failed: {}", curl_easy_strerror(res));
                 return {0, ""};
            }
            
            return {static_cast<int>(http_code), responseBuffer};
        }
    } catch (const std::exception& e) {
        Logger::getInstance().error("HTTP POST Request failed: {}", e.what());
    }
    return {0, ""};
}

HttpAgentClient::Response HttpAgentClient::get(const std::string& endpoint) {
    try {
        std::string url = baseUrl_ + endpoint;
        std::string responseBuffer;
        
        CURL* curl = curl_easy_init();
        if (curl) {
            struct curl_slist* headers = NULL;
            headers = curl_slist_append(headers, "Content-Type: application/json");
            std::string authHeader = "Authorization: Bearer " + token_;
            headers = curl_slist_append(headers, authHeader.c_str());
            
            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            curl_easy_setopt(curl, CURLOPT_HTTPGET, 1L);
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseBuffer);
            curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L); 
            
            CURLcode res = curl_easy_perform(curl);
            
            long http_code = 0;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
            
            curl_slist_free_all(headers);
            curl_easy_cleanup(curl);
             
            if (res != CURLE_OK) {
                Logger::getInstance().error("HTTP GET failed: {}", curl_easy_strerror(res));
                return {0, ""};
            }
            
            return {static_cast<int>(http_code), responseBuffer};
        }
    } catch (const std::exception& e) {
        Logger::getInstance().error("HTTP GET Request failed: {}", e.what());
    }
    return {0, ""};
}

json HttpAgentClient::httpPost(const std::string& endpoint, const json& data) {
    auto res = post(endpoint, data);
    try {
        if (!res.body.empty()) {
            return json::parse(res.body);
        }
    } catch (...) {}
    return json();
}

json HttpAgentClient::httpGet(const std::string& endpoint) {
    auto res = get(endpoint);
    try {
        if (!res.body.empty()) {
            return json::parse(res.body);
        }
    } catch (...) {}
    return json();
}

// Helper functions (implemented here or included via another mechanism, simpler to keep here)
json agentInfoToJson(const AgentInfo& info) {
    return json{
        {"name", info.name},
        {"hostname", info.hostname},
        {"os", info.os},
        {"platform", info.platform},
        {"arch", info.arch},
        {"cpus", info.cpus},
        {"totalMemory", info.totalMemory},
        {"version", info.version}
    };
}

} // namespace communication
} // namespace nexus
