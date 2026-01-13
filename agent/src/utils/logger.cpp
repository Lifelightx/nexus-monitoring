#include "nexus/utils/logger.h"
#include <spdlog/sinks/basic_file_sink.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <iostream>

namespace nexus {

Logger& Logger::getInstance() {
    static Logger instance;
    return instance;
}

void Logger::init(const std::string& logFile, const std::string& level) {
    try {
        // Create sinks
        auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
        auto file_sink = std::make_shared<spdlog::sinks::basic_file_sink_mt>(logFile, true);
        
        // Create logger with both sinks
        std::vector<spdlog::sink_ptr> sinks{console_sink, file_sink};
        logger_ = std::make_shared<spdlog::logger>("nexus-agent", sinks.begin(), sinks.end());
        
        // Set log level
        if (level == "debug") {
            logger_->set_level(spdlog::level::debug);
        } else if (level == "info") {
            logger_->set_level(spdlog::level::info);
        } else if (level == "warn") {
            logger_->set_level(spdlog::level::warn);
        } else if (level == "error") {
            logger_->set_level(spdlog::level::err);
        }
        
        // Set pattern
        logger_->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] %v");
        
        // Register as default logger
        spdlog::set_default_logger(logger_);
        
        logger_->info("Logger initialized: level={}, file={}", level, logFile);
    } catch (const spdlog::spdlog_ex& ex) {
        std::cerr << "Log initialization failed: " << ex.what() << std::endl;
    }
}

} // namespace nexus
