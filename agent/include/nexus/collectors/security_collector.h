#pragma once

#include <string>
#include <vector>
#include <nlohmann/json.hpp>

namespace nexus {
namespace collectors {

struct UserSession {
    std::string user;
    std::string terminal;
    std::string host;
    std::string loginTime;
};

struct FailedLogin {
    std::string user;
    std::string ip;
    std::string time;
    std::string reason;
};

struct SudoEvent {
    std::string user;
    std::string command;
    std::string time;
    bool success;
    std::string raw; // Added to match Node agent behavior
};

class SecurityCollector {
public:
    SecurityCollector();
    
    // Get active user sessions from utmp
    std::vector<UserSession> getActiveUsers();
    
    // Parse auth logs for failed logins
    std::vector<FailedLogin> getFailedLogins();
    
    // Parse auth logs for sudo usage
    std::vector<SudoEvent> getSudoUsage();

private:
    std::string authLogPath_;
    
    // Helper to format timestamp
    std::string formatTime(long timestamp);
    
    // Helper to execute shell command
    std::string execCommand(const char* cmd);
};

} // namespace collectors
} // namespace nexus
