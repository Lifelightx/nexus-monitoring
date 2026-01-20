#pragma once

#include <nlohmann/json.hpp>
#include <sys/sysinfo.h> // For uptime
#include <vector>
#include <string>
#include <algorithm> // For std::sort, std::min
#include "nexus/collectors/system_metrics.h"
#include "nexus/collectors/docker_monitor.h"
#include "nexus/collectors/process_scanner.h"
#include "nexus/collectors/security_collector.h"
#include "nexus/detectors/service_detector.h"
#include "nexus/utils/time_utils.h"

namespace nexus {
namespace utils {

using json = nlohmann::json;
#include "nexus/utils/agent_info.h"

// Serialize system metrics to JSON
inline json serializeSystemMetrics(const nexus::collectors::SystemMetrics& metrics) {
    const auto& cpu = metrics.getCpuMetrics();
    const auto& mem = metrics.getMemoryMetrics();
    const auto& disks = metrics.getDiskMetrics();
    const auto& networks = metrics.getNetworkMetrics();
    
    json cpu_json = {
        {"usage_percent", cpu.usage_percent},
        {"loadAvg", {cpu.load_avg_1min, cpu.load_avg_5min, cpu.load_avg_15min}}
    };
    
    json mem_json = {
        {"total", mem.total_bytes},
        {"used", mem.used_bytes},
        {"free", mem.free_bytes},
        {"usage_percent", mem.usage_percent}
    };
    
    json disk_json = json::array();
    for (const auto& disk : disks) {
        disk_json.push_back({
            {"mount", disk.mount},
            {"device", disk.device},
            {"fs", disk.fs},
            {"use", disk.use},
            {"used", disk.used},
            {"size", disk.total}, 
        });
    }
    
    json network_json = json::array();
    for (const auto& net : networks) {
        network_json.push_back({
            {"interface", net.interface},
            {"rx_bytes", net.bytes_recv},
            {"tx_bytes", net.bytes_sent},
            {"rx_sec", net.rx_sec},
            {"tx_sec", net.tx_sec}
        });
    }
    
    return {
        {"cpu", cpu_json},
        {"memory", mem_json},
        {"disk", disk_json},
        {"network", network_json}
    };
}

// Serialize processes array for backend storage
inline json serializeProcesses(const std::vector<collectors::ProcessInfo>& processes) {
    json result = json::array();
    for (const auto& proc : processes) {
        json ports_json = json::array();
        for (int port : proc.ports) {
            ports_json.push_back({
                {"port", port},
                {"protocol", "tcp"}
            });
        }
        
        result.push_back({
            {"pid", proc.pid},
            {"name", proc.name},
            {"command", proc.cmdline},
            {"cpu", proc.cpu_percent},
            {"memory", proc.memory_bytes},
            {"ports", ports_json}
        });
    }
    return result;
}

// Serialize Docker data to JSON
inline json serializeDockerData(const nexus::collectors::DockerMonitor& docker) {
    // Sort containers by name
    auto containers = docker.getContainers();
    std::sort(containers.begin(), containers.end(), [](const auto& a, const auto& b) {
        return a.name < b.name;
    });

    json containers_json = json::array();
    for (const auto& container : containers) {
        json ports_json = json::array();
        for (const auto& port : container.ports) {
            ports_json.push_back({
                {"privatePort", port.private_port},
                {"publicPort", port.public_port},
                {"type", port.type}
            });
        }
        
        containers_json.push_back({
            {"id", container.id},
            {"name", container.name},
            {"image", container.image},
            {"state", container.state},
            {"status", container.status},
            {"ports", ports_json},
            {"stats", {
                {"cpuPercent", container.stats.cpu_percent},
                {"memUsage", container.stats.mem_usage},
                {"memPercent", container.stats.mem_percent}
            }}
        });
    }
    
    // Sort images by creation time (newest first)
    auto images = docker.getImages();
    std::sort(images.begin(), images.end(), [](const auto& a, const auto& b) {
        return a.created > b.created;
    });

    json images_json = json::array();
    for (const auto& image : images) {
        images_json.push_back({
            {"id", image.id},
            {"repoTags", image.repo_tags},
            {"size", image.size},
            {"history", [&image]() {
                json h_json = json::array();
                for (const auto& h : image.history) {
                    json layer_obj;
                    layer_obj["Id"] = h.id;
                    layer_obj["Created"] = h.created;
                    layer_obj["CreatedBy"] = h.created_by;
                    layer_obj["Size"] = h.size;
                    layer_obj["Comment"] = h.comment;
                    layer_obj["Tags"] = h.tags;
                    layer_obj["CreatedSince"] = nexus::utils::formatRelativeTime(h.created);
                    
                    h_json.push_back(layer_obj);
                }
                return h_json;
            }()}
        });
    }

    // Sort volumes by name
    auto volumes = docker.getVolumes();
    std::sort(volumes.begin(), volumes.end(), [](const auto& a, const auto& b) {
        return a.name < b.name;
    });

    json volumes_json = json::array();
    for (const auto& vol : volumes) {
        volumes_json.push_back({
            {"name", vol.name},
            {"driver", vol.driver},
            {"mountpoint", vol.mountpoint}
        });
    }

    // Sort networks by name
    auto networks = docker.getNetworks();
    std::sort(networks.begin(), networks.end(), [](const auto& a, const auto& b) {
        return a.name < b.name;
    });

    json networks_json = json::array();
    for (const auto& net : networks) {
        networks_json.push_back({
            {"id", net.id},
            {"name", net.name},
            {"driver", net.driver},
            {"scope", net.scope},
            {"internal", net.internal}
        });
    }
    
    const auto& info = docker.getInfo();

    return {
        {"containers", containers_json},
        {"images", images_json},
        {"volumes", volumes_json},
        {"networks", networks_json},
        {"info", {
            {"containers", info.containers},
            {"containersRunning", info.containers_running},
            {"containersStopped", info.containers_stopped},
            {"images", info.images}
        }}
    };
}

// Serialize process data to JSON
inline json serializeProcessData(const nexus::collectors::ProcessScanner& scanner) {
    const auto& processes = scanner.getProcesses();
    
    json processes_json = json::array();
    int count = 0;
    int running_count = 0;
    
    for (const auto& proc : processes) {
        if (proc.state == "running") {
            running_count++;
        }
        
        if (count++ < 20) { // Limit list to top 20
            json ports_json = json::array();
            for (int port : proc.ports) {
                ports_json.push_back(port);
            }
            
            processes_json.push_back({
                {"pid", proc.pid},
                {"name", proc.name},
                {"cmdline", proc.cmdline},
                {"memoryBytes", proc.memory_bytes},
                {"cpu", proc.cpu_percent},
                {"state", proc.state}, // Include state
                {"ports", ports_json}
            });
        }
    }
    
    return {
        {"all", processes.size()},    // Changed 'total' to 'all'
        {"running", running_count},   // Added running count
        {"list", processes_json}
    };
}

// Create complete metrics payload
inline json createMetricsPayload(
    const std::string& agentName,
    const nexus::collectors::SystemMetrics& sysMetrics,
    const nexus::collectors::DockerMonitor& dockerMonitor,
    const nexus::collectors::ProcessScanner& procScanner,
    nexus::collectors::SecurityCollector& secCollector
) {
    auto timestamp = std::chrono::system_clock::now();
    auto timestamp_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        timestamp.time_since_epoch()
    ).count();
    
