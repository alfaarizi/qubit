# QubitKit Backend

FastAPI backend for quantum partition visualization and processing.

## Installation

```bash
pip install -e .
pip install -e ".[test]"  # For testing
```

## Usage

```bash
serve
# Or
python -m app.main
```

## Testing

### Run Unit Tests

```bash
pytest tests/unit/ -v
```

### Run Integration Tests

```bash
pytest tests/integration/ -v
```

### Run All Tests (Requires MongoDB)

```bash
pytest tests/ -v
```

### Run with Coverage

```bash
coverage run -m pytest tests/ -v
coverage report # Terminal report
coverage html # Generate htmlcov/index.html
```

### Run Performance Tests

Performance tests are located in `tests/performance/` and use Locust for load and stress testing.

**Performance Tests (Locust):**

```bash
# install locust (included in test dependencies)
pip install -e ".[test]"

# run with web UI (default: comprehensive test with all user classes)
./scripts/run_locust.sh
# or specify test: ./scripts/run_locust.sh [load|stress|auth|projects|circuits|all]
# "all" runs all user classes in one UI with combined statistics

# run all tests headless (comprehensive test suite)
./scripts/run_locust_headless.sh

# manual run (from tests/performance directory)
cd tests/performance
locust -f locust_load_test.py
locust -f locust_auth_test.py --headless --users 30 --spawn-rate 3 --run-time 2m
locust -f locust_projects_test.py --headless --users 40 --spawn-rate 4 --run-time 2m
locust -f locust_circuits_test.py --headless --users 20 --spawn-rate 2 --run-time 3m
locust -f locust_stress_test.py --headless --users 200 --spawn-rate 10 --run-time 5m
```

**Performance Test Types:**
- **locust_tests.py** - Comprehensive test with all user classes combined (recommended for overall system testing)
- **locust_load_test.py** - General API load testing (health, auth, projects)
- **locust_stress_test.py** - High-load stress testing to find breaking points
- **locust_auth_test.py** - Authentication endpoints only
- **locust_projects_test.py** - Project CRUD operations only
- **locust_circuits_test.py** - Circuit operations only

**When to use which:**
- **Comprehensive test**: Overall system performance, production-like scenarios, combined statistics
- **Individual tests**: Focused testing, debugging specific areas, development workflow

**Note:** Fuzz tests (input validation and security testing) are located in `tests/integration/test_fuzz.py` and can be run with:
```bash
pytest tests/integration/test_fuzz.py -v -m integration
```

**Target Metrics:**
- Response Time (p95): < 500ms
- Response Time (p99): < 1s
- Error Rate: < 1% under normal load
- Concurrent Users: Support at least 50 concurrent users

