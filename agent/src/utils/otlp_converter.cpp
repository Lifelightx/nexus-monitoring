#include "nexus/utils/otlp_converter.h"
#include <sys/utsname.h>
#include <unistd.h>

namespace nexus {
namespace utils {

nlohmann::json OTLPConverter::createResource(const std::string& serviceName) {
    nlohmann::json resource;
    
    // Get hostname
    char hostname[256];
    gethostname(hostname, sizeof(hostname));
    
    // Get OS info
    struct utsname unameData;
    uname(&unameData);
    
    resource["attributes"] = nlohmann::json::array();
    resource["attributes"].push_back(nlohmann::json{{"key", "service.name"}, {"value", nlohmann::json{{"stringValue", serviceName}}}});
    resource["attributes"].push_back(nlohmann::json{{"key", "host.name"}, {"value", nlohmann::json{{"stringValue", std::string(hostname)}}}});
    resource["attributes"].push_back(nlohmann::json{{"key", "os.type"}, {"value", nlohmann::json{{"stringValue", std::string(unameData.sysname)}}}});
    resource["attributes"].push_back(nlohmann::json{{"key", "os.version"}, {"value", nlohmann::json{{"stringValue", std::string(unameData.release)}}}});
    resource["attributes"].push_back(nlohmann::json{{"key", "service.version"}, {"value", nlohmann::json{{"stringValue", "1.0.0"}}}});
    
    return resource;
}

uint64_t OTLPConverter::getCurrentTimeNanos() {
    auto now = std::chrono::system_clock::now();
    auto duration = now.time_since_epoch();
    return std::chrono::duration_cast<std::chrono::nanoseconds>(duration).count();
}

nlohmann::json OTLPConverter::createGaugeDataPoint(
    double value,
    const std::map<std::string, std::string>& attributes
) {
    nlohmann::json dataPoint;
    dataPoint["asDouble"] = value;
    dataPoint["timeUnixNano"] = std::to_string(getCurrentTimeNanos());
    
    // Add attributes
    if (!attributes.empty()) {
        nlohmann::json attrs = nlohmann::json::array();
        for (const auto& [key, val] : attributes) {
            nlohmann::json attr;
            attr["key"] = key;
            attr["value"] = nlohmann::json{{"stringValue", val}};
            attrs.push_back(attr);
        }
        dataPoint["attributes"] = attrs;
    }
    
    return dataPoint;
}

nlohmann::json OTLPConverter::convertSystemMetrics(
    const std::string& serviceName,
    const collectors::SystemMetrics& sysMetrics
) {
    nlohmann::json otlpMetrics;
    otlpMetrics["resourceMetrics"] = nlohmann::json::array();
    
    nlohmann::json resourceMetric;
    resourceMetric["resource"] = createResource(serviceName);
    resourceMetric["scopeMetrics"] = nlohmann::json::array();
    
    nlohmann::json scopeMetric;
    scopeMetric["scope"] = {
        {"name", "nexus-agent"},
        {"version", "1.0.0"}
    };
    scopeMetric["metrics"] = nlohmann::json::array();
    
    // CPU Metrics
    const auto& cpu = sysMetrics.getCpuMetrics();
    nlohmann::json cpuUsageMetric;
    cpuUsageMetric["name"] = "system.cpu.usage";
    cpuUsageMetric["description"] = "CPU usage percentage";
    cpuUsageMetric["unit"] = "percent";
    cpuUsageMetric["gauge"] = nlohmann::json::object();
    cpuUsageMetric["gauge"]["dataPoints"] = nlohmann::json::array();
    cpuUsageMetric["gauge"]["dataPoints"].push_back(createGaugeDataPoint(cpu.usage_percent));
    scopeMetric["metrics"].push_back(cpuUsageMetric);
    
    // Memory Metrics
    const auto& mem = sysMetrics.getMemoryMetrics();
    scopeMetric["metrics"].push_back({
        {"name", "system.memory.usage"},
        {"description", "Memory usage percentage"},
        {"unit", "percent"},
        {"gauge", {
            {"dataPoints", nlohmann::json::array({
                createGaugeDataPoint(mem.usage_percent)
            })}
        }}
    });
    
    scopeMetric["metrics"].push_back({
        {"name", "system.memory.total"},
        {"description", "Total memory"},
        {"unit", "By"},
        {"gauge", {
            {"dataPoints", nlohmann::json::array({
                createGaugeDataPoint(static_cast<double>(mem.total_bytes))
            })}
        }}
    });
    
    scopeMetric["metrics"].push_back({
        {"name", "system.memory.used"},
        {"description", "Used memory"},
        {"unit", "By"},
        {"gauge", {
            {"dataPoints", nlohmann::json::array({
                createGaugeDataPoint(static_cast<double>(mem.used_bytes))
            })}
        }}
    });
    
    // Disk Metrics
    const auto& disks = sysMetrics.getDiskMetrics();
    for (const auto& disk : disks) {
        nlohmann::json diskMetric;
        diskMetric["name"] = "system.filesystem.usage";
        diskMetric["description"] = "Filesystem usage percentage";
        diskMetric["unit"] = "percent";
        diskMetric["gauge"] = nlohmann::json::object();
        diskMetric["gauge"]["dataPoints"] = nlohmann::json::array();
        
        nlohmann::json attrs;
        attrs["key"] = "device";
        attrs["value"] = nlohmann::json{{"stringValue", disk.device}};
        
        nlohmann::json attrs2;
        attrs2["key"] = "mountpoint";
        attrs2["value"] = nlohmann::json{{"stringValue", disk.mount}};
        
        std::map<std::string, std::string> attrMap = {
            {"device", disk.device},
            {"mountpoint", disk.mount}
        };
        
        diskMetric["gauge"]["dataPoints"].push_back(createGaugeDataPoint(disk.use, attrMap));
        scopeMetric["metrics"].push_back(diskMetric);
    }
    
    // Network Metrics
    const auto& networks = sysMetrics.getNetworkMetrics();
    for (const auto& net : networks) {
        // Network I/O bytes (cumulative)
        scopeMetric["metrics"].push_back({
            {"name", "system.network.io"},
            {"description", "Network I/O"},
            {"unit", "By"},
            {"gauge", {
                {"dataPoints", nlohmann::json::array({
                    createGaugeDataPoint(static_cast<double>(net.bytes_sent), {
                        {"device", net.interface},
                        {"direction", "transmit"}
                    }),
                    createGaugeDataPoint(static_cast<double>(net.bytes_recv), {
                        {"device", net.interface},
                        {"direction", "receive"}
                    })
                })}
            }}
        });
        
        // Network speed (bytes per second)
        scopeMetric["metrics"].push_back({
            {"name", "system.network.speed"},
            {"description", "Network speed in bytes per second"},
            {"unit", "By/s"},
            {"gauge", {
                {"dataPoints", nlohmann::json::array({
                    createGaugeDataPoint(net.tx_sec, {
                        {"device", net.interface},
                        {"direction", "transmit"}
                    }),
                    createGaugeDataPoint(net.rx_sec, {
                        {"device", net.interface},
                        {"direction", "receive"}
                    })
                })}
            }}
        });
    }
    
    resourceMetric["scopeMetrics"].push_back(scopeMetric);
    otlpMetrics["resourceMetrics"].push_back(resourceMetric);
    
    return otlpMetrics;
}

nlohmann::json OTLPConverter::convertDockerMetrics(
    const std::string& serviceName,
    const collectors::DockerMonitor& dockerMonitor
) {
    nlohmann::json otlpMetrics;
    otlpMetrics["resourceMetrics"] = nlohmann::json::array();
    
    nlohmann::json resourceMetric;
    resourceMetric["resource"] = createResource(serviceName);
    resourceMetric["scopeMetrics"] = nlohmann::json::array();
    
    nlohmann::json scopeMetric;
    scopeMetric["scope"] = {
        {"name", "nexus-agent-docker"},
        {"version", "1.0.0"}
    };
    scopeMetric["metrics"] = nlohmann::json::array();
    
    // Container count
    const auto& containers = dockerMonitor.getContainers();
    scopeMetric["metrics"].push_back({
        {"name", "docker.container.count"},
        {"description", "Number of Docker containers"},
        {"unit", "1"},
        {"gauge", {
            {"dataPoints", nlohmann::json::array({
                createGaugeDataPoint(static_cast<double>(containers.size()))
            })}
        }}
    });
    
    // Per-container metrics
    for (const auto& container : containers) {
        std::map<std::string, std::string> attrs = {
            {"container.id", container.id},
            {"container.name", container.name},
            {"container.image", container.image},
            {"container.state", container.state}
        };
        
        if (container.stats.cpu_percent > 0) {
            nlohmann::json cpuMetric;
            cpuMetric["name"] = "docker.container.cpu.usage";
            cpuMetric["description"] = "Container CPU usage";
            cpuMetric["unit"] = "percent";
            cpuMetric["gauge"] = nlohmann::json::object();
            cpuMetric["gauge"]["dataPoints"] = nlohmann::json::array();
            cpuMetric["gauge"]["dataPoints"].push_back(createGaugeDataPoint(container.stats.cpu_percent, attrs));
            scopeMetric["metrics"].push_back(cpuMetric);
        }
        
        if (container.stats.mem_usage > 0) {
            nlohmann::json memMetric;
            memMetric["name"] = "docker.container.memory.usage";
            memMetric["description"] = "Container memory usage";
            memMetric["unit"] = "By";
            memMetric["gauge"] = nlohmann::json::object();
            memMetric["gauge"]["dataPoints"] = nlohmann::json::array();
            memMetric["gauge"]["dataPoints"].push_back(createGaugeDataPoint(static_cast<double>(container.stats.mem_usage), attrs));
            scopeMetric["metrics"].push_back(memMetric);
        }
    }
    
    resourceMetric["scopeMetrics"].push_back(scopeMetric);
    otlpMetrics["resourceMetrics"].push_back(resourceMetric);
    
    return otlpMetrics;
}

} // namespace utils
} // namespace nexus
