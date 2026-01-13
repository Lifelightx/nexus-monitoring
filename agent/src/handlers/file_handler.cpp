#include "nexus/handlers/file_handler.h"
#include "nexus/utils/logger.h"
#include <filesystem>
#include <algorithm>

namespace fs = std::filesystem;

namespace nexus {
namespace handlers {

nlohmann::json FileHandler::handleList(const std::string& path) {
    nlohmann::json result;
    result["files"] = nlohmann::json::array();
    
    try {
        fs::path p(path);
        
        // Check if exists
        if (!fs::exists(p)) {
            result["error"] = "Path does not exist";
            return result;
        }
        
        // Check if directory
        if (!fs::is_directory(p)) {
            result["error"] = "Path is not a directory";
            return result;
        }
        
        for (const auto& entry : fs::directory_iterator(p)) {
            try {
                nlohmann::json file_entry;
                file_entry["name"] = entry.path().filename().string();
                file_entry["path"] = entry.path().string();
                file_entry["type"] = entry.is_directory() ? "folder" : "file";
                
                if (entry.is_regular_file()) {
                    file_entry["size"] = entry.file_size();
                } else {
                    file_entry["size"] = 0;
                }
                
                // Permission/Time info could be added here if needed, but cross-platform logic varies.
                // For now, minimal info is enough for FileExplorer.jsx
                
                result["files"].push_back(file_entry);
            } catch (const std::exception& e) {
                Logger::getInstance().warn("Error processing file entry: {}", e.what());
                // Continue to next entry
            }
        }
        
        return result;
        
    } catch (const fs::filesystem_error& e) {
        Logger::getInstance().error("Filesystem error: {}", e.what());
        result["error"] = std::string("Access denied or FS error: ") + e.what();
    } catch (const std::exception& e) {
        Logger::getInstance().error("Error listing files: {}", e.what());
        result["error"] = e.what();
    }
    
    return result;
}

} // namespace handlers
} // namespace nexus
