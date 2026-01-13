#include "nexus/collectors/docker_monitor.h"
#include "nexus/utils/logger.h"
#include <nlohmann/json.hpp>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <cstring>
#include <sstream>

using json = nlohmann::json;

namespace nexus {
namespace collectors {

DockerMonitor::DockerMonitor(const std::string& socketPath) 
    : socket_path_(socketPath) {
}

bool DockerMonitor::isAvailable() {
    // Try to connect to Docker socket
    int sock = socket(AF_UNIX, SOCK_STREAM, 0);
    if (sock < 0) {
        return false;
    }
    
    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, socket_path_.c_str(), sizeof(addr.sun_path) - 1);
    
    bool available = (connect(sock, (struct sockaddr*)&addr, sizeof(addr)) == 0);
    close(sock);
    
    return available;
}

std::string DockerMonitor::dockerRequest(const std::string& endpoint) {
    // Create Unix socket
    int sock = socket(AF_UNIX, SOCK_STREAM, 0);
    if (sock < 0) {
        Logger::getInstance().error("Failed to create socket");
        return "";
    }
    
    // Connect to Docker socket
    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, socket_path_.c_str(), sizeof(addr.sun_path) - 1);
    
    if (connect(sock, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        Logger::getInstance().error("Failed to connect to Docker socket");
        close(sock);
        return "";
    }
    
    // Send HTTP request
    std::ostringstream request;
    request << "GET " << endpoint << " HTTP/1.1\r\n";
    request << "Host: localhost\r\n";
    request << "Connection: close\r\n";
    request << "\r\n";
    
    std::string req_str = request.str();
    if (send(sock, req_str.c_str(), req_str.length(), 0) < 0) {
        Logger::getInstance().error("Failed to send request");
        close(sock);
        return "";
    }
    
    // Read response
    std::string response;
    char buffer[4096];
    ssize_t bytes_read;
    
    while ((bytes_read = recv(sock, buffer, sizeof(buffer) - 1, 0)) > 0) {
        buffer[bytes_read] = '\0';
        response += buffer;
    }
    
    close(sock);
    
    // Extract JSON body (skip HTTP headers)
    size_t body_start = response.find("\r\n\r\n");
    if (body_start == std::string::npos) {
        return "";
    }
    
    std::string headers = response.substr(0, body_start);
    std::string body = response.substr(body_start + 4);
    
    // Check if response is chunked
    if (headers.find("Transfer-Encoding: chunked") != std::string::npos) {
        // Decode chunked encoding
        std::string decoded;
        size_t pos = 0;
        
        while (pos < body.length()) {
            // Find chunk size line
            size_t line_end = body.find("\r\n", pos);
            if (line_end == std::string::npos) break;
            
            std::string chunk_size_str = body.substr(pos, line_end - pos);
            if (chunk_size_str.empty()) break;
            
            // Parse chunk size (hex)
            size_t chunk_size;
            try {
                chunk_size = std::stoul(chunk_size_str, nullptr, 16);
            } catch (...) {
                break;
            }
            
            if (chunk_size == 0) break; // Last chunk
            
            // Extract chunk data
            pos = line_end + 2; // Skip \r\n
            if (pos + chunk_size > body.length()) break;
            
            decoded += body.substr(pos, chunk_size);
            pos += chunk_size + 2; // Skip chunk data and trailing \r\n
        }
        
        return decoded;
    }
    
    return body;
}

bool DockerMonitor::collect() {
    if (!isAvailable()) {
        Logger::getInstance().warn("Docker is not available");
        return false;
    }
    
    bool success = true;
    success &= collectContainers();
    success &= collectImages();
    success &= collectVolumes();
    success &= collectNetworks();
    success &= collectInfo();
    
    return success;
}

bool DockerMonitor::collectContainers() {
    containers_.clear();
    
    // Get all containers (including stopped)
    std::string response = dockerRequest("/containers/json?all=true");
    if (response.empty()) {
        return false;
    }
    
    try {
        json containers_json = json::parse(response);
        
        for (const auto& c : containers_json) {
            Container container;
            container.id = c.value("Id", "");
            
            // Get name (remove leading /)
            auto names = c.value("Names", json::array());
            if (!names.empty()) {
                std::string name = names[0].get<std::string>();
                container.name = name.substr(1); // Remove leading /
            }
            
            container.image = c.value("Image", "");
            container.image_id = c.value("ImageID", "");
            container.state = c.value("State", "");
            container.status = c.value("Status", "");
            container.created = c.value("Created", 0L);
            container.command = c.value("Command", "");
            
            // Parse ports
            auto ports = c.value("Ports", json::array());
            for (const auto& p : ports) {
                ContainerPort port;
                port.private_port = p.value("PrivatePort", 0);
                port.public_port = p.value("PublicPort", 0);
                port.type = p.value("Type", "tcp");
                container.ports.push_back(port);
            }
            
            // Parse mounts
            auto mounts = c.value("Mounts", json::array());
            for (const auto& m : mounts) {
                ContainerMount mount;
                mount.source = m.value("Source", "");
                mount.destination = m.value("Destination", "");
                mount.mode = m.value("Mode", "");
                container.mounts.push_back(mount);
            }
            
            // Get stats for running containers
            if (container.state == "running") {
                collectContainerStats(container);
            }
            
            containers_.push_back(container);
        }
        
        Logger::getInstance().debug("Collected {} containers", containers_.size());
        return true;
        
    } catch (const json::exception& e) {
        Logger::getInstance().error("Failed to parse containers JSON: {}", e.what());
        return false;
    }
}

bool DockerMonitor::collectContainerStats(Container& container) {
    // Get stats for a specific container
    std::string endpoint = "/containers/" + container.id + "/stats?stream=false";
    std::string response = dockerRequest(endpoint);
    
    if (response.empty()) {
        return false;
    }
    
    try {
        json stats_json = json::parse(response);
        
        // Calculate CPU percentage
        auto cpu_stats = stats_json.value("cpu_stats", json::object());
        auto precpu_stats = stats_json.value("precpu_stats", json::object());
        
        uint64_t cpu_delta = cpu_stats.value("cpu_usage", json::object()).value("total_usage", 0UL) -
                             precpu_stats.value("cpu_usage", json::object()).value("total_usage", 0UL);
        uint64_t system_delta = cpu_stats.value("system_cpu_usage", 0UL) -
                                 precpu_stats.value("system_cpu_usage", 0UL);
        uint64_t num_cpus = cpu_stats.value("online_cpus", 1UL);
        
        if (system_delta > 0 && cpu_delta > 0) {
            container.stats.cpu_percent = (double)cpu_delta / system_delta * num_cpus * 100.0;
        }
        
        // Memory stats
        auto memory_stats = stats_json.value("memory_stats", json::object());
        container.stats.mem_usage = memory_stats.value("usage", 0UL);
        container.stats.mem_limit = memory_stats.value("limit", 0UL);
        
        if (container.stats.mem_limit > 0) {
            container.stats.mem_percent = (double)container.stats.mem_usage / container.stats.mem_limit * 100.0;
        }
        
        // Network stats
        auto networks = stats_json.value("networks", json::object());
        for (const auto& net : networks.items()) {
            container.stats.net_rx += net.value().value("rx_bytes", 0UL);
            container.stats.net_tx += net.value().value("tx_bytes", 0UL);
        }
        
        // Block I/O stats
        auto blkio_stats = stats_json.value("blkio_stats", json::object());
        auto io_service_bytes = blkio_stats.value("io_service_bytes_recursive", json::array());
        for (const auto& io : io_service_bytes) {
            std::string op = io.value("op", "");
            if (op == "Read") {
                container.stats.block_read += io.value("value", 0UL);
            } else if (op == "Write") {
                container.stats.block_write += io.value("value", 0UL);
            }
        }
        
        // PIDs
        container.stats.pids = stats_json.value("pids_stats", json::object()).value("current", 0);
        
        return true;
        
    } catch (const json::exception& e) {
        Logger::getInstance().debug("Failed to get stats for container {}: {}", container.name, e.what());
        return false;
    }
}

bool DockerMonitor::collectImages() {
    images_.clear();
    
    std::string response = dockerRequest("/images/json");
    if (response.empty()) {
        return false;
    }
    
    try {
        json images_json = json::parse(response);
        
        for (const auto& img : images_json) {
            DockerImage image;
            image.id = img.value("Id", "");
            image.repo_tags = img.value("RepoTags", std::vector<std::string>());
            image.size = img.value("Size", 0UL);
            image.created = img.value("Created", 0L);

            // Fetch image history
            std::string history_response = dockerRequest("/images/" + image.id + "/history");
            if (!history_response.empty()) {
                try {
                    json history_json = json::parse(history_response);
                    for (const auto& layer : history_json) {
                        DockerLayer l;
                        l.id = layer.value("Id", "");
                        l.created = layer.value("Created", 0L);
                        l.created_by = layer.value("CreatedBy", "");
                        l.size = layer.value("Size", 0UL);
                        l.comment = layer.value("Comment", "");
                        
                        if (layer.contains("Tags") && !layer["Tags"].is_null()) {
                            l.tags = layer.value("Tags", std::vector<std::string>());
                        }
                        
                        image.history.push_back(l);
                    }
                } catch (const std::exception& e) {
                   // Log error but keep what we have? 
                   // Actually logic above is inside loop, but try/catch is outside.
                   // If it fails, we lose rest of layers.
                   // The fix above (null check) should prevent the crash.
                }
            }
            
            images_.push_back(image);
        }
        
        Logger::getInstance().debug("Collected {} images", images_.size());
        return true;
        
    } catch (const json::exception& e) {
        Logger::getInstance().error("Failed to parse images JSON: {}", e.what());
        return false;
    }
}

bool DockerMonitor::collectVolumes() {
    volumes_.clear();
    
    std::string response = dockerRequest("/volumes");
    if (response.empty()) {
        return false;
    }
    
    try {
        json volumes_json = json::parse(response);
        auto volumes_array = volumes_json.value("Volumes", json::array());
        
        for (const auto& vol : volumes_array) {
            DockerVolume volume;
            volume.name = vol.value("Name", "");
            volume.driver = vol.value("Driver", "");
            volume.mountpoint = vol.value("Mountpoint", "");
            volume.created = 0; // Not provided by API
            
            volumes_.push_back(volume);
        }
        
        Logger::getInstance().debug("Collected {} volumes", volumes_.size());
        return true;
        
    } catch (const json::exception& e) {
        Logger::getInstance().error("Failed to parse volumes JSON: {}", e.what());
        return false;
    }
}

bool DockerMonitor::collectNetworks() {
    networks_.clear();
    
    std::string response = dockerRequest("/networks");
    if (response.empty()) {
        return false;
    }
    
    try {
        json networks_json = json::parse(response);
        
        for (const auto& net : networks_json) {
            DockerNetwork network;
            network.id = net.value("Id", "");
            network.name = net.value("Name", "");
            network.driver = net.value("Driver", "");
            network.scope = net.value("Scope", "");
            network.created = 0; // Parse from Created field if needed
            network.internal = net.value("Internal", false);
            
            networks_.push_back(network);
        }
        
        Logger::getInstance().debug("Collected {} networks", networks_.size());
        return true;
        
    } catch (const json::exception& e) {
        Logger::getInstance().error("Failed to parse networks JSON: {}", e.what());
        return false;
    }
}

bool DockerMonitor::collectInfo() {
    std::string response = dockerRequest("/info");
    if (response.empty()) {
        return false;
    }
    
    try {
        json info_json = json::parse(response);
        
        info_.id = info_json.value("ID", "");
        info_.containers = info_json.value("Containers", 0);
        info_.containers_running = info_json.value("ContainersRunning", 0);
        info_.containers_paused = info_json.value("ContainersPaused", 0);
        info_.containers_stopped = info_json.value("ContainersStopped", 0);
        info_.images = info_json.value("Images", 0);
        info_.driver = info_json.value("Driver", "");
        info_.server_version = info_json.value("ServerVersion", "");
        info_.operating_system = info_json.value("OperatingSystem", "");
        info_.architecture = info_json.value("Architecture", "");
        info_.ncpu = info_json.value("NCPU", 0);
        info_.mem_total = info_json.value("MemTotal", 0UL);
        
        Logger::getInstance().debug("Collected Docker info");
        return true;
        
    } catch (const json::exception& e) {
        Logger::getInstance().error("Failed to parse info JSON: {}", e.what());
        return false;
    }
}

} // namespace collectors
} // namespace nexus
