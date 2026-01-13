#pragma once

#include <string>
#include <chrono>
#include <sstream>

namespace nexus {
namespace utils {

inline std::string formatRelativeTime(int64_t timestamp) {
    auto now = std::chrono::system_clock::now();
    auto ts_time = std::chrono::system_clock::from_time_t(timestamp);
    auto duration = std::chrono::duration_cast<std::chrono::seconds>(now - ts_time).count();

    if (duration < 60) {
        return std::to_string(duration) + " seconds ago";
    } else if (duration < 3600) {
        return std::to_string(duration / 60) + " minutes ago";
    } else if (duration < 86400) {
        return std::to_string(duration / 3600) + " hours ago";
    } else if (duration < 604800) {
        return std::to_string(duration / 86400) + " days ago";
    } else if (duration < 2592000) {
        return std::to_string(duration / 604800) + " weeks ago";
    } else {
        return std::to_string(duration / 2592000) + " months ago";
    }
}

} // namespace utils
} // namespace nexus
