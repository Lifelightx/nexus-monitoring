#pragma once

#include <string>
#include <functional>
#include <thread>
#include <atomic>
#include <nlohmann/json.hpp>
#include "nexus/communication/http_agent_client.h"
#include "nexus/handlers/docker_handler.h"
#include "nexus/handlers/file_handler.h"

namespace nexus {
namespace handlers {

using json = nlohmann::json;

class CommandHandler {
public:
    CommandHandler(std::shared_ptr<communication::HttpAgentClient> httpClient, 
                  std::shared_ptr<DockerHandler> dockerHandler,
                  std::shared_ptr<FileHandler> fileHandler,
                  const std::string& agentName,
                  int pollIntervalMs);
    ~CommandHandler();

    void start();
    void stop();

private:
    void pollLoop();
    void processCommand(const json& command);
    void executeDockerCommand(const std::string& action, const json& params, const std::string& commandId);
    
    // Helper to send result back
    void sendResult(const std::string& commandId, const std::string& status, const json& result);

    std::shared_ptr<communication::HttpAgentClient> httpClient_;
    std::shared_ptr<DockerHandler> dockerHandler_;
    std::shared_ptr<FileHandler> fileHandler_;
    std::string agentName_;
    int pollIntervalMs_;
    std::atomic<bool> running_{false};
    std::thread pollerThread_;
};

} // namespace handlers
} // namespace nexus
