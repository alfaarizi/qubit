# QubitKit Backend

FastAPI backend for quantum circuit visualization and processing.

## Setup

```bash
pip install -e .
pip install -e ".[test]"  # Include test dependencies
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGODB_DATABASE` | Database name | `qubitkitdev` |
| `SECRET_KEY` | JWT signing key (generate with `openssl rand -hex 32`) | `your-secret-key` |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | `7` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `*.apps.googleusercontent.com` |
| `MICROSOFT_CLIENT_ID` | Azure AD client ID | `uuid` |
| `RESEND_API_KEY` | Resend email API key | `re_*` |
| `EMAIL_FROM` | Sender email address | `QubitKit <noreply@domain.com>` |
| `LOG_FILE_PATH` | Log file location (optional) | `logs/app.log` |

## Running

```bash
serve
# Or: python -m app.main
```

The API will be available at `http://localhost:8000`. API docs at `/docs` (Swagger) or `/redoc`.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Health check and system status |
| `/api/v1/auth/register` | POST | User registration |
| `/api/v1/auth/login` | POST | User login (returns JWT) |
| `/api/v1/auth/google` | POST | Google OAuth login |
| `/api/v1/auth/microsoft` | POST | Microsoft OAuth login |
| `/api/v1/auth/refresh` | POST | Refresh access token |
| `/api/v1/projects` | GET, POST | List/create projects |
| `/api/v1/projects/{id}` | GET, PUT, DELETE | Project CRUD |
| `/api/v1/circuits` | GET, POST | List/create circuits |
| `/api/v1/circuits/{id}` | GET, PUT, DELETE | Circuit CRUD |
| `/api/v1/circuits/{id}/partition` | POST | Run circuit partitioning |
| `/api/v1/ws/{user_id}` | WebSocket | Real-time job updates |

## Project Structure

```
app/
├── api/
│   └── v1/
│       └── endpoints/
│           ├── auth.py        # Authentication routes
│           ├── circuits.py    # Circuit CRUD & partitioning
│           ├── health.py      # Health check
│           ├── projects.py    # Project management
│           └── websocket.py   # Real-time updates
├── core/
│   ├── config.py              # Settings from environment
│   ├── security.py            # JWT & password hashing
│   └── dependencies.py        # FastAPI dependencies
├── db/
│   └── mongodb.py             # Database connection
├── models/                    # MongoDB document models
├── schemas/                   # Pydantic request/response schemas
└── services/
    ├── auth.py                # Authentication logic
    ├── circuit.py             # Circuit operations
    ├── project.py             # Project operations
    └── partition.py           # SQUANDER integration
```

## Testing

```bash
pytest tests/unit/ -v         # Unit tests
pytest tests/integration/ -v  # Integration tests (requires MongoDB)
pytest tests/ -v              # All tests
```

### Coverage

```bash
coverage run -m pytest tests/ -v
coverage report
coverage html    # Generate htmlcov/index.html
```

### Performance Tests (Locust)

```bash
./scripts/run_locust.sh           # Web UI at http://localhost:8089
./scripts/run_locust_headless.sh  # Headless mode
```

Available test files in `tests/performance/`:
- `locust_tests.py` - Comprehensive (all endpoints)
- `locust_load_test.py` - General load testing
- `locust_stress_test.py` - High-load stress testing
- `locust_auth_test.py` - Authentication only
- `locust_projects_test.py` - Project CRUD
- `locust_circuits_test.py` - Circuit operations