    // Calculate Agent Uptime
    static auto agent_start_time = std::chrono::steady_clock::now();
    auto agent_uptime_sec = std::chrono::duration_cast<std::chrono::seconds>(
        std::chrono::steady_clock::now() - agent_start_time
    ).count();
    if (agent_uptime_sec < 1) agent_uptime_sec = 1;

    json metrics = {
        {"agent", agentName},
        {"timestamp", timestamp_ms}
    };

    // Add OS info
    auto agentInfo = collectAgentInfo(agentName);
    metrics["os"] = {
        {"distro", agentInfo.os},
        {"platform", agentInfo.platform},
        {"arch", agentInfo.arch},
        {"hostname", agentInfo.hostname},
        {"release", agentInfo.version}
    };

    // Add Uptime & Boot Time
    struct sysinfo si;
    if (sysinfo(&si) == 0) {
        metrics["uptime"] = si.uptime;
        metrics["bootTime"] = getBootTime();
    } else {
        metrics["uptime"] = 0;
        metrics["bootTime"] = 0;
    }
    metrics["agentUptime"] = agent_uptime_sec;
    
    // Add system metrics (augmented)
    const auto& cpu = sysMetrics.getCpuMetrics();
    json sys_json = serializeSystemMetrics(sysMetrics); 
    
