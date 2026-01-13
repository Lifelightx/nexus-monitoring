#pragma once

#include <vector>
#include <string>
#include "nexus/collectors/process_scanner.h" // Keep for ProcessInfo if needed, or remove if fully switched
#include "nexus/detectors/service_detector.h"
#include "nexus/orchestrator/injector.h"

namespace nexus {
namespace orchestrator {

struct InstrumentationStatus {
    int pid;
    std::string name;
    std::string containerId;
    std::string language;
    bool is_instrumented;
    std::string details;
};

class InstrumentationManager {
public:
    explicit InstrumentationManager(const std::string& nodejs_injector_path);
    
    // Scan services and return their status (and auto-inject if needed)
    std::vector<InstrumentationStatus> scan(const std::vector<detectors::DetectedService>& services);
    
    // Check if a service is already instrumented
    bool isInstrumented(const detectors::DetectedService& service);

private:
    std::string nodejs_injector_path_;
    Injector injector_;
    
    // Extract bundled instrumentation files to disk
    void extractInstrumentationFiles();
};

} // namespace orchestrator
} // namespace nexus
