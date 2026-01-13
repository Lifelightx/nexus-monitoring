#pragma once

#include <string>
#include <vector>
#include <map>
#include <chrono>

namespace nexus {
namespace collectors {

struct CpuMetrics {
    double usage_percent;
    std::vector<double> per_core_usage; // Already existed but likely unused/impl wrong
    // New fields matching frontend expectation
    std::vector<double> processors; // Alias for per_core_usage logic
    double temperature;
    int cores;         // Logical
    int physicalCores; // Physical
    double load_avg_1min;
    double load_avg_5min;
    double load_avg_15min;
};

struct MemoryMetrics {
    uint64_t total_bytes;
    uint64_t used_bytes;
    uint64_t free_bytes;
    uint64_t cached_bytes;
    uint64_t swap_total_bytes;
    uint64_t swap_used_bytes;
    double usage_percent;
};

struct DiskMetrics {
    std::string device; // Filesystem source (e.g. /dev/sda1)
    std::string mount;  // Mount point (e.g. /)
    std::string fs;     // Filesystem type (e.g. ext4)
    uint64_t total;     // Total bytes
    uint64_t used;      // Used bytes
    uint64_t free;      // Free bytes
    double use;         // Usage percent
};

struct NetworkMetrics {
    std::string interface;
    uint64_t bytes_sent;
    uint64_t bytes_recv;
    uint64_t packets_sent;
    uint64_t packets_recv;
    // Rates
    double rx_sec;
    double tx_sec;
};

class SystemMetrics {
public:
    SystemMetrics();
    
    bool collect();
    
    const CpuMetrics& getCpuMetrics() const { return cpu_; }
    const MemoryMetrics& getMemoryMetrics() const { return memory_; }
    const std::vector<DiskMetrics>& getDiskMetrics() const { return disks_; }
    const std::vector<NetworkMetrics>& getNetworkMetrics() const { return networks_; }

private:
    bool collectCpu();
    bool collectMemory();
    bool collectDisk();
    bool collectNetwork();
    
    CpuMetrics cpu_;
    MemoryMetrics memory_;
    std::vector<DiskMetrics> disks_;
    std::vector<NetworkMetrics> networks_;
    
    // Previous values for calculating deltas
    std::map<std::string, uint64_t> prev_cpu_times_;
    std::map<std::string, DiskMetrics> prev_disk_stats_;
    std::map<std::string, NetworkMetrics> prev_network_stats_;
    std::chrono::steady_clock::time_point last_network_time_;
};

} // namespace collectors
} // namespace nexus
