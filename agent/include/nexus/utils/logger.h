#pragma once

#include <string>
#include <memory>
#include <spdlog/spdlog.h>

namespace nexus {

class Logger {
public:
    static Logger& getInstance();
    
    void init(const std::string& logFile, const std::string& level);
    
    template<typename... Args>
    void info(const char* fmt, Args&&... args) {
        logger_->info(fmt, std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    void warn(const char* fmt, Args&&... args) {
        logger_->warn(fmt, std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    void error(const char* fmt, Args&&... args) {
        logger_->error(fmt, std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    void debug(const char* fmt, Args&&... args) {
        logger_->debug(fmt, std::forward<Args>(args)...);
    }

private:
    Logger() = default;
    std::shared_ptr<spdlog::logger> logger_;
};

} // namespace nexus
