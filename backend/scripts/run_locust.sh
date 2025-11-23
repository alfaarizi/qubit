#!/bin/bash
# run locust tests with web UI
# usage: run_locust.sh [test_name] [locust_options...]
# test_name: load, stress, auth, projects, circuits, all (default: all)
# locust_options: any locust command-line options (e.g., --web-port 8090)
cd "$(dirname "$0")/../tests/performance" || exit

TEST_FILE="locust_tests.py"
if [ -n "$1" ] && [[ ! "$1" =~ ^-- ]]; then
    case "$1" in
        load)
            TEST_FILE="locust_load_test.py"
            shift
            ;;
        stress)
            TEST_FILE="locust_stress_test.py"
            shift
            ;;
        auth)
            TEST_FILE="locust_auth_test.py"
            shift
            ;;
        projects)
            TEST_FILE="locust_projects_test.py"
            shift
            ;;
        circuits)
            TEST_FILE="locust_circuits_test.py"
            shift
            ;;
        all|comprehensive)
            TEST_FILE="locust_tests.py"
            shift
            ;;
        *)
            echo "Unknown test: $1"
            echo "Available tests: load, stress, auth, projects, circuits, all"
            echo "Usage: ./scripts/run_locust.sh [test_name] [locust_options...]"
            exit 1
            ;;
    esac
fi

locust -f "$TEST_FILE" "$@"

