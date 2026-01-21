#pragma once

#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include "nexus/collectors/process_scanner.h"
#include "nexus/collectors/docker_monitor.h"

namespace nexus {
namespace detectors {

using json = nlohmann::json;
using Process = collectors::ProcessInfo;
using DockerContainer = collectors::Container;

struct DetectedService {
    std::string name;
    std::string type;
    int port;
    int pid;
    std::string containerId;
    std::string status;
    std::string cmdline; // Added for verification
};

// Forward declarations
std::vector<DetectedService> detectServices(
    const std::vector<Process>& processes,
    const std::vector<DockerContainer>& containers
);

std::string detectServiceType(const std::string& processName, const std::string& cmdline);
std::string extractServiceName(const std::string& cmdline);

// Serialize detected services to JSON
inline json serializeServices(const std::vector<DetectedService>& services) {
    json result = json::array();
    
    for (const auto& svc : services) {
        result.push_back(json{
            {"name", svc.name},
            {"type", svc.type},
            {"port", svc.port},
            {"pid", svc.pid},
            {"containerId", svc.containerId.empty() ? json(nullptr) : json(svc.containerId)},
            {"status", svc.status}
        });
    }
    
    return result;
}

} // namespace detectors
} // namespace nexus
