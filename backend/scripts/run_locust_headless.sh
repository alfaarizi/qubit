#!/bin/bash
# run all locust tests headless with default parameters
# usage: run_locust_headless.sh [test_name] [users] [spawn_rate] [run_time]
# test_name: load, stress, auth, projects, circuits, all (default: all)
# users: number of concurrent users (default: varies by test)
# spawn_rate: users per second (default: varies by test)
# run_time: test duration (default: varies by test)
cd "$(dirname "$0")/../tests/performance" || exit

run_test() {
    local test_file=$1
    local test_name=$2
    local users=${3:-50}
    local spawn_rate=${4:-5}
    local run_time=${5:-2m}
    
    echo "=========================================="
    echo "Running Locust $test_name Test..."
    echo "Users: $users, Spawn Rate: $spawn_rate/s, Duration: $run_time"
    echo "=========================================="
    locust -f "$test_file" --headless --users "$users" --spawn-rate "$spawn_rate" --run-time "$run_time"
    echo ""
}

if [ -n "$1" ] && [[ ! "$1" =~ ^[0-9] ]]; then
    case "$1" in
        load)
            run_test "locust_load_test.py" "Load" "${2:-50}" "${3:-5}" "${4:-2m}"
            ;;
        stress)
            run_test "locust_stress_test.py" "Stress" "${2:-200}" "${3:-10}" "${4:-5m}"
            ;;
        auth)
            run_test "locust_auth_test.py" "Auth" "${2:-30}" "${3:-3}" "${4:-2m}"
            ;;
        projects)
            run_test "locust_projects_test.py" "Projects" "${2:-40}" "${3:-4}" "${4:-2m}"
            ;;
        circuits)
            run_test "locust_circuits_test.py" "Circuits" "${2:-20}" "${3:-2}" "${4:-3m}"
            ;;
        all|comprehensive)
            run_test "locust_tests.py" "Comprehensive" "${2:-100}" "${3:-10}" "${4:-3m}"
            ;;
        *)
            echo "Unknown test: $1"
            echo "Available tests: load, stress, auth, projects, circuits, all"
            echo "Usage: ./scripts/run_locust_headless.sh [test_name] [users] [spawn_rate] [run_time]"
            exit 1
            ;;
    esac
else
    echo "Running all Locust tests headless..."
    echo ""
    run_test "locust_load_test.py" "Load" "${1:-50}" "${2:-5}" "${3:-2m}"
    run_test "locust_stress_test.py" "Stress" "${1:-200}" "${2:-10}" "${3:-5m}"
    run_test "locust_auth_test.py" "Auth" "${1:-30}" "${2:-3}" "${3:-2m}"
    run_test "locust_projects_test.py" "Projects" "${1:-40}" "${2:-4}" "${3:-2m}"
    run_test "locust_circuits_test.py" "Circuits" "${1:-20}" "${2:-2}" "${3:-3m}"
    
    echo "=========================================="
    echo "All Locust tests completed!"
    echo "=========================================="
fi

