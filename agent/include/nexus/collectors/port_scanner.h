#pragma once

#include <string>
#include <vector>
#include <map>

namespace nexus {
namespace collectors {

/**
 * Port Scanner - Level 3: Port & Network Detection
 * 
 * Uses `ss -lptn` to build reliable PID → Port mapping
 * Replaces broken /proc/net/tcp inode matching
 */
class PortScanner {
public:
    PortScanner();
    
    /**
     * Scan all listening ports and build PID → Ports map
     * Executes: ss -lptn (list listening TCP ports with process info)
     * Returns: map of PID → vector of ports
     */
    std::map<int, std::vector<int>> scan();
    
    /**
     * Get ports for a specific PID
     */
    std::vector<int> getPortsForPid(int pid) const;
    
private:
    /**
     * Parse ss command output
     * Format: tcp LISTEN 0 511 *:3000 *:* users:(("node",pid=505604,fd=24))
     */
    bool parseSsOutput(const std::string& line, int& pid, int& port);
    
    std::map<int, std::vector<int>> pid_to_ports_;
};

} // namespace collectors
} // namespace nexus
