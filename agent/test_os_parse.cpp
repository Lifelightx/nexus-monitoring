#include <iostream>
#include <fstream>
#include <string>

int main() {
    std::string os = "Linux";
    std::ifstream os_release("/etc/os-release");
    if (os_release.is_open()) {
        std::string line;
        while (std::getline(os_release, line)) {
            if (line.find("PRETTY_NAME=") == 0) {
                size_t first_quote = line.find('"');
                size_t last_quote = line.rfind('"');
                if (first_quote != std::string::npos && last_quote != std::string::npos && last_quote > first_quote) {
                    os = line.substr(first_quote + 1, last_quote - first_quote - 1);
                } else {
                    os = line.substr(12);
                }
                break;
            }
        }
    }
    std::cout << "Parsed OS: " << os << std::endl;
    return 0;
}
