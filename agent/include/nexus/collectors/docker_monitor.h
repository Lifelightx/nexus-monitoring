#pragma once

#include <string>
#include <vector>
#include <map>
#include <cstdint>

namespace nexus {
namespace collectors {

struct ContainerPort {
    int private_port;
    int public_port;
    std::string type; // tcp/udp
};

struct ContainerMount {
    std::string source;
    std::string destination;
    std::string mode;
};

struct ContainerStats {
    double cpu_percent = 0.0;
    uint64_t mem_usage = 0;
    uint64_t mem_limit = 0;
    double mem_percent = 0.0;
    uint64_t net_rx = 0;
    uint64_t net_tx = 0;
    uint64_t block_read = 0;
    uint64_t block_write = 0;
    int pids = 0;
};

struct Container {
    std::string id;
    std::string name;
    std::string image;
    std::string image_id;
    std::string state;      // running, exited, paused, etc.
    std::string status;     // Up 2 hours, Exited (0) 5 minutes ago
    int64_t created;
    int64_t started;
    int64_t finished;
    std::vector<ContainerPort> ports;
    std::vector<ContainerMount> mounts;
    int restart_count;
    std::string command;
    ContainerStats stats;   // Only for running containers
};

struct DockerLayer {
    std::string id;
    int64_t created;
    std::string created_by;
    uint64_t size;
    std::string comment;
    std::vector<std::string> tags;
};

struct DockerImage {
    std::string id;
    std::vector<std::string> repo_tags;
    uint64_t size;
    int64_t created;
    std::vector<DockerLayer> history; // Replaces previous 'layers'
};

struct DockerVolume {
    std::string name;
    std::string driver;
    std::string mountpoint;
    int64_t created;
};

struct DockerNetwork {
    std::string id;
    std::string name;
    std::string driver;
    std::string scope;
    int64_t created;
    bool internal;
};

struct DockerInfo {
    std::string id;
    int containers;
    int containers_running;
    int containers_paused;
    int containers_stopped;
    int images;
    std::string driver;
    std::string server_version;
    std::string operating_system;
    std::string architecture;
    int ncpu;
    uint64_t mem_total;
};

class DockerMonitor {
public:
    DockerMonitor(const std::string& socketPath = "/var/run/docker.sock");
    
    bool isAvailable();
    bool collect();
    
    const std::vector<Container>& getContainers() const { return containers_; }
    const std::vector<DockerImage>& getImages() const { return images_; }
    const std::vector<DockerVolume>& getVolumes() const { return volumes_; }
    const std::vector<DockerNetwork>& getNetworks() const { return networks_; }
    const DockerInfo& getInfo() const { return info_; }

private:
    bool collectContainers();
    bool collectContainerStats(Container& container);
    bool collectImages();
    bool collectVolumes();
    bool collectNetworks();
    bool collectInfo();
    
    std::string dockerRequest(const std::string& endpoint);
    
    std::string socket_path_;
    std::vector<Container> containers_;
    std::vector<DockerImage> images_;
    std::vector<DockerVolume> volumes_;
    std::vector<DockerNetwork> networks_;
    DockerInfo info_;
};

} // namespace collectors
} // namespace nexus
