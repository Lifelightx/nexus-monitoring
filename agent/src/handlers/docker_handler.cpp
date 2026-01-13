#include "nexus/handlers/docker_handler.h"
#include "nexus/utils/logger.h"
#include <cstdio>
#include <cstdlib>
#include <array>
#include <memory>
#include <sstream>
#include <unistd.h>
#include <sys/wait.h>
#include <fcntl.h>
#include <thread>

namespace nexus {
namespace handlers {

DockerHandler::DockerHandler() {
}

std::string DockerHandler::executeCommand(const std::string& command) {
    std::array<char, 128> buffer;
    std::string result;
    
    FILE* pipe = popen(command.c_str(), "r");
    if (!pipe) {
        Logger::getInstance().error("Failed to execute command: {}", command);
        return "";
    }
    
    while (fgets(buffer.data(), buffer.size(), pipe) != nullptr) {
        result += buffer.data();
    }
    
    int status = pclose(pipe);
    
    if (status != 0) {
        Logger::getInstance().warn("Command exited with status {}: {}", status, command);
    }
    
    return result;
}

DockerControlResult DockerHandler::startContainer(const std::string& containerId) {
    Logger::getInstance().info("Starting container: {}", containerId);
    
    std::string command = "docker start " + containerId + " 2>&1";
    std::string output = executeCommand(command);
    
    DockerControlResult result;
    result.success = !output.empty() ? output.find(containerId) != std::string::npos : false;
    // docker start simply prints the containerId on success
    // On error, it prints "Error response from daemon..."
    if (output.find("Error") != std::string::npos || output.find("No such container") != std::string::npos) {
        result.success = false;
    } else {
        result.success = true;
    }
    
    result.message = result.success ? "Container started successfully" : ("Failed to start container: " + output);
    result.output = output;
    
    return result;
}

DockerControlResult DockerHandler::stopContainer(const std::string& containerId) {
    Logger::getInstance().info("Stopping container: {}", containerId);
    
    std::string command = "docker stop " + containerId + " 2>&1";
    std::string output = executeCommand(command);
    
    DockerControlResult result;
    if (output.find("Error") != std::string::npos || output.find("No such container") != std::string::npos) {
        result.success = false;
    } else {
        result.success = true;
    }
    
    result.message = result.success ? "Container stopped successfully" : ("Failed to stop container: " + output);
    result.output = output;
    
    return result;
}

DockerControlResult DockerHandler::restartContainer(const std::string& containerId) {
    Logger::getInstance().info("Restarting container: {}", containerId);
    
    std::string command = "docker restart " + containerId + " 2>&1";
    std::string output = executeCommand(command);
    
    DockerControlResult result;
    if (output.find("Error") != std::string::npos || output.find("No such container") != std::string::npos) {
        result.success = false;
    } else {
        result.success = true;
    }
    
    result.message = result.success ? "Container restarted successfully" : ("Failed to restart container: " + output);
    result.output = output;
    
    return result;
}

DockerControlResult DockerHandler::removeContainer(const std::string& containerId) {
    Logger::getInstance().info("Removing container: {}", containerId);
    
    std::string command = "docker rm -f " + containerId + " 2>&1";
    std::string output = executeCommand(command);
    
    DockerControlResult result;
    if (output.find("Error") != std::string::npos || output.find("No such container") != std::string::npos) {
        result.success = false;
    } else {
        result.success = true;
    }
    
    result.message = result.success ? "Container removed successfully" : ("Failed to remove container: " + output);
    result.output = output;
    
    return result;
}

DockerControlResult DockerHandler::removeNetwork(const std::string& networkId) {
    Logger::getInstance().info("Removing network: {}", networkId);
    
    std::string command = "docker network rm " + networkId + " 2>&1";
    std::string output = executeCommand(command);
    
    DockerControlResult result;
    result.success = !output.empty() && output.find("Error") == std::string::npos;
    result.message = result.success ? "Network removed successfully" : ("Failed to remove network: " + output);
    result.output = output;
    
    return result;
}
DockerControlResult DockerHandler::createContainer(
    const std::string& image,
    const std::string& name,
    const std::string& ports,
    const std::string& env,
    const std::string& restart,
    const std::string& command) {
    
    Logger::getInstance().info("Creating container from image: {}", image);
    
    std::ostringstream cmd;
    cmd << "docker run -d";
    
    if (!name.empty()) {
        cmd << " --name " << name;
    }
    
    if (!restart.empty() && restart != "no") {
        cmd << " --restart " << restart;
    }
    
    // Parse ports (comma-separated)
    if (!ports.empty()) {
        std::istringstream portsStream(ports);
        std::string port;
        while (std::getline(portsStream, port, ',')) {
            if (!port.empty()) {
                cmd << " -p " << port;
            }
        }
    }
    
    // Parse environment variables (comma-separated)
    if (!env.empty()) {
        std::istringstream envStream(env);
        std::string envVar;
        while (std::getline(envStream, envVar, ',')) {
            if (!envVar.empty()) {
                cmd << " -e " << envVar;
            }
        }
    }
    
    cmd << " " << image;
    
    if (!command.empty()) {
        cmd << " " << command;
    }
    
    std::string output = executeCommand(cmd.str() + " 2>&1");
    
    DockerControlResult result;
    // docker run -d prints the partial container ID on success
    // On error, it prints "docker: Error response from daemon..." or similar
    if (output.find("Error") != std::string::npos || output.find("docker:") != std::string::npos) {
        result.success = false;
    } else {
        result.success = true;
    }
    
    result.message = result.success ? "Container created successfully" : ("Failed to create container: " + output);
    result.output = output;
    
    return result;
}

bool DockerHandler::startLogs(const std::string& containerId,
                              std::function<void(const std::string&, const std::string&)> callback) {
    Logger::getInstance().info("Starting log stream for container: {}", containerId);
    
    stopLogs(containerId);
    
    int pipefd[2];
    if (pipe(pipefd) == -1) {
        Logger::getInstance().error("Failed to create pipe");
        return false;
    }
    
    pid_t pid = fork();
    if (pid == -1) {
        Logger::getInstance().error("Failed to fork");
        close(pipefd[0]);
        close(pipefd[1]);
        return false;
    }
    
    if (pid == 0) { // Child
        close(pipefd[0]); // Close read end
        dup2(pipefd[1], STDOUT_FILENO);
        dup2(pipefd[1], STDERR_FILENO);
        close(pipefd[1]);
        
        execlp("docker", "docker", "logs", "-f", "--tail", "100", containerId.c_str(), nullptr);
        exit(1);
    }
    
    // Parent
    close(pipefd[1]); // Close write end
    
    // Store stream info
    LogStream stream;
    stream.pid = pid;
    stream.callback = callback;
    log_streams_[containerId] = stream;
    
    // Start reader thread
    std::thread([this, containerId, fd = pipefd[0], cb = callback]() {
        std::array<char, 1024> buffer;
        while (true) {
            ssize_t bytes = read(fd, buffer.data(), buffer.size() - 1);
            if (bytes <= 0) break;
            
            buffer[bytes] = '\0';
            cb(containerId, std::string(buffer.data()));
        }
        close(fd);
    }).detach();
    
    return true;
}

void DockerHandler::stopLogs(const std::string& containerId) {
    auto it = log_streams_.find(containerId);
    if (it != log_streams_.end()) {
        kill(it->second.pid, SIGTERM);
        waitpid(it->second.pid, nullptr, 0); // Avoid zombies
        log_streams_.erase(it);
        Logger::getInstance().info("Stopped log stream for container: {}", containerId);
    }
}

bool DockerHandler::startTerminal(const std::string& containerId,
                                  std::function<void(const std::string&)> callback) {
    Logger::getInstance().info("Starting terminal for container: {}", containerId);
    
    // Stop existing terminal if any
    stopTerminal(containerId);
    
    // TODO: Implement terminal using fork/exec with PTY
    // For now, just log that it's not implemented
    Logger::getInstance().warn("Terminal not yet implemented in C++");
    
    return false;
}

void DockerHandler::writeTerminal(const std::string& containerId, const std::string& data) {
    auto it = terminal_sessions_.find(containerId);
    if (it != terminal_sessions_.end()) {
        // TODO: Write to terminal stdin
        write(it->second.stdin_fd, data.c_str(), data.length());
    }
}

void DockerHandler::stopTerminal(const std::string& containerId) {
    auto it = terminal_sessions_.find(containerId);
    if (it != terminal_sessions_.end()) {
        // TODO: Kill the terminal process
        terminal_sessions_.erase(it);
        Logger::getInstance().info("Stopped terminal for container: {}", containerId);
    }
}

DockerControlResult DockerHandler::deployCompose(const std::string& composeContent) {
    Logger::getInstance().info("Deploying Docker Compose stack");
    
    // Write compose content to temp file
    std::string tempFile = "/tmp/docker-compose-" + std::to_string(time(nullptr)) + ".yml";
    
    FILE* file = fopen(tempFile.c_str(), "w");
    if (!file) {
        DockerControlResult result;
        result.success = false;
        result.message = "Failed to create temporary compose file";
        return result;
    }
    
    fprintf(file, "%s", composeContent.c_str());
    fclose(file);
    
    // Try docker compose v2
    std::string command = "docker compose -f " + tempFile + " up -d --remove-orphans 2>&1";
    std::string output = executeCommand(command);
    
    // Clean up temp file
    unlink(tempFile.c_str());
    
    DockerControlResult result;
    result.success = output.find("error") == std::string::npos;
    result.message = result.success ? "Deployed successfully" : "Deployment failed";
    result.output = output;
    
    return result;
}

} // namespace handlers
} // namespace nexus
