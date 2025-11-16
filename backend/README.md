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

