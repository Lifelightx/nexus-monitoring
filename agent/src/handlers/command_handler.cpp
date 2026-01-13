#include "nexus/handlers/command_handler.h"
#include "nexus/utils/logger.h"
#include <chrono>
#include <iostream>

namespace nexus {
namespace handlers {

CommandHandler::CommandHandler(std::shared_ptr<communication::HttpAgentClient> httpClient, 
                               std::shared_ptr<DockerHandler> dockerHandler,
                               std::shared_ptr<FileHandler> fileHandler,
                               const std::string& agentName,
                               int pollIntervalMs)
    : httpClient_(httpClient), dockerHandler_(dockerHandler), fileHandler_(fileHandler), agentName_(agentName), pollIntervalMs_(pollIntervalMs) {}

CommandHandler::~CommandHandler() {
    stop();
}

void CommandHandler::start() {
    if (running_) return;
    running_ = true;
    pollerThread_ = std::thread(&CommandHandler::pollLoop, this);
    Logger::getInstance().info("Command poller started");
}

void CommandHandler::stop() {
    running_ = false;
    if (pollerThread_.joinable()) {
        pollerThread_.join();
    }
}

void CommandHandler::pollLoop() {
    while (running_) {
        try {
            // Poll for commands
            // GET /api/agent/commands/:agentName
            std::string endpoint = "/api/agent/commands/" + agentName_;
            auto response = httpClient_->get(endpoint);
            
            if (response.statusCode == 200) {
                try {
                    auto jsonResponse = json::parse(response.body);
                    if (jsonResponse.contains("success") && jsonResponse["success"].get<bool>() && 
                        jsonResponse.contains("command") && !jsonResponse["command"].is_null()) {
                        
                        processCommand(jsonResponse["command"]);
                    }
                } catch (const std::exception& e) {
                    Logger::getInstance().error("Failed to parse command response: {}", e.what());
                }
            } else if (response.statusCode != 404 && response.statusCode != 0) {
                 // Ignore 404 (no commands) or 0 (connection error which is logged elsewhere)
                 // Logger::getInstance().warn("Command poll failed with status: {}", response.statusCode);
            }

        } catch (const std::exception& e) {
            Logger::getInstance().error("Error in command poll loop: {}", e.what());
        }

        // Wait before next poll
        // Wait before next poll
        std::this_thread::sleep_for(std::chrono::milliseconds(pollIntervalMs_));
    }
}

void CommandHandler::processCommand(const json& command) {
    try {
        std::string id = command["id"];
        std::string type = command["type"];
        std::string action = command["action"];
        json params = command["params"];

        Logger::getInstance().info("Received command: {} {}", type, action);

        if (type == "docker") {
            executeDockerCommand(action, params, id);
        } else if (type == "file") {
            if (action == "list") {
                std::string path = params.value("path", ".");
                
                // Use FileHandler
                json files_result = fileHandler_->handleList(path);
                
                // Result structure expected by Backend/Frontend
                // Frontend expects: { success: true, files: [...] }
                // So "result" field in sendResult payload should contain this.
                
                // Note: sendResult wraps it in { status: ..., result: ... }
                // We send the 'files' array or error object as 'result'.
                
                if (files_result.contains("error")) {
                    sendResult(id, "failed", files_result);
                } else {
                    sendResult(id, "completed", files_result);
                }
            } else {
                Logger::getInstance().warn("Unknown file action: {}", action);
                sendResult(id, "failed", {{"error", "Unknown file action"}});
            }
        } else {
            Logger::getInstance().warn("Unknown command type: {}", type);
            sendResult(id, "failed", {{"error", "Unknown command type"}});
        }
    } catch (const std::exception& e) {
        Logger::getInstance().error("Error processing command: {}", e.what());
    }
}

void CommandHandler::executeDockerCommand(const std::string& action, const json& params, const std::string& commandId) {
    std::string containerId = params.contains("containerId") ? params["containerId"].get<std::string>() : "";
    
    Logger::getInstance().info("Executing Docker command: {} on {}", action, containerId);
    
    DockerControlResult result;
    result.success = false;
    result.message = "Unknown action";
    
    if (action == "start") {
        result = dockerHandler_->startContainer(containerId);
    } else if (action == "stop") {
        result = dockerHandler_->stopContainer(containerId);
    } else if (action == "restart") {
        result = dockerHandler_->restartContainer(containerId);
    } else if (action == "remove") {
        result = dockerHandler_->removeContainer(containerId);
    } else if (action == "create") {
        // Parse params for create
        std::string image = params.value("image", "");
        std::string name = params.value("name", "");
        std::string ports = params.value("ports", ""); // expecting comma separated string of ports
        std::string env = params.value("env", ""); // expecting comma separated string
        std::string restart = params.value("restart", "no");
        std::string cmd = params.value("command", "");
        
        result = dockerHandler_->createContainer(image, name, ports, env, restart, cmd);
    } else if (action == "deploy") {
        // Deploy compose stack
        std::string content = params.value("composeContent", "");
        if (content.empty()) {
            result.message = "Compose content is empty";
        } else {
            result = dockerHandler_->deployCompose(content);
        }
    } else if (action == "removeNetwork") {
        result = dockerHandler_->removeNetwork(containerId);
    }
    
    json resultJson = {
        {"message", result.message},
        {"output", result.output},
        {"success", result.success}
    };

    sendResult(commandId, result.success ? "completed" : "failed", resultJson);
}

void CommandHandler::sendResult(const std::string& commandId, const std::string& status, const json& result) {
    try {
        json payload = {
            {"status", status},
            {"result", result}
        };
        
        std::string endpoint = "/api/agent/commands/" + commandId + "/result";
        httpClient_->post(endpoint, payload);
        
    } catch (const std::exception& e) {
        Logger::getInstance().error("Failed to send command result: {}", e.what());
    }
}

} // namespace handlers
} // namespace nexus
