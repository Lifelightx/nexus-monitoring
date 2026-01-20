#ifndef NEXUS_UTILS_OTLP_CONVERTER_H
#define NEXUS_UTILS_OTLP_CONVERTER_H

#include <nlohmann/json.hpp>
#include <string>
#include <chrono>
#include "nexus/collectors/system_metrics.h"
#include "nexus/collectors/docker_monitor.h"

namespace nexus {
namespace utils {

/**
 * OTLP Metrics Converter
 * Converts agent metrics to OpenTelemetry Protocol (OTLP) JSON format
 */
class OTLPConverter {
public:
    /**
     * Convert system metrics to OTLP metrics format
     */
    static nlohmann::json convertSystemMetrics(
        const std::string& serviceName,
        const collectors::SystemMetrics& sysMetrics
    );

    /**
     * Convert Docker metrics to OTLP metrics format
     */
    static nlohmann::json convertDockerMetrics(
        const std::string& serviceName,
        const collectors::DockerMonitor& dockerMonitor
    );

    /**
     * Create OTLP resource attributes
     */
    static nlohmann::json createResource(const std::string& serviceName);

    /**
     * Create OTLP metric data point
     */
    static nlohmann::json createGaugeDataPoint(
        double value,
        const std::map<std::string, std::string>& attributes = {}
    );

    /**
     * Get current timestamp in nanoseconds
     */
    static uint64_t getCurrentTimeNanos();
};

} // namespace utils
} // namespace nexus

#endif // NEXUS_UTILS_OTLP_CONVERTER_H
