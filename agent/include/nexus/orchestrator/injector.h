#pragma once

#include <string>
#include <vector>
#include <map>

namespace nexus {
namespace orchestrator {

class Injector {
public:
    Injector();
    ~Injector() = default;

    /**
     * Inject instrumentation into a Systemd service
     * @param serviceName Name of the service (e.g., "my-app.service")
     * @param injectorPath Full path to the agent entrypoint
     * @param envVars Additional environment variables to set
     * @return true if successful
     */
    bool injectSystemd(const std::string& serviceName, const std::string& injectorPath, const std::map<std::string, std::string>& envVars = {});

    /**
     * Inject instrumentation into a Docker container
     * @param containerId Docker container ID
     * @param injectorPath Full path to the agent entrypoint
     * @return true if successful (or advise logged)
     */
    bool injectDocker(const std::string& containerId, const std::string& injectorPath);

    /**
     * Get Systemd service name from PID
     * @param pid Process ID
     * @return Service name (e.g. "myapp.service") or empty if not found/not a service
     */
    std::string getSystemdServiceName(int pid);

private:
    /**
     * Execute a shell command and return the output
     */
    std::string exec(const char* cmd);
    
    /**
     * Restart a systemd service
     */
    bool restartService(const std::string& serviceName);
};

} // namespace orchestrator
} // namespace nexus
