#pragma once

#include <string>
#include <vector>
#include <cstdint>

namespace nexus {
namespace collectors {

struct ProcessInfo {
    int pid;
    std::string name;
    std::string cmdline;
    std::string user; // Added user field
    std::string state;
    uint64_t memory_bytes;
    double cpu_percent;
    std::vector<int> ports;
};

class ProcessScanner {
public:
    ProcessScanner();
    
    bool scan();
    
    const std::vector<ProcessInfo>& getProcesses() const { return processes_; }
    
    // Find processes by name pattern
    std::vector<ProcessInfo> findByName(const std::string& pattern) const;
    
    // Find processes listening on ports
    std::vector<ProcessInfo> findByPort(int port) const;

private:
    bool scanProcess(int pid);
    bool getProcessPorts(int pid, std::vector<int>& ports);
    
    std::vector<ProcessInfo> processes_;
};

} // namespace collectors
} // namespace nexus
