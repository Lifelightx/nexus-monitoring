#include "nexus/collectors/security_collector.h"
#include "nexus/utils/logger.h"
#include <fstream>
#include <regex>
#include <utmpx.h>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <deque>
#include <cstdio>
#include <memory>
#include <array>
#include <algorithm>

namespace nexus {
namespace collectors {

SecurityCollector::SecurityCollector() : authLogPath_("/var/log/auth.log") {}

std::string SecurityCollector::formatTime(long timestamp) {
    std::time_t t = static_cast<std::time_t>(timestamp);
    std::tm* tm = std::localtime(&t);
    std::stringstream ss;
    ss << std::put_time(tm, "%Y-%m-%d %H:%M:%S");
    return ss.str();
}

std::vector<UserSession> SecurityCollector::getActiveUsers() {
    std::vector<UserSession> sessions;
    
    setutxent(); // Rewind to start
    struct utmpx* ent;
    
    while ((ent = getutxent()) != nullptr) {
        if (ent->ut_type == USER_PROCESS) {
            UserSession session;
            session.user = ent->ut_user;
            session.terminal = ent->ut_line;
            session.host = ent->ut_host;
            session.loginTime = formatTime(ent->ut_tv.tv_sec);
            sessions.push_back(session);
        }
    }
    
    endutxent();
    return sessions;
}

// Helper to execute shell command and get output
std::string SecurityCollector::execCommand(const char* cmd) {
    std::array<char, 128> buffer;
    std::string result;
    std::unique_ptr<FILE, decltype(&pclose)> pipe(popen(cmd, "r"), pclose);
    if (!pipe) {
        Logger::getInstance().error("SecurityCollector: popen() failed for cmd: {}", cmd);
        return "";
    }
    while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr) {
        result += buffer.data();
    }
    return result;
}

std::vector<FailedLogin> SecurityCollector::getFailedLogins() {
    std::vector<FailedLogin> failedLogins;
    
    // Debug Identity
    std::string identity = execCommand("whoami");
    if (!identity.empty()) {
        if (identity.back() == '\n') identity.pop_back();
        // Log sparingly? No, this is critical debugging
        static bool loggedId = false;
        if (!loggedId) {
             Logger::getInstance().info("SecurityCollector: Running as user: '{}'", identity);
             // Also check groups/process capabilities
             std::string idOut = execCommand("id");
             if (!idOut.empty() && idOut.back() == '\n') idOut.pop_back();
             Logger::getInstance().info("SecurityCollector: ID info: '{}'", idOut);
             loggedId = true;
        }
    }

    // Execute lastb command (same as Node.js agent)
    // lastb -n 5 -a | head -n 5
    // Output format: user tty host date time ... (varies slightly by distro)
    // Capture stderr to see permission errors
    std::string cmd = "lastb -n 5 -a 2>&1 | head -n 5";
    std::string output = execCommand(cmd.c_str());
    
    if (output.empty() || output.find("Permission denied") != std::string::npos) {
        Logger::getInstance().warn("SecurityCollector: lastb failed, attempting sudo...");
        std::string sudoCmd = "sudo -n lastb -n 5 -a 2>&1 | head -n 5";
        output = execCommand(sudoCmd.c_str());
    }
    
    if (output.empty()) return failedLogins;

    std::stringstream ss(output);
    std::string line;
    
    while (std::getline(ss, line)) {
        // Skip empty lines or header/footer if any (btmp begins...)
        if (line.empty() || line.find("btmp begins") != std::string::npos) continue;
        
        // Simple tokenization
        std::istringstream iss(line);
        std::vector<std::string> parts;
        std::string part;
        while (iss >> part) {
            parts.push_back(part);
        }
        
        // Expect at least user, tty, ip/host...
        if (parts.size() >= 3) {
             FailedLogin login;
             login.user = parts[0];
             // With -a, host is typically the last element
             login.ip = parts.back(); 
             login.reason = "Failed Login";
             
             // Time is roughly everything else. 
             // Node.js parses it specifically, but simply storing the full string as fallback is safer if formats vary.
             // We'll store the raw line as the "time" if we can't extract cleanly, 
             // but UI expects a short string.
             // Let's try to grab parts[3]..parts[end-1]
             if (parts.size() > 3) {
                 std::ostringstream timeOss;
                 for (size_t i = 3; i < parts.size() - 1; ++i) {
                     timeOss << parts[i] << " ";
                 }
                 login.time = timeOss.str();
                 // Trim trailing space
                 if (!login.time.empty()) login.time.pop_back();
             } else {
                 login.time = "Unknown";
             }
             
             failedLogins.push_back(login);
        }
    }
    
    return failedLogins;
}

std::vector<SudoEvent> SecurityCollector::getSudoUsage() {
    std::vector<SudoEvent> events;
    
    // Execute grep command (same as Node.js agent)
    // grep "sudo" /var/log/auth.log | tail -n 5
    // Redirect stderr to stdout to catch "Permission denied"
    std::string cmd = "grep \"sudo\" /var/log/auth.log 2>&1 | tail -n 5";
    std::string output = execCommand(cmd.c_str());
    
    // Check for permission denied
    if (output.empty() || output.find("Permission denied") != std::string::npos) {
        // Try with sudo -n (non-interactive)
        Logger::getInstance().warn("SecurityCollector: standard access failed, attempting sudo...");
        std::string sudoCmd = "sudo -n grep \"sudo\" /var/log/auth.log 2>&1 | tail -n 5";
        output = execCommand(sudoCmd.c_str());
    }
    
    if (output.empty() || output.find("Permission denied") != std::string::npos) {
         return events;
    }

    std::stringstream ss(output);
    std::string line;
    
    // Regex for basic parsing
    std::regex sudoRe("sudo:.*COMMAND=(.*)");
    
    while (std::getline(ss, line)) {
        if (line.empty()) continue;
        
        SudoEvent event;
        event.raw = line;
        event.success = true;
        event.user = "System"; // Default/Unknown
        
        // Try to parse command
        std::smatch match;
        if (std::regex_search(line, match, sudoRe)) {
            event.command = match[1].str();
        } else {
             event.command = "Unknown/Unparsed";
        }
        
        // Try to parse timestamp (Start of line)
        // Format: Jan 12 00:00:01 host ...
        if (line.size() > 15) {
            event.time = line.substr(0, 15);
        } else {
            event.time = "Unknown";
        }

        events.push_back(event);
    }
    
    return events;
}

} // namespace collectors
} // namespace nexus