    // Augment CPU with new fields
    metrics["cpu"] = sys_json["cpu"];
    metrics["cpu"]["temperature"] = cpu.temperature;
    metrics["cpu"]["cores"] = cpu.cores; // Logical
    metrics["cpu"]["physicalCores"] = cpu.physicalCores; // Physical
    metrics["cpu"]["processors"] = cpu.processors;
    metrics["cpu"]["load"] = cpu.usage_percent; // "Total Load"

    metrics["memory"] = sys_json["memory"];
    metrics["disk"] = sys_json["disk"];
    metrics["network"] = sys_json["network"];
    
    // Add Docker data
    json docker_json = serializeDockerData(dockerMonitor);
    metrics["docker"] = docker_json["containers"];
    metrics["dockerDetails"] = docker_json;
    
    // Enhance Process Data (Top CPU vs Top Mem)
    auto processes = procScanner.getProcesses();
    
    // Sort for CPU
    std::sort(processes.begin(), processes.end(), [](const collectors::ProcessInfo& a, const collectors::ProcessInfo& b) {
        return a.cpu_percent > b.cpu_percent;
    });
    
    json top_cpu_json = json::array();
    for (size_t i = 0; i < std::min(processes.size(), size_t(10)); ++i) {
        top_cpu_json.push_back(json{
            {"pid", processes[i].pid},
            {"name", processes[i].name},
            {"user", processes[i].user},
            {"cpu", processes[i].cpu_percent}
        });
    }

    // Sort for Memory
    std::sort(processes.begin(), processes.end(), [](const collectors::ProcessInfo& a, const collectors::ProcessInfo& b) {
        return a.memory_bytes > b.memory_bytes;
    });
    
    json top_mem_json = json::array();
    for (size_t i = 0; i < std::min(processes.size(), size_t(10)); ++i) {
        double mem_percent = 0.0;
        if (sysMetrics.getMemoryMetrics().total_bytes > 0) {
            mem_percent = 100.0 * processes[i].memory_bytes / sysMetrics.getMemoryMetrics().total_bytes;
        }
        
        top_mem_json.push_back(json{
            {"pid", processes[i].pid},
            {"name", processes[i].name},
            {"user", processes[i].user},
            {"mem", mem_percent}
        });
    }

    // Existing "list"
    json p_list = serializeProcessData(procScanner);
    
    metrics["processes"] = {
        {"all", p_list["all"]},
        {"running", p_list["running"]},
        {"topCpu", top_cpu_json},
        {"topMem", top_mem_json}
    };
    
    // Add services detection
    auto services = detectors::detectServices(procScanner.getProcesses(), dockerMonitor.getContainers());
    metrics["services"] = detectors::serializeServices(services);
    
    // Add Active Users
    // Add Active Users
    metrics["users"] = json::array(); 
    auto activeUsers = secCollector.getActiveUsers();
    for (const auto& user : activeUsers) {
        metrics["users"].push_back({
            {"user", user.user},
            {"terminal", user.terminal},
            {"host", user.host},
            {"loginTime", user.loginTime}
        });
    }

    // Add Security Events
    json failedLogins = json::array();
    for (const auto& login : secCollector.getFailedLogins()) {
        failedLogins.push_back({
            {"user", login.user},
            {"ip", login.ip},
            {"time", login.time},
            {"reason", login.reason}
        });
    }

    json sudoUsage = json::array();
    for (const auto& sudo : secCollector.getSudoUsage()) {
        sudoUsage.push_back({
            {"user", sudo.user},
            {"command", sudo.command},
            {"time", sudo.time},
            {"success", sudo.success},
            {"raw", sudo.raw}
        });
    }

    metrics["security"] = {
        {"failedLogins", failedLogins},
        {"sudoUsage", sudoUsage}
    };
    
    return metrics;
}

} // namespace utils
} // namespace nexus
