#include "nexus/utils/config.h"
#include <fstream>
#include <sstream>
#include <algorithm>

namespace nexus {

Config& Config::getInstance() {
    static Config instance;
    return instance;
}

std::string Config::trim(const std::string& str) const {
    size_t first = str.find_first_not_of(" \t\r\n");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\r\n");
    return str.substr(first, last - first + 1);
}

bool Config::load(const std::string& configFile) {
    std::ifstream file(configFile);
    if (!file.is_open()) {
        return false;
    }
    
    std::string line;
    std::string currentSection;
    
    while (std::getline(file, line)) {
        line = trim(line);
        
        // Skip empty lines and comments
        if (line.empty() || line[0] == '#' || line[0] == ';') {
            continue;
        }
        
        // Section header
        if (line[0] == '[' && line[line.length() - 1] == ']') {
            currentSection = line.substr(1, line.length() - 2);
            continue;
        }
        
        // Key-value pair
        size_t pos = line.find('=');
        if (pos != std::string::npos) {
            std::string key = trim(line.substr(0, pos));
            std::string value = trim(line.substr(pos + 1));
            data_[currentSection][key] = value;
        }
    }
    
    return true;
}

std::string Config::get(const std::string& section, const std::string& key, const std::string& defaultValue) const {
    auto sectionIt = data_.find(section);
    if (sectionIt == data_.end()) {
        return defaultValue;
    }
    
    auto keyIt = sectionIt->second.find(key);
    if (keyIt == sectionIt->second.end()) {
        return defaultValue;
    }
    
    return keyIt->second;
}

int Config::getInt(const std::string& section, const std::string& key, int defaultValue) const {
    std::string value = get(section, key);
    if (value.empty()) {
        return defaultValue;
    }
    
    try {
        return std::stoi(value);
    } catch (...) {
        return defaultValue;
    }
}

bool Config::getBool(const std::string& section, const std::string& key, bool defaultValue) const {
    std::string value = get(section, key);
    if (value.empty()) {
        return defaultValue;
    }
    
    std::transform(value.begin(), value.end(), value.begin(), ::tolower);
    return value == "true" || value == "yes" || value == "1";
}

} // namespace nexus
