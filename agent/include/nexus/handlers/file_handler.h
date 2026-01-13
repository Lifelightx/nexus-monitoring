#pragma once

#include <string>
#include <vector>
#include <nlohmann/json.hpp>

namespace nexus {
namespace handlers {

class FileHandler {
public:
    FileHandler() = default;

    // Handle file:list command
    nlohmann::json handleList(const std::string& path);

    // Handle file:read command (future use)
    // nlohmann::json handleRead(const std::string& path);
};

} // namespace handlers
} // namespace nexus
