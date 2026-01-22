
#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <regex>
#include <cstdio>
#include <array>
#include <sstream>

bool parseSsOutput(const std::string& line, int& pid, int& port) {
    if (line.find("State") != std::string::npos || line.find("LISTEN") == std::string::npos) {
        return false;
    }
    
    try {
        std::regex port_regex(R"([\*0-9\.]+:(\d+))");
        std::smatch port_match;
        if (std::regex_search(line, port_match, port_regex)) {
            port = std::stoi(port_match[1].str());
        } else {
            return false;
        }
        
        std::regex pid_regex(R"(pid=(\d+))");
        std::smatch pid_match;
        if (std::regex_search(line, pid_match, pid_regex)) {
            pid = std::stoi(pid_match[1].str());
        } else {
            return false;
        }
        
        return true;
    } catch (const std::exception& e) {
        return false;
    }
}

int main() {
    FILE* pipe = popen("ss -lptn 2>/dev/null", "r");
    if (!pipe) {
        std::cerr << "Failed to execute ss command" << std::endl;
        return 1;
    }
    
    std::array<char, 256> buffer;
    std::string result;
    
    while (fgets(buffer.data(), buffer.size(), pipe) != nullptr) {
        result += buffer.data();
    }
    
    pclose(pipe);
    
    std::cout << "Raw output length: " << result.length() << std::endl;
    // std::cout << "Raw output:\n" << result << std::endl;
    
    std::istringstream stream(result);
    std::string line;
    int count = 0;
    
    while (std::getline(stream, line)) {
        int pid, port;
        if (parseSsOutput(line, pid, port)) {
            std::cout << "Found: PID=" << pid << " Port=" << port << " Line: " << line << std::endl;
            count++;
        } else if (line.find("LISTEN") != std::string::npos) {
            std::cout << "Skipped: " << line << std::endl;
        }
    }
    
    std::cout << "Total found: " << count << std::endl;
    return 0;
}
