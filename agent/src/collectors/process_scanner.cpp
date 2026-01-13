#include "nexus/collectors/process_scanner.h"
#include "nexus/utils/logger.h"
#include <fstream>
#include <sstream>
#include <dirent.h>
#include <unistd.h>
#include <sys/types.h>
#include <pwd.h> // for getpwuid
#include <cstring>
#include <cstdlib> // strtoul
#include <algorithm>

namespace nexus {
namespace collectors {

ProcessScanner::ProcessScanner() {
}

bool ProcessScanner::scan() {
    processes_.clear();
    
    DIR* proc_dir = opendir("/proc");
    if (!proc_dir) {
        Logger::getInstance().error("Failed to open /proc directory");
        return false;
    }
    
    struct dirent* entry;
    while ((entry = readdir(proc_dir)) != nullptr) {
        // Check if directory name is a number (PID)
        if (entry->d_type == DT_DIR) {
            int pid = atoi(entry->d_name);
            if (pid > 0) {
                scanProcess(pid);
            }
        }
    }
    
    closedir(proc_dir);
    
    Logger::getInstance().debug("Scanned {} processes", processes_.size());
    return true;
}

bool ProcessScanner::scanProcess(int pid) {
    ProcessInfo proc;
    proc.pid = pid;
    proc.cpu_percent = 0.0;
    
    // Read /proc/[pid]/stat
    std::string stat_path = "/proc/" + std::to_string(pid) + "/stat";
    std::ifstream stat_file(stat_path);
    if (!stat_file.is_open()) {
        return false; // Process may have exited
    }
    
    std::string line;
    std::getline(stat_file, line);
    
    // Parse stat file (format: pid (name) state ...)
    size_t name_start = line.find('(');
    size_t name_end = line.find(')');
    if (name_start != std::string::npos && name_end != std::string::npos) {
        proc.name = line.substr(name_start + 1, name_end - name_start - 1);
        
        // Get state (after name)
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
        // Replace null bytes with spaces
        std::replace(proc.cmdline.begin(), proc.cmdline.end(), '\0', ' ');
    }
    
    // Read /proc/[pid]/status for memory
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
                proc.memory_bytes = value * 1024; // Convert kB to bytes
            }
            if (status_line.find("Uid:") == 0) {
                std::istringstream iss(status_line);
                std::string label;
                uid_t ruid, euid, suid, fsuid;
                iss >> label >> ruid >> euid >> suid >> fsuid;
                
                struct passwd* pw = getpwuid(ruid);
                if (pw) {
                    proc.user = pw->pw_name;
                } else {
                    proc.user = std::to_string(ruid);
                }
            }
        }
    }
    
    // Get listening ports
    getProcessPorts(pid, proc.ports);
    
    processes_.push_back(proc);
    return true;
}

bool ProcessScanner::getProcessPorts(int pid, std::vector<int>& ports) {
    // Read /proc/net/tcp and /proc/net/tcp6
    std::vector<std::string> net_files = {"/proc/net/tcp", "/proc/net/tcp6"};
    
    // First, get inodes for this process
    std::vector<uint64_t> process_inodes;
    std::string fd_path = "/proc/" + std::to_string(pid) + "/fd";
    DIR* fd_dir = opendir(fd_path.c_str());
    if (fd_dir) {
        struct dirent* entry;
        while ((entry = readdir(fd_dir)) != nullptr) {
            if (entry->d_type == DT_LNK) {
                std::string link_path = fd_path + "/" + entry->d_name;
                char link_target[256];
                ssize_t len = readlink(link_path.c_str(), link_target, sizeof(link_target) - 1);
                if (len > 0) {
                    link_target[len] = '\0';
                    std::string target(link_target);
                    if (target.find("socket:[") == 0) {
                        uint64_t inode = std::stoull(target.substr(8, target.length() - 9));
                        process_inodes.push_back(inode);
                    }
                }
            }
        }
        closedir(fd_dir);
    }
    
    // Now check /proc/net/tcp for matching inodes
    for (const auto& net_file : net_files) {
        std::ifstream tcp_file(net_file);
        if (!tcp_file.is_open()) continue;
        
        std::string line;
        std::getline(tcp_file, line); // Skip header
        
        while (std::getline(tcp_file, line)) {
            std::istringstream iss(line);
            int sl;
            std::string local_addr, rem_addr, st;
            uint64_t inode;
            
            iss >> sl >> local_addr >> rem_addr >> st;
            // Skip several fields to get to inode
            for (int i = 0; i < 6; i++) {
                std::string dummy;
                iss >> dummy;
            }
            iss >> inode;
            
            // Check if this inode belongs to our process
            if (std::find(process_inodes.begin(), process_inodes.end(), inode) != process_inodes.end()) {
                // Parse port from local_addr (format: ADDR:PORT)
                size_t colon_pos = local_addr.find(':');
                if (colon_pos != std::string::npos) {
                    std::string port_hex = local_addr.substr(colon_pos + 1);
                    try {
                        int port = std::stoi(port_hex, nullptr, 16);
                        
                        // Only add listening ports (state 0A = LISTEN)
                        if (st == "0A") {
                            ports.push_back(port);
                        }
                    } catch (const std::exception& e) {
                        // Ignore invalid port values
                    }
                }
            }
        }
    }
    
    return true;
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
