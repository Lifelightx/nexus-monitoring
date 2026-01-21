#include "nexus/detectors/service_detector.h"
#include <algorithm>
#include <sstream>
#include "nexus/utils/logger.h"

namespace nexus {
namespace detectors {

std::vector<DetectedService> detectServices(
    const std::vector<Process>& processes,
    const std::vector<DockerContainer>& containers
) {
    std::vector<DetectedService> services;
    
    for (const auto& proc : processes) {
        // Only consider processes with ports
        if (proc.ports.empty()) {
            // Logger::getInstance().debug("Skipping process {} [{}]: No ports", proc.name, proc.pid);
            continue;
        }
        
        Logger::getInstance().debug("Found process with ports: {} [PID {}] - Ports: {}", 
            proc.name, proc.pid, proc.ports.size());
        
        // Detect service type (use process name as fallback)
        std::string type = detectServiceType(proc.name, proc.cmdline);
        
        // Extract service name from command line or use process name
        std::string name = extractServiceName(proc.cmdline);
        if (name.empty()) {
            name = proc.name;  // Fallback to process name
        }
        
        DetectedService service;
        service.name = name;
        service.type = type;
        service.port = proc.ports[0];  // Use first port
        service.pid = proc.pid;
        service.containerId = "";  // Not in container
        service.status = "running";
        service.cmdline = proc.cmdline;
        
        services.push_back(service);
    }

    // Detect services in Docker containers
    for (const auto& container : containers) {
        if (container.state != "running") {
            // Logger::getInstance().debug("Skipping container {} (State: {})", container.name, container.state);
            continue;
        }

        // Detect service type from image or command
        std::string type = detectServiceType(container.image, container.command);
        
        // Logger::getInstance().debug("Checking container {}: Image={}, Type={}", container.name, container.image, type);
        
        if (type == "Unknown") {
            // Try to look deeper into image history or env vars if available (future)
            continue;
        }

        DetectedService service;
        service.name = container.name; // Use container name as service name
        service.type = type;
        service.containerId = container.id;
        service.status = "running";
        service.cmdline = container.command; // Use container command
        
        // Use first public port if available, otherwise private
        if (!container.ports.empty()) {
            if (container.ports[0].public_port > 0) {
                service.port = container.ports[0].public_port;
            } else {
                service.port = container.ports[0].private_port;
            }
        } else {
            service.port = 0;
        }

        services.push_back(service);
    }
    
    return services;
}

std::string detectServiceType(const std::string& processName, const std::string& cmdline) {
    std::string lowerName = processName;
    std::string lowerCmd = cmdline;
    
    std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), ::tolower);
    std::transform(lowerCmd.begin(), lowerCmd.end(), lowerCmd.begin(), ::tolower);
    
    if (lowerName.find("node") != std::string::npos || lowerCmd.find("node") != std::string::npos) {
        return "Node.js";
    }
    if (lowerName.find("python") != std::string::npos || lowerCmd.find("python") != std::string::npos) {
        return "Python";
    }
    if (lowerName.find("java") != std::string::npos || lowerCmd.find("java") != std::string::npos) {
        return "Java";
    }
    if (lowerName.find("nginx") != std::string::npos) {
        return "Nginx";
    }
    if (lowerName.find("apache") != std::string::npos || lowerName.find("httpd") != std::string::npos) {
        return "Apache";
    }
    if (lowerName.find("postgres") != std::string::npos) {
        return "PostgreSQL";
    }
    if (lowerName.find("mysql") != std::string::npos || lowerName.find("mysqld") != std::string::npos) {
        return "MySQL";
    }
    if (lowerName.find("redis") != std::string::npos) {
        return "Redis";
    }
    if (lowerName.find("mongo") != std::string::npos) {
        return "MongoDB";
    }
    
    // Return process name as type (not "Unknown")
    // This ensures Chrome, Antigravity, etc. are detected
    return processName;
}

std::string extractServiceName(const std::string& cmdline) {
    // Try to extract meaningful service name from command line
    // Example: "node /app/server.js" -> "server"
    // Example: "python /home/user/api.py" -> "api"
    
    size_t lastSlash = cmdline.find_last_of("/\\");
    if (lastSlash != std::string::npos) {
        std::string filename = cmdline.substr(lastSlash + 1);
        
        // Remove extension
        size_t dot = filename.find_last_of('.');
        if (dot != std::string::npos) {
            return filename.substr(0, dot);
        }
        
        // Remove arguments
        size_t space = filename.find(' ');
        if (space != std::string::npos) {
            return filename.substr(0, space);
        }
        
        return filename;
    }
    
    // If no path, use first word
    size_t space = cmdline.find(' ');
    if (space != std::string::npos) {
        return cmdline.substr(0, space);
    }
    
    return cmdline;
}

} // namespace detectors
} // namespace nexus
