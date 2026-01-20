#include "nexus/collectors/log_collector.h"
#include "nexus/utils/logger.h"
#include <fstream>
#include <iostream>
#include <regex>
#include <filesystem>
#include <array>
#include <memory>
#include <algorithm>

namespace fs = std::filesystem;

namespace nexus {
namespace collectors {

// Helper to execute shell command
std::string execCmd(const std::string& cmd) {
    std::array<char, 128> buffer;
    std::string result;
    std::unique_ptr<FILE, decltype(&pclose)> pipe(popen(cmd.c_str(), "r"), pclose);
    if (!pipe) {
        return "";
    }
    while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr) {
        result += buffer.data();
    }
    return result;
}

LogCollector::LogCollector() {
    // Detect system log file
    if (fs::exists("/var/log/syslog")) {
        syslogPath_ = "/var/log/syslog"; // Ubuntu/Debian
    } else if (fs::exists("/var/log/messages")) {
        syslogPath_ = "/var/log/messages"; // RHEL/CentOS
    }
    
    // Initialize file position to end (don't read old logs on startup)
    if (!syslogPath_.empty()) {
        std::ifstream file(syslogPath_, std::ios::ate);
        if (file.is_open()) {
            lastPos_ = file.tellg();
            Logger::getInstance().info("LogCollector monitoring: {}", syslogPath_);
        }
    }
}

LogCollector::~LogCollector() {}

void LogCollector::collect(const DockerMonitor* dockerMonitor) {
    processSyslog();
    if (dockerMonitor) {
        processDockerLogs(*dockerMonitor);
    }
}

std::vector<LogEntry> LogCollector::getAndClearLogs() {
    std::vector<LogEntry> logs = std::move(buffer_);
    buffer_.clear(); 
    return logs;
}

void LogCollector::addLog(const std::string& type, const std::string& level, 
                          const std::string& source, const std::string& message) {
    if (buffer_.size() >= MAX_BUFFER_SIZE) return;

    LogEntry entry;
    entry.type = type;
    entry.level = level;
    entry.source = source;
    entry.message = message;
    
    auto now = std::chrono::system_clock::now();
    entry.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()).count();
        
    buffer_.push_back(entry);
}

void LogCollector::processSyslog() {
    if (syslogPath_.empty()) return;

    std::ifstream file(syslogPath_);
    if (!file.is_open()) return;

    // Check if file was truncated (log rotation)
    file.seekg(0, std::ios::end);
    std::streampos currentSize = file.tellg();
    
    if (currentSize < lastPos_) {
        lastPos_ = 0; // Reset
    }

    file.seekg(lastPos_);
    
    std::string line;
    while (std::getline(file, line)) {
        if (!line.empty()) {
            parseSyslogLine(line);
        }
    }
    
    lastPos_ = file.tellg();
}

void LogCollector::parseSyslogLine(const std::string& line) {
    size_t colonPos = line.find(": ");
    if (colonPos == std::string::npos) return;

    std::string header = line.substr(0, colonPos);
    std::string message = line.substr(colonPos + 2);
    
    std::string source = "system";
    size_t lastSpace = header.rfind(' ');
    if (lastSpace != std::string::npos) {
        source = header.substr(lastSpace + 1);
        size_t pidStart = source.find('[');
        if (pidStart != std::string::npos) {
            source = source.substr(0, pidStart);
        }
    }
    
    std::string type = "system";
    if (source == "kernel") type = "kernel";
    else if (source.find("docker") != std::string::npos) type = "docker";
    
    std::string level = "info";
    std::string msgLower = message;
    std::transform(msgLower.begin(), msgLower.end(), msgLower.begin(), ::tolower);
    
    if (msgLower.find("error") != std::string::npos || msgLower.find("fail") != std::string::npos) level = "error";
    else if (msgLower.find("warn") != std::string::npos) level = "warn";
    
    addLog(type, level, source, message);
}

void LogCollector::processDockerLogs(const DockerMonitor& monitor) {
    const auto& containers = monitor.getContainers();
    long long nowSec = std::chrono::duration_cast<std::chrono::seconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
        
    for (const auto& container : containers) {
        // Only monitor running containers
        if (container.state != "running") continue;
        
        // Initialize timestamp if new container
        if (containerLastLogTimes_.find(container.id) == containerLastLogTimes_.end()) {
            containerLastLogTimes_[container.id] = nowSec; // Start from now
            continue;
        }
        
        long long since = containerLastLogTimes_[container.id];
        
        // Run docker logs
        // --since accepts unix timestamp
        std::string cmd = "docker logs --since " + std::to_string(since) + " " + container.id + " 2>&1";
        std::string output = execCmd(cmd);
        
        if (!output.empty()) {
            std::stringstream ss(output);
            std::string line;
            while (std::getline(ss, line)) {
                if (!line.empty()) {
                    parseDockerLogLine(container.name, line);
                }
            }
        }
        
        containerLastLogTimes_[container.id] = nowSec;
    }
}

void LogCollector::parseDockerLogLine(const std::string& containerName, const std::string& line) {
    // Docker logs format varies. Assuming raw text for now.
    // Try to detect levels
    std::string level = "info";
    std::string msgLower = line;
    std::transform(msgLower.begin(), msgLower.end(), msgLower.begin(), ::tolower);
    
    if (msgLower.find("error") != std::string::npos || msgLower.find("exception") != std::string::npos) level = "error";
    else if (msgLower.find("warn") != std::string::npos) level = "warn";
    
    // Some logs have timestamps at start, we could parse them but for now use current receipt time
    // as addLog does.
    
    addLog("docker", level, containerName, line);
}

} // namespace collectors
} // namespace nexus
