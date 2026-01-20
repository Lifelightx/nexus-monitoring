#include "nexus/collectors/process_scanner.h"
#include "nexus/collectors/port_scanner.h"
#include "nexus/utils/logger.h"
#include <fstream>
#include <sstream>
#include <dirent.h>
#include <unistd.h>
#include <sys/types.h>
#include <pwd.h>
#include <cstring>
#include <cstdlib>
#include <algorithm>

namespace nexus {
namespace collectors {

ProcessScanner::ProcessScanner() {
}

bool ProcessScanner::scan() {
    processes_.clear();
    
    // Step 1: Scan all listening ports using ss command (like Node.js collectListeningPorts)
    PortScanner portScanner;
    auto portMap = portScanner.scan();
    
    // Step 2: Scan all processes from /proc (like Node.js collectProcesses)
    DIR* proc_dir = opendir("/proc");
    if (!proc_dir) {
        Logger::getInstance().error("Failed to open /proc directory");
        return false;
    }
    
    struct dirent* entry;
    while ((entry = readdir(proc_dir)) != nullptr) {
        if (entry->d_type == DT_DIR) {
            int pid = atoi(entry->d_name);
            if (pid > 0) {
                // Step 3: Merge process with port info (like Node.js mergeProcessesWithPorts)
                scanProcess(pid, portMap);
            }
        }
    }
    
    closedir(proc_dir);
    
    Logger::getInstance().debug("Scanned {} processes", processes_.size());
    return true;
}

bool ProcessScanner::scanProcess(int pid, const std::map<int, std::vector<int>>& portMap) {
    ProcessInfo proc;
    proc.pid = pid;
    proc.cpu_percent = 0.0;
    
    // Read /proc/[pid]/stat
    std::string stat_path = "/proc/" + std::to_string(pid) + "/stat";
    std::ifstream stat_file(stat_path);
    if (!stat_file.is_open()) {
        return false;
    }
    
    std::string line;
    std::getline(stat_file, line);
    
    // Parse stat file
    size_t name_start = line.find('(');
    size_t name_end = line.find(')');
    if (name_start != std::string::npos && name_end != std::string::npos) {
        proc.name = line.substr(name_start + 1, name_end - name_start - 1);
        
        if (name_end + 2 < line.length()) {
            char s = line[name_end + 2];
            switch(s) {
                case 'R': proc.state = "running"; break;
                case 'S': proc.state = "sleeping"; break;
                case 'D': proc.state = "disk sleep"; break;
                case 'Z': proc.state = "zombie"; break;
                case 'T': proc.state = "stopped"; break;
                case 't': proc.state = "tracing stop"; break;
                case 'X': proc.state = "dead"; break;
                default: proc.state = "unknown"; break;
            }
        }
    }
    
    // Read /proc/[pid]/cmdline
    std::string cmdline_path = "/proc/" + std::to_string(pid) + "/cmdline";
    std::ifstream cmdline_file(cmdline_path);
    if (cmdline_file.is_open()) {
        std::getline(cmdline_file, proc.cmdline, '\0');
        std::replace(proc.cmdline.begin(), proc.cmdline.end(), '\0', ' ');
    }
    
    // Read /proc/[pid]/status for memory and user
    std::string status_path = "/proc/" + std::to_string(pid) + "/status";
    std::ifstream status_file(status_path);
    if (status_file.is_open()) {
        std::string status_line;
        while (std::getline(status_file, status_line)) {
            if (status_line.find("VmRSS:") == 0) {
                std::istringstream iss(status_line);
                std::string label;
                uint64_t value;
                std::string unit;
                iss >> label >> value >> unit;
                proc.memory_bytes = value * 1024;
            } else if (status_line.find("Uid:") == 0) {
                std::istringstream iss(status_line);
                std::string label;
                uid_t ruid;
                iss >> label >> ruid;
                
                struct passwd* pw = getpwuid(ruid);
                if (pw) {
                    proc.user = pw->pw_name;
                } else {
                    proc.user = std::to_string(ruid);
                }
            }
        }
    }
    
    // Merge with port information from portMap
    auto it = portMap.find(pid);
    if (it != portMap.end()) {
        proc.ports = it->second;
    }
    
    processes_.push_back(proc);
    return true;
}

// Legacy method - no longer used but kept for compatibility
bool ProcessScanner::getProcessPorts(int pid, std::vector<int>& ports) {
    // This method is deprecated - ports are now obtained via PortScanner
    return false;
}

std::vector<ProcessInfo> ProcessScanner::findByName(const std::string& pattern) const {
    std::vector<ProcessInfo> result;
    for (const auto& proc : processes_) {
        if (proc.name.find(pattern) != std::string::npos || 
            proc.cmdline.find(pattern) != std::string::npos) {
            result.push_back(proc);
        }
    }
    return result;
}

std::vector<ProcessInfo> ProcessScanner::findByPort(int port) const {
    std::vector<ProcessInfo> result;
    for (const auto& proc : processes_) {
        if (std::find(proc.ports.begin(), proc.ports.end(), port) != proc.ports.end()) {
            result.push_back(proc);
        }
    }
    return result;
}

} // namespace collectors
} // namespace nexus
