#include "nexus/collectors/system_metrics.h"
#include "nexus/utils/logger.h"
#include <fstream>
#include <sstream>
#include <cstring>
#include <unistd.h>
#include <chrono>
#include <mntent.h>
#include <sys/statvfs.h>
#include <algorithm>
#include <set>
#include <utility>

namespace nexus {
namespace collectors {

SystemMetrics::SystemMetrics() {
    last_network_time_ = std::chrono::steady_clock::now();
}

bool SystemMetrics::collect() {
    bool success = true;
    success &= collectCpu();
    success &= collectMemory();
    success &= collectDisk();
    success &= collectNetwork();
    return success;
}

bool SystemMetrics::collectCpu() {
    // 1. Get Core Counts
    cpu_.cores = sysconf(_SC_NPROCESSORS_ONLN); // Logical cores

    // Accurate Physical Core Cleaning
    std::ifstream cpuinfo("/proc/cpuinfo");
    if (cpuinfo.is_open()) {
        std::set<std::pair<int, int>> unique_cores;
        std::string line;
        int current_phys_id = 0; // Default to 0 if not present
        int current_core_id = -1;
        bool has_core_id = false;

        while (std::getline(cpuinfo, line)) {
            if (line.find("physical id") == 0) {
                size_t colon = line.find(':');
                if (colon != std::string::npos) {
                    current_phys_id = std::stoi(line.substr(colon + 1));
                }
            }
            if (line.find("core id") == 0) {
                size_t colon = line.find(':');
                if (colon != std::string::npos) {
                    current_core_id = std::stoi(line.substr(colon + 1));
                    has_core_id = true;
                }
            }
            // End of processor block (empty line usually) or just check as we go?
            // "core id" usually comes after "physical id". 
            // Better strategy: Read whole block, insert on empty line.
            // Or simpler: inserts are cheap.
            if (has_core_id) {
                 unique_cores.insert({current_phys_id, current_core_id});
                 // Don't reset has_core_id immediately in case duplicates in same block? 
                 // No, blocks are distinct.
                 // Resetting at empty line is safer.
            }
            if (line.empty()) {
                current_phys_id = 0;
                current_core_id = -1;
                has_core_id = false;
            }
        }
        if (unique_cores.size() > 0) {
            cpu_.physicalCores = unique_cores.size();
        } else {
            cpu_.physicalCores = cpu_.cores / 2; // Fallback heuristic if parsing fails
            if (cpu_.physicalCores < 1) cpu_.physicalCores = 1;
        }
    } else {
         cpu_.physicalCores = cpu_.cores; // Fallback
    }

    // 2. Get Temperature
    // Try generalized thermal zones
    std::ifstream temp_file("/sys/class/thermal/thermal_zone0/temp");
    if (temp_file.is_open()) {
        int temp_milli;
        temp_file >> temp_milli;
        cpu_.temperature = temp_milli / 1000.0;
    } else {
        cpu_.temperature = 0.0; // N/A
    }

    // 3. Read /proc/stat for Total and Per-Core CPU metrics
    std::ifstream stat_file("/proc/stat");
    if (!stat_file.is_open()) {
        Logger::getInstance().error("Failed to open /proc/stat");
        return false;
    }
    
    std::string line;
    std::vector<double> current_per_core;
    
    while (std::getline(stat_file, line)) {
        if (line.substr(0, 3) != "cpu") continue;
        
        std::istringstream iss(line);
        std::string label;
        uint64_t user, nice, system, idle, iowait, irq, softirq, steal;
        iss >> label >> user >> nice >> system >> idle >> iowait >> irq >> softirq >> steal;
        
        uint64_t total = user + nice + system + idle + iowait + irq + softirq + steal;
        uint64_t idle_total = idle + iowait;

        if (label == "cpu") {
            // Total CPU Usage
            if (prev_cpu_times_.count("total") > 0) {
                uint64_t prev_total = prev_cpu_times_["total"];
                uint64_t prev_idle = prev_cpu_times_["idle"];
                
                uint64_t total_diff = total - prev_total;
                uint64_t idle_diff = idle_total - prev_idle;
                
                if (total_diff > 0) {
                    cpu_.usage_percent = 100.0 * (1.0 - (double)idle_diff / total_diff);
                }
            }
            prev_cpu_times_["total"] = total;
            prev_cpu_times_["idle"] = idle_total;
        } else {
            // Per-Core Usage (cpu0, cpu1...)
            // Use label as key for prev map
            std::string key_total = label + "_total";
            std::string key_idle = label + "_idle";
            
            double core_usage = 0.0;
            
            if (prev_cpu_times_.count(key_total) > 0) {
                uint64_t prev_total = prev_cpu_times_[key_total];
                uint64_t prev_idle = prev_cpu_times_[key_idle];
                
                uint64_t total_diff = total - prev_total;
                uint64_t idle_diff = idle_total - prev_idle;
                
                if (total_diff > 0) {
                    core_usage = 100.0 * (1.0 - (double)idle_diff / total_diff);
                }
            }
            current_per_core.push_back(core_usage);
            
            prev_cpu_times_[key_total] = total;
            prev_cpu_times_[key_idle] = idle_total;
        }
    }
    
    // Update vector
    cpu_.per_core_usage = current_per_core;
    cpu_.processors = current_per_core; // Alias
    
    // 4. Read load average
    std::ifstream loadavg_file("/proc/loadavg");
    if (loadavg_file.is_open()) {
        loadavg_file >> cpu_.load_avg_1min >> cpu_.load_avg_5min >> cpu_.load_avg_15min;
    }
    
    return true;
}

bool SystemMetrics::collectMemory() {
    // Read /proc/meminfo
    std::ifstream meminfo_file("/proc/meminfo");
    if (!meminfo_file.is_open()) {
        Logger::getInstance().error("Failed to open /proc/meminfo");
        return false;
    }
    
    std::string line;
    std::map<std::string, uint64_t> mem_values;
    
    while (std::getline(meminfo_file, line)) {
        std::istringstream iss(line);
        std::string key;
        uint64_t value;
        std::string unit;
        
        iss >> key >> value >> unit;
        key.pop_back(); // Remove trailing ':'
        
        // Convert kB to bytes
        mem_values[key] = value * 1024;
    }
    
    memory_.total_bytes = mem_values["MemTotal"];
    memory_.free_bytes = mem_values["MemFree"];
    memory_.cached_bytes = mem_values["Cached"] + mem_values["Buffers"];
    memory_.used_bytes = memory_.total_bytes - memory_.free_bytes - memory_.cached_bytes;
    memory_.swap_total_bytes = mem_values["SwapTotal"];
    memory_.swap_used_bytes = memory_.swap_total_bytes - mem_values["SwapFree"];
    
    if (memory_.total_bytes > 0) {
        memory_.usage_percent = 100.0 * memory_.used_bytes / memory_.total_bytes;
    }
    
    return true;
}

bool SystemMetrics::collectDisk() {
    disks_.clear();
    
    FILE* mount_file = setmntent("/proc/mounts", "r");
    if (!mount_file) {
        Logger::getInstance().error("Failed to open /proc/mounts");
        return false;
    }
    
    struct mntent* ent;
    while ((ent = getmntent(mount_file)) != NULL) {
        std::string device = ent->mnt_fsname;
        std::string mount = ent->mnt_dir;
        std::string options = ent->mnt_opts;
        std::string fs_type = ent->mnt_type;
        
        // Filter out pseudo-filesystems and irrelevant mounts
        if (device.find("/dev/") != 0) continue; // Must be a device
        if (mount.find("/snap") == 0) continue; // Skip snaps if desired? Keeping simple for now.
        if (fs_type == "squashfs") continue; // Usually snaps
        
        struct statvfs svfs;
        if (statvfs(mount.c_str(), &svfs) == 0) {
            DiskMetrics disk;
            disk.device = device;
            disk.mount = mount;
            disk.fs = fs_type;
            
            uint64_t total = svfs.f_blocks * svfs.f_frsize;
            uint64_t free = svfs.f_bfree * svfs.f_frsize;
            uint64_t avail = svfs.f_bavail * svfs.f_frsize; 
            uint64_t used = total - free; // used includes reserved blocks, typically
            // Logic: Used = Total - Free. But df shows Used based on Avail for non-root?
            // "Used" usually = Total - Free.
            // Percent = (Total - Avail) / Total? No.
            // Let's stick to simple: Used = Total - Free.
            // For percentage: (Total - Avail) / (Total - (Free - Avail)) ... complex.
            // Simple approach: used = total - buf.f_bfree * buf.f_bsize
            
            disk.total = total;
            disk.free = avail; // Available to unprivileged users
            disk.used = total - free; // Physical used
            
            if (disk.total > 0) {
                // Calculate percentage based on user-available space (like df)
                uint64_t used_user = total - avail; 
                // Wait, df calculates `used` as `total_reserved_excluded - avail`.
                // simpler: usage_percent = (1.0 - (double)avail / (double)(total - (free - avail))) * 100.0;
                // Actually, let's just use (used / total) * 100 for now, or match df behavior.
                // Standard: ((total - free) / total) * 100? No, root reserved space makes this tricky.
                
                // Let's use simple used/total for now.
                 disk.use = 100.0 * (1.0 - (double)avail / (double)total); 
                 // Note: this treats reserved blocks as 'used' which is safer.
            } else {
                disk.use = 0.0;
            }

            disks_.push_back(disk);
        }
    }
    
    endmntent(mount_file);
    return true;
}

bool SystemMetrics::collectNetwork() {
    // Read /proc/net/dev
    std::ifstream netdev_file("/proc/net/dev");
    if (!netdev_file.is_open()) {
        Logger::getInstance().error("Failed to open /proc/net/dev");
        return false;
    }
    
    networks_.clear();
    std::string line;
    
    // Skip header lines
    std::getline(netdev_file, line);
    std::getline(netdev_file, line);
    
    while (std::getline(netdev_file, line)) {
        // Remove leading whitespace
        size_t start = line.find_first_not_of(" \t");
        if (start == std::string::npos) continue;
        line = line.substr(start);
        
        std::istringstream iss(line);
        std::string interface;
        uint64_t recv_bytes, recv_packets, recv_errs, recv_drop;
        uint64_t recv_fifo, recv_frame, recv_compressed, recv_multicast;
        uint64_t send_bytes, send_packets, send_errs, send_drop;
        uint64_t send_fifo, send_colls, send_carrier, send_compressed;
        
        std::getline(iss, interface, ':');
        iss >> recv_bytes >> recv_packets >> recv_errs >> recv_drop
            >> recv_fifo >> recv_frame >> recv_compressed >> recv_multicast
            >> send_bytes >> send_packets >> send_errs >> send_drop
            >> send_fifo >> send_colls >> send_carrier >> send_compressed;
        
        // Skip loopback
        if (interface == "lo") {
            continue;
        }
        
        NetworkMetrics net;
        net.interface = interface;
        net.bytes_recv = recv_bytes;
        net.bytes_sent = send_bytes;
        net.packets_recv = recv_packets;
        net.packets_sent = send_packets;
        net.rx_sec = 0.0;
        net.tx_sec = 0.0;

        // Calculate rates
        auto now = std::chrono::steady_clock::now();
        if (prev_network_stats_.count(interface)) {
             auto& prev = prev_network_stats_[interface];
             double seconds = std::chrono::duration<double>(now - last_network_time_).count();
             
             if (seconds > 0) {
                 if (net.bytes_recv >= prev.bytes_recv)
                    net.rx_sec = (net.bytes_recv - prev.bytes_recv) / seconds;
                 if (net.bytes_sent >= prev.bytes_sent)
                    net.tx_sec = (net.bytes_sent - prev.bytes_sent) / seconds;
             }
        }
        
        prev_network_stats_[interface] = net;
        networks_.push_back(net);
    }
    
    last_network_time_ = std::chrono::steady_clock::now();
    
    // Sort networks by activity (descending) so active interfaces come first
    std::sort(networks_.begin(), networks_.end(), [](const NetworkMetrics& a, const NetworkMetrics& b) {
        return (a.bytes_recv + a.bytes_sent) > (b.bytes_recv + b.bytes_sent);
    });

    return true;
}

} // namespace collectors
} // namespace nexus
