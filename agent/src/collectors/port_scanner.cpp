#include "nexus/collectors/port_scanner.h"
#include "nexus/utils/logger.h"
#include <cstdio>
#include <memory>
#include <array>
#include <sstream>
#include <regex>

namespace nexus {
namespace collectors {

PortScanner::PortScanner() {
}

std::map<int, std::vector<int>> PortScanner::scan() {
    pid_to_ports_.clear();
    
    // Execute ss -lptn (list listening TCP ports with numeric addresses and process info)
    FILE* pipe = popen("ss -lptn 2>/dev/null", "r");
    if (!pipe) {
        Logger::getInstance().error("Failed to execute ss command");
        return pid_to_ports_;
    }
    
    std::array<char, 256> buffer;
    std::string result;
    
    while (fgets(buffer.data(), buffer.size(), pipe) != nullptr) {
        result += buffer.data();
    }
    
    int status = pclose(pipe);
    if (status != 0) {
        Logger::getInstance().warn("ss command exited with status {}", status);
    }
    
    // Parse output line by line
    std::istringstream stream(result);
    std::string line;
    int parsed_count = 0;
    
    while (std::getline(stream, line)) {
        int pid, port;
        if (parseSsOutput(line, pid, port)) {
            pid_to_ports_[pid].push_back(port);
            parsed_count++;
        }
    }
    
    Logger::getInstance().debug("Port scanner found {} port mappings for {} processes", 
        parsed_count, pid_to_ports_.size());
    
    return pid_to_ports_;
}

std::vector<int> PortScanner::getPortsForPid(int pid) const {
    auto it = pid_to_ports_.find(pid);
    if (it != pid_to_ports_.end()) {
        return it->second;
    }
    return {};
}

bool PortScanner::parseSsOutput(const std::string& line, int& pid, int& port) {
    // Skip header line
    if (line.find("State") != std::string::npos || line.find("LISTEN") == std::string::npos) {
        return false;
    }
    
    // Example line:
    // LISTEN 0      511                *:3000            *:*    users:(("node",pid=505604,fd=24))
    // LISTEN 0      511        127.0.0.1:5037      0.0.0.0:*    users:(("adb",pid=31829,fd=7))
    
    try {
        // Extract port from local address (format: *:PORT or IP:PORT)
        std::regex port_regex(R"([\*0-9\.]+:(\d+))");
        std::smatch port_match;
        if (std::regex_search(line, port_match, port_regex)) {
            port = std::stoi(port_match[1].str());
        } else {
            return false;
        }
        
        // Extract PID from users field (format: users:(("name",pid=12345,fd=N)))
        std::regex pid_regex(R"(pid=(\d+))");
        std::smatch pid_match;
        if (std::regex_search(line, pid_match, pid_regex)) {
            pid = std::stoi(pid_match[1].str());
        } else {
            return false;
        }
        
        return true;
    } catch (const std::exception& e) {
        // Ignore parse errors
        return false;
    }
}

} // namespace collectors
} // namespace nexus
