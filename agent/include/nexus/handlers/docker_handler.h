#pragma once

#include <string>
#include <functional>
#include <map>

namespace nexus {
namespace handlers {

struct DockerControlResult {
    bool success;
    std::string message;
    std::string output;
};

class DockerHandler {
public:
    DockerHandler();
    
    // Docker control commands
    DockerControlResult startContainer(const std::string& containerId);
    DockerControlResult stopContainer(const std::string& containerId);
    DockerControlResult restartContainer(const std::string& containerId);
    DockerControlResult removeContainer(const std::string& containerId);
    DockerControlResult removeNetwork(const std::string& networkId);
    DockerControlResult createContainer(const std::string& image, 
                                       const std::string& name,
                                       const std::string& ports,
                                       const std::string& env,
                                       const std::string& restart,
                                       const std::string& command);
    
    // Log streaming
    bool startLogs(const std::string& containerId, 
                   std::function<void(const std::string&, const std::string&)> callback);
    void stopLogs(const std::string& containerId);
    
    // Terminal (basic implementation)
    bool startTerminal(const std::string& containerId,
                      std::function<void(const std::string&)> callback);
    void writeTerminal(const std::string& containerId, const std::string& data);
    void stopTerminal(const std::string& containerId);
    
    // Docker Compose
    DockerControlResult deployCompose(const std::string& composeContent);

private:
    std::string executeCommand(const std::string& command);
    
    struct LogStream {
        int pid;
        std::function<void(const std::string&, const std::string&)> callback;
    };
    
    struct TerminalSession {
        int pid;
        int stdin_fd;
        std::function<void(const std::string&)> callback;
    };
    
    std::map<std::string, LogStream> log_streams_;
    std::map<std::string, TerminalSession> terminal_sessions_;
};

} // namespace handlers
} // namespace nexus
