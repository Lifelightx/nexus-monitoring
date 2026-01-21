#include "nexus/orchestrator/instrumentation_manager.h"
#include "nexus/orchestrator/nodejs_resources.h"
#include "nexus/utils/logger.h"
#include <algorithm>
#include <fstream>
#include <filesystem>

namespace fs = std::filesystem;

namespace nexus {
namespace orchestrator {

InstrumentationManager::InstrumentationManager(const std::string& nodejs_injector_path)
    : nodejs_injector_path_(nodejs_injector_path) {
    extractInstrumentationFiles();
}

void InstrumentationManager::extractInstrumentationFiles() {
    try {
        Logger::getInstance().info("Checking instrumentation files in: {}", nodejs_injector_path_);
        
        fs::path base_path(nodejs_injector_path_);
        
        for (const auto& [rel_path, content] : nodejs_files) {
            fs::path full_path = base_path / rel_path;
            
            // Create directories if needed
            fs::create_directories(full_path.parent_path());
            
            if (!fs::exists(full_path)) {
                Logger::getInstance().debug("Extracting {}", rel_path);
                std::ofstream out(full_path, std::ios::binary);
                out.write(content.c_str(), content.size());
            }
        }
    } catch (const std::exception& e) {
        Logger::getInstance().error("Failed to extract instrumentation files: {}", e.what());
    }
}

std::vector<InstrumentationStatus> InstrumentationManager::scan(const std::vector<detectors::DetectedService>& services) {
    std::vector<InstrumentationStatus> statuses;
    
    for (const auto& svc : services) {
        // We are only interested in Node.js for now (as per assignment)
        // But the detector returns all types
        
        if (svc.type == "Node.js") {
            InstrumentationStatus status;
            status.pid = svc.pid;
            status.name = svc.name;
            status.containerId = svc.containerId;
            status.language = "nodejs";
            status.is_instrumented = isInstrumented(svc);
            
            if (status.is_instrumented) {
                status.details = "Auto-instrumentation loaded";
            } else {
                if (!svc.containerId.empty()) {
                    // Docker case
                    status.details = "Not instrumented (Docker container)";
                    // Attempt/Advise Docker injection
                    injector_.injectDocker(svc.containerId, nodejs_injector_path_ + "/index.js");
                } else {
                    // System process case
                    status.details = "Not instrumented";
                    
                    // Attempt Systemd injection
                    std::string serviceName = injector_.getSystemdServiceName(svc.pid);
                    if (!serviceName.empty()) {
                        Logger::getInstance().info("Found Systemd service for PID {}: {}", svc.pid, serviceName);
                        // Inject!
                        std::map<std::string, std::string> envVars;
                        envVars["SERVICE_NAME"] = svc.name;
                        
                        if (injector_.injectSystemd(serviceName, nodejs_injector_path_ + "/index.js", envVars)) {
                            status.details = "Injection pending (Service restarted)";
                            status.is_instrumented = true; // Optimistic
                        } else {
                            status.details = "Injection failed";
                        }
                    } else {
                        status.details = "Not a Systemd service (Manual injection required)";
                    }
                }
            }
            
            statuses.push_back(status);
            
            std::string context = svc.containerId.empty() ? "(System)" : "(Docker)";
            
            Logger::getInstance().info("Detected Node.js service {}: {} [PID: {}] - {}", 
                context, svc.name, svc.pid, status.details);
        }
    }
    
    return statuses;
}

bool InstrumentationManager::isInstrumented(const detectors::DetectedService& service) {
    if (service.cmdline.find(nodejs_injector_path_) != std::string::npos) {
        return true;
    }
    
    // For Docker, we might also look for env vars but we don't have them yet.
    // Assuming command line might contain it if passed as argument, 
    // or if the entrypoint shim is visible.
    
    return false;
}

} // namespace orchestrator
} // namespace nexus
