#pragma once

#include <string>
#include <map>

namespace nexus {

class Config {
public:
    static Config& getInstance();
    
    bool load(const std::string& configFile);
    
    std::string get(const std::string& section, const std::string& key, const std::string& defaultValue = "") const;
    int getInt(const std::string& section, const std::string& key, int defaultValue = 0) const;
    bool getBool(const std::string& section, const std::string& key, bool defaultValue = false) const;

private:
    Config() = default;
    std::map<std::string, std::map<std::string, std::string>> data_;
    
    std::string trim(const std::string& str) const;
};

} // namespace nexus
