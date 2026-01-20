#pragma once

#include <string>
#include <vector>
#include <fstream>
#include <chrono>
#include <filesystem>
#include <map>
#include "nexus/utils/json_fwd.h"
#include "nexus/collectors/docker_monitor.h"

namespace nexus {
namespace collectors {

struct LogEntry {
    std::string type;       // kernel, system, docker, agent, etc.
    std::string level;      // info, warn, error
    std::string source;     // nginx, kernel, etc.
    std::string message;
    long long timestamp;    // ms since epoch
    std::string metadata;   // JSON string
};

class LogCollector {
public:
    LogCollector();
    ~LogCollector();

    void collect(const DockerMonitor* dockerMonitor = nullptr); 
    
    // Returns logs collected since last call and clears internal buffer
    std::vector<LogEntry> getAndClearLogs();
    
    // Add an explicit log (e.g. from Agent's own logger)
    void addLog(const std::string& type, const std::string& level, 
                const std::string& source, const std::string& message);

private:
    void processSyslog();
    void processDockerLogs(const DockerMonitor& monitor);
    void parseSyslogLine(const std::string& line);
    void parseDockerLogLine(const std::string& containerName, const std::string& line);
    
    std::vector<LogEntry> buffer_;
    
    // File tracking
    std::string syslogPath_;
    std::streampos lastPos_ = 0;
    
    // Docker tracking: Container ID -> Last Log Timestamp (unix seconds)
    std::map<std::string, long long> containerLastLogTimes_;
    
    // Max buffer size to prevent memory issues
    const size_t MAX_BUFFER_SIZE = 1000;
};

} // namespace collectors
} // namespace nexus
