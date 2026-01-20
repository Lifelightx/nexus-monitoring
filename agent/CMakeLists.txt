cmake_minimum_required(VERSION 3.22)
project(nexus-agent VERSION 1.0.0 LANGUAGES CXX)

# C++17 standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler flags
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -Wpedantic")
set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -g -O0")
set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -O3 -DNDEBUG")

# Find required packages
find_package(PkgConfig REQUIRED)
pkg_check_modules(CURL REQUIRED libcurl)
pkg_check_modules(OPENSSL REQUIRED openssl)
pkg_check_modules(JSON REQUIRED nlohmann_json)
pkg_check_modules(SPDLOG REQUIRED spdlog)

# Find Boost
find_package(Boost REQUIRED COMPONENTS system thread)

# Include directories
include_directories(
    ${CMAKE_SOURCE_DIR}/include
    ${CURL_INCLUDE_DIRS}
    ${OPENSSL_INCLUDE_DIRS}
    ${JSON_INCLUDE_DIRS}
    ${SPDLOG_INCLUDE_DIRS}
    ${Boost_INCLUDE_DIRS}
)

# Source files
set(SOURCES
    src/main.cpp
    src/orchestrator/instrumentation_manager.cpp
    src/orchestrator/injector.cpp
    src/utils/logger.cpp
    src/utils/config.cpp
    src/utils/otlp_converter.cpp
    src/communication/http_client.cpp
    src/communication/http_agent_client.cpp
    src/collectors/system_metrics.cpp
    src/collectors/docker_monitor.cpp
    src/collectors/process_scanner.cpp
    src/collectors/port_scanner.cpp
    src/collectors/security_collector.cpp
    src/collectors/log_collector.cpp
    src/detectors/service_detector.cpp
    src/handlers/docker_handler.cpp
    src/handlers/command_handler.cpp
    src/handlers/file_handler.cpp
    src/communication/websocket_client.cpp
)

# Create executable
add_executable(nexus-agent ${SOURCES})

# Link libraries
target_link_libraries(nexus-agent
    ${CURL_LIBRARIES}
    ${OPENSSL_LIBRARIES}
    ${JSON_LIBRARIES}
    ${SPDLOG_LIBRARIES}
    ${Boost_LIBRARIES}
    pthread
)

# Installation
install(TARGETS nexus-agent DESTINATION /opt/nexus-agent/bin)
install(FILES config/agent.conf DESTINATION /etc/nexus-agent)
install(DIRECTORY DESTINATION /var/log/nexus-agent)

# Tests (disabled for now)
# enable_testing()
# add_subdirectory(tests)
