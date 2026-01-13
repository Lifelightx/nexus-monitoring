#pragma once

#include "nexus/communication/websocket_client.h"
#include <sys/utsname.h>
#include <sys/sysinfo.h>
#include <unistd.h>
#include <fstream>
#include <string>
#include <chrono>

namespace nexus {
namespace utils {

inline communication::AgentInfo collectAgentInfo(const std::string& agentName) {
    communication::AgentInfo info;
    
    info.name = agentName;
    
    // Get hostname
    char hostname[256];
    gethostname(hostname, sizeof(hostname));
    info.hostname = hostname;
    
    struct utsname uname_data;
    if (uname(&uname_data) == 0) {
        info.os = uname_data.sysname;      // Initial: "Linux" (will be overwritten by pretty name)
        info.platform = uname_data.sysname; // "Linux" (This is what frontend expects for 'Platform')
        info.arch = uname_data.machine;     // "x86_64"
    }

    // Try to get prettier OS name from /etc/os-release
    std::ifstream os_release("/etc/os-release");
    if (os_release.is_open()) {
        std::string line;
        while (std::getline(os_release, line)) {
            if (line.find("PRETTY_NAME=") == 0) {
                // Extract value inside quotes
                size_t first_quote = line.find('"');
                size_t last_quote = line.rfind('"');
                if (first_quote != std::string::npos && last_quote != std::string::npos && last_quote > first_quote) {
                    info.os = line.substr(first_quote + 1, last_quote - first_quote - 1);
                } else {
                    info.os = line.substr(12); // No quotes? just take rest
                }
                break;
            }
        }
    }
    
    // Get CPU count
    info.cpus = sysconf(_SC_NPROCESSORS_ONLN);
    
    // Get total memory
    long pages = sysconf(_SC_PHYS_PAGES);
    long page_size = sysconf(_SC_PAGE_SIZE);
    info.totalMemory = pages * page_size;
    
    info.version = "1.0.0-cpp";
    
    return info;
}

inline long long getBootTime() {
    struct sysinfo si;
    if (sysinfo(&si) == 0) {
        auto now = std::chrono::system_clock::now();
        auto uptime_sec = std::chrono::seconds(si.uptime);
        auto boot_point = now - uptime_sec;
        return std::chrono::duration_cast<std::chrono::milliseconds>(boot_point.time_since_epoch()).count();
    }
    return 0;
}

} // namespace utils
} // namespace nexus
