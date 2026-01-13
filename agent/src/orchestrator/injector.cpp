#include "nexus/orchestrator/injector.h"
#include "nexus/utils/logger.h"
#include <filesystem>
#include <fstream>
#include <array>
#include <memory>
#include <iostream>
#include <map>

namespace fs = std::filesystem;

namespace nexus {
namespace orchestrator {

Injector::Injector() {}

bool Injector::injectSystemd(const std::string& serviceName, const std::string& injectorPath, const std::map<std::string, std::string>& envVars) {
    Logger::getInstance().info("Attempting to inject Systemd service: {}", serviceName);

    try {
        // 1. Prepare drop-in directory
        std::string servicePath = "/etc/systemd/system/" + serviceName + ".d";
        if (!fs::exists(servicePath)) {
            fs::create_directories(servicePath);
        }

        // 2. Create override.conf
        std::string overridePath = servicePath + "/nexus-agent.conf";
        std::ofstream overrideFile(overridePath);
        if (!overrideFile.is_open()) {
            Logger::getInstance().error("Failed to create override file: {}", overridePath);
            return false;
        }

        overrideFile << "[Service]\n";
        overrideFile << "Environment=\"NODE_OPTIONS=--require " << injectorPath << "\"\n";
        
        for (const auto& [key, value] : envVars) {
            overrideFile << "Environment=\"" << key << "=" << value << "\"\n";
        }
        
        overrideFile.close();

        Logger::getInstance().info("Created Systemd override: {}", overridePath);

        // 3. Reload daemon and restart service
        Logger::getInstance().info("Reloading Systemd daemon...");
        std::string reloadOutput = exec("systemctl daemon-reload");
        
        Logger::getInstance().info("Restarting service: {}", serviceName);
        if (restartService(serviceName)) {
            Logger::getInstance().info("Successfully injected and restarted service: {}", serviceName);
            return true;
        } else {
            Logger::getInstance().error("Failed to restart service: {}", serviceName);
            return false;
        }

    } catch (const std::exception& e) {
        Logger::getInstance().error("Exception during Systemd injection: {}", e.what());
        return false;
    }
}

bool Injector::injectDocker(const std::string& containerId, const std::string& injectorPath) {
    // Docker injection requires recreating the container or using a complex attach mechanism.
    // For now, we will log advice.
    Logger::getInstance().warn("Auto-injection for Docker container {} is not yet fully automated.", containerId);
    Logger::getInstance().warn("To instrument this container, please add the following environment variable to your run command or docker-compose.yml:");
    Logger::getInstance().warn("NODE_OPTIONS='--require {}'", injectorPath);
    return false;
}

std::string Injector::getSystemdServiceName(int pid) {
    std::string cmd = "ps -o unit= -p " + std::to_string(pid);
    try {
        std::string output = exec(cmd.c_str());
        // Output might contain newline
        if (!output.empty() && output.back() == '\n') {
            output.pop_back();
        }
        
        // Check if it looks like a service
        if (output.find(".service") != std::string::npos) {
            // Trim whitespace just in case
            output.erase(0, output.find_first_not_of(" \t\n\r"));
            output.erase(output.find_last_not_of(" \t\n\r") + 1);
            return output;
        }
    } catch (...) {
        // Ignore errors
    }
    return "";
}

bool Injector::restartService(const std::string& serviceName) {
    std::string cmd = "systemctl restart " + serviceName;
    std::string output = exec(cmd.c_str());
    // Basic check: if output is empty and command exit code was 0 (popen doesn't give exit code directly roughly), 
    // we assume success if no error logged. 
    // Better way: use status check.
    
    // Check status
    std::string statusCmd = "systemctl is-active " + serviceName;
    std::string status = exec(statusCmd.c_str());
    if (status.find("active") != std::string::npos) {
        return true;
    }
    return false;
}

std::string Injector::exec(const char* cmd) {
    std::array<char, 128> buffer;
    std::string result;
    std::unique_ptr<FILE, decltype(&pclose)> pipe(popen(cmd, "r"), pclose);
    if (!pipe) {
        throw std::runtime_error("popen() failed!");
    }
    while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr) {
        result += buffer.data();
    }
    return result;
}

} // namespace orchestrator
} // namespace nexus
