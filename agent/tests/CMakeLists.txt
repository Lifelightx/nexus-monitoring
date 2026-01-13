# Placeholder for tests
add_executable(test_config test_config.cpp)
target_link_libraries(test_config nexus-agent)
add_test(NAME ConfigTest COMMAND test_config)
