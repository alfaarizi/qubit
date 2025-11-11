# QUBIT THESIS OUTLINE - PART 4

**Continuation of comprehensive thesis outline for the Qubit project**

---

## **REQUIREMENT 6: Testing Documentation (5 points)**
*Minimum 10 pages recommended, 15-20 for thoroughness*

### **5. Testing and Quality Assurance**
*(15-20 pages total)*

---

### **5.1 Introduction to Testing Strategy**
*(1-2 pages)*

**Overview**:
- Testing philosophy: Ensure reliability, security, and performance for quantum circuit execution
- Multi-layered approach: UI validation, unit testing, integration testing, advanced scenarios
- Test coverage goals: Backend 70%+, Frontend critical paths 80%+
- CI/CD integration: GitHub Actions for automated test execution

**Testing Pyramid**:
```
       /\
      /UI\      <- Manual & E2E (10%)
     /____\
    /      \
   /Integration\ <- API & WebSocket (30%)
  /____________\
 /              \
/   Unit Tests   \ <- Backend & Frontend (60%)
/________________\
```

**Tools Used**:
- **Backend**: pytest, pytest-asyncio, httpx, pytest-mock, pytest-cov
- **Frontend**: Vitest, React Testing Library, MSW (Mock Service Worker)
- **Integration**: httpx for API testing, websockets library for WebSocket testing
- **Manual UI**: Browser DevTools, Accessibility Inspector

---

### **5.2 UI/Frontend Testing (Category 1)**
*(3-5 pages, 1.25 points)*

#### **5.2.1 Manual UI Testing Plan**

**Test Case 1: Circuit Composer Visual Rendering**
- **Objective**: Verify gates render correctly at all zoom levels
- **Preconditions**: User logged in, circuit project open
- **Steps**:
  1. Add H gate to qubit 0 at position 0
  2. Zoom to 150% and verify gate remains crisp
  3. Add CNOT gate connecting qubits 0-1
  4. Drag CNOT to position 2, verify connection line updates
  5. Group gates with symbol "Bell", verify group box appears
- **Expected Results**:
  - All gates render with correct colors (H: blue, CNOT: orange)
  - SVG lines connect gate nodes correctly
  - Group box displays symbol and encompasses all gates
- **Pass/Fail Criteria**: Visual inspection, no rendering artifacts
- **Screenshot**: Reference [wireframe-circuit-composer.png](docs/wireframe/wireframe-circuit-composer.png)

**Test Case 2: Authentication Flow - Google OAuth**
- **Objective**: Verify OAuth popup and redirect handling
- **Preconditions**: User logged out, Google account available
- **Steps**:
  1. Click "Sign in with Google"
  2. In OAuth popup, select account and authorize
  3. Observe redirect back to `/projects`
  4. Verify user avatar and name appear in header
- **Expected Results**:
  - OAuth popup opens centered (600x800px)
  - After authorization, JWT tokens stored in localStorage
  - Header displays user profile picture from Google
- **Pass/Fail Criteria**: Successful redirect, no console errors
- **Code Reference**: [GoogleAuthButton.tsx:45-67](src/features/auth/components/GoogleAuthButton.tsx#L45-L67)

**Test Case 3: WebSocket Status Indicator**
- **Objective**: Verify real-time connection status display
- **Preconditions**: Job submitted, WebSocket connection active
- **Steps**:
  1. Submit circuit for execution
  2. Observe "Connecting..." status (yellow icon)
  3. When connected, verify "Connected" (green icon)
  4. Disconnect network, observe "Disconnected" (red icon)
  5. Reconnect network, verify auto-reconnect
- **Expected Results**:
  - Status transitions match WebSocket connection state
  - Exponential backoff visible (delays: 1s, 2s, 4s...)
  - Messages appear in job console when connected
- **Pass/Fail Criteria**: Status indicator matches network state
- **Code Reference**: [WebSocketProvider.tsx:120-150](src/lib/websocket/WebSocketProvider.tsx#L120-L150)

**Test Case 4: Undo/Redo Keyboard Shortcuts**
- **Objective**: Verify Zundo temporal navigation works
- **Preconditions**: Circuit with 3+ gates placed
- **Steps**:
  1. Place H, X, Y gates sequentially
  2. Press Cmd+Z (Mac) or Ctrl+Z (Windows)
  3. Verify Y gate disappears
  4. Press Cmd+Z again, verify X gate disappears
  5. Press Cmd+Shift+Z, verify X gate reappears
  6. Verify undo/redo buttons in toolbar match state
- **Expected Results**:
  - Each undo removes last action
  - Redo restores undone action
  - Toolbar buttons enable/disable correctly
  - History limit respects 50-action cap
- **Pass/Fail Criteria**: Circuit state matches undo/redo history
- **Code Reference**: [CircuitStoreContext.tsx:80-95](src/features/circuit/store/CircuitStoreContext.tsx#L80-L95)

**Test Case 5: Results Visualization - 7 Chart Types**
- **Objective**: Verify all Plotly.js visualizations render with job results
- **Preconditions**: Job completed successfully, results available
- **Steps**:
  1. Open results panel, verify "Overview" tab shows state vector bar chart
  2. Switch to "Histogram" tab, verify measurement counts
  3. Switch to "Density Matrix" tab, verify heatmap
  4. Switch to "Entropy" tab, verify entropy values per partition
  5. Verify partition information table displays subsystem labels
- **Expected Results**:
  - All 7 chart types render without errors
  - Plotly.js interactive controls (zoom, pan) work
  - Data matches backend response structure
- **Pass/Fail Criteria**: All charts visible, no console errors
- **Code Reference**: [ResultsVisualization.tsx:200-350](src/features/results/components/ResultsVisualization.tsx#L200-L350)

**Test Case 6: Responsive Layout - Mobile View**
- **Objective**: Verify UI adapts to narrow screens
- **Preconditions**: Browser window resized to 375px width
- **Steps**:
  1. Open circuit composer, verify toolbar stacks vertically
  2. Open job list, verify cards stack in single column
  3. Verify hamburger menu appears for navigation
- **Expected Results**:
  - No horizontal scroll bars
  - All interactive elements remain accessible
  - Tailwind breakpoints (sm:, md:, lg:) apply correctly
- **Pass/Fail Criteria**: Usable interface on mobile devices

---

#### **5.2.2 Component Unit Tests (Vitest + RTL)**

**Test: Authentication Button Rendering**
```typescript
// src/features/auth/components/__tests__/GoogleAuthButton.test.tsx
import { render, screen } from '@testing-library/react';
import { GoogleAuthButton } from '../GoogleAuthButton';

describe('GoogleAuthButton', () => {
  it('renders Google logo and text', () => {
    render(<GoogleAuthButton />);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /google/i })).toBeInTheDocument();
  });

  it('opens OAuth popup on click', async () => {
    const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<GoogleAuthButton />);

    await userEvent.click(screen.getByRole('button'));

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/google'),
      'oauth',
      'width=600,height=800'
    );
  });
});
```
**Reference**: Testing OAuth popup logic without actual Google interaction

**Test: Circuit Gate Drag and Drop**
```typescript
// src/features/circuit/components/__tests__/CircuitComposer.test.tsx
import { render } from '@testing-library/react';
import { CircuitComposer } from '../CircuitComposer';
import { CircuitStoreProvider } from '../../store/CircuitStoreContext';

describe('CircuitComposer', () => {
  it('updates gate position on drag end', async () => {
    const { getByTestId } = render(
      <CircuitStoreProvider circuitId="test-circuit">
        <CircuitComposer />
      </CircuitStoreProvider>
    );

    const hGate = getByTestId('gate-h-0');

    // Simulate @dnd-kit drag event
    fireEvent.dragStart(hGate);
    fireEvent.dragOver(getByTestId('drop-zone-q0-p2'));
    fireEvent.drop(getByTestId('drop-zone-q0-p2'));

    // Verify store updated
    const store = useCircuitStore.getState();
    expect(store.placedGates[0].position).toBe(2);
  });
});
```
**Reference**: Verifying @dnd-kit integration updates Zustand store

---

### **5.3 Unit/Functional Testing (Category 2)**
*(3-5 pages, 1.25 points)*

#### **5.3.1 Backend Unit Tests (pytest)**

**Test: JWT Token Creation and Validation**
```python
# tests/unit/test_security.py
import pytest
from datetime import datetime, timezone, timedelta
from app.core.security import create_access_token, decode_token

def test_create_access_token():
    """Verify JWT payload structure and expiration"""
    token = create_access_token(subject="user123")

    decoded = decode_token(token)
    assert decoded["sub"] == "user123"
    assert decoded["type"] == "access"
    assert "exp" in decoded

    # Verify expiration is ~15 minutes in future
    exp_time = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
    now = datetime.now(timezone.utc)
    assert 14 < (exp_time - now).seconds / 60 < 16

def test_expired_token_raises_error():
    """Verify expired tokens are rejected"""
    # Create token that expired 1 hour ago
    payload = {
        "sub": "user123",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        "type": "access"
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    with pytest.raises(HTTPException) as exc:
        decode_token(token)
    assert exc.value.status_code == 401
```
**Reference**: [app/core/security.py:15-50](app/core/security.py#L15-L50)

**Test: Circuit DAG Validation**
```python
# tests/unit/test_circuit_validator.py
import pytest
from app.services.circuit_validator import validate_circuit_structure

def test_valid_bell_state_circuit():
    """Verify valid 2-qubit Bell state circuit passes validation"""
    circuit = {
        "qubits": 2,
        "gates": [
            {"type": "H", "qubit": 0, "position": 0},
            {"type": "CNOT", "control": 0, "target": 1, "position": 1}
        ]
    }

    result = validate_circuit_structure(circuit)
    assert result["valid"] is True
    assert result["depth"] == 2

def test_invalid_qubit_index_rejected():
    """Verify out-of-bounds qubit index raises error"""
    circuit = {
        "qubits": 2,
        "gates": [{"type": "X", "qubit": 3, "position": 0}]
    }

    with pytest.raises(ValueError, match="Qubit index 3 out of bounds"):
        validate_circuit_structure(circuit)

def test_measurement_must_be_last():
    """Verify measurements only allowed at final position"""
    circuit = {
        "qubits": 2,
        "gates": [
            {"type": "M", "qubit": 0, "position": 0},
            {"type": "H", "qubit": 0, "position": 1}  # After measurement
        ]
    }

    result = validate_circuit_structure(circuit)
    assert result["valid"] is False
    assert "measurement must be at end" in result["errors"][0].lower()
```
**Reference**: Ensures circuit DAG constraints (no cycles, measurements at end)

**Test: MongoDB Repository Pattern**
```python
# tests/unit/test_project_repository.py
import pytest
from unittest.mock import MagicMock, AsyncMock
from app.repositories.project_repository import ProjectRepository
from app.models.project import Project

@pytest.fixture
def mock_db():
    db = MagicMock()
    db.projects = MagicMock()
    return db

@pytest.mark.asyncio
async def test_create_project(mock_db):
    """Verify project creation inserts document"""
    repo = ProjectRepository(mock_db)
    mock_db.projects.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="proj123")
    )

    project = Project(
        name="Test Project",
        owner_id="user456",
        circuits=[]
    )

    result = await repo.create(project)

    assert result.id == "proj123"
    mock_db.projects.insert_one.assert_called_once()

@pytest.mark.asyncio
async def test_add_circuit_to_project(mock_db):
    """Verify circuit appended to embedded array"""
    repo = ProjectRepository(mock_db)
    mock_db.projects.update_one = AsyncMock()

    await repo.add_circuit("proj123", {"name": "Bell State", "qubits": 2})

    # Verify $push operator used for embedded array
    call_args = mock_db.projects.update_one.call_args
    assert call_args[0][0] == {"_id": "proj123"}
    assert "$push" in call_args[0][1]
    assert call_args[0][1]["$push"]["circuits"]["name"] == "Bell State"
```
**Reference**: [app/repositories/project_repository.py:20-80](app/repositories/project_repository.py#L20-L80)

**Test: SSH Connection Pool**
```python
# tests/unit/test_ssh_manager.py
import pytest
from unittest.mock import MagicMock, patch
from app.services.ssh_manager import SSHConnectionPool

@patch('paramiko.SSHClient')
def test_connection_pool_reuse(mock_ssh_client):
    """Verify connections reused from pool"""
    pool = SSHConnectionPool(max_connections=3)

    # First connection creates new client
    client1 = pool.get_connection("user@host1")
    assert mock_ssh_client.call_count == 1

    # Same host reuses connection
    client2 = pool.get_connection("user@host1")
    assert client1 is client2
    assert mock_ssh_client.call_count == 1  # No new connection

def test_connection_pool_max_limit():
    """Verify pool enforces max connection limit"""
    pool = SSHConnectionPool(max_connections=2)

    pool.get_connection("user@host1")
    pool.get_connection("user@host2")

    # Third connection should raise error
    with pytest.raises(RuntimeError, match="Connection pool exhausted"):
        pool.get_connection("user@host3")
```
**Reference**: [app/services/ssh_manager.py:45-120](app/services/ssh_manager.py#L45-L120)

---

#### **5.3.2 Frontend Component Logic Tests**

**Test: Zustand Store Actions**
```typescript
// src/features/circuit/store/__tests__/useCircuitStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCircuitStore } from '../useCircuitStore';

describe('useCircuitStore', () => {
  it('adds gate to circuit', () => {
    const { result } = renderHook(() => useCircuitStore());

    act(() => {
      result.current.addGate({
        id: 'gate-1',
        type: 'H',
        qubit: 0,
        position: 0
      });
    });

    expect(result.current.placedGates).toHaveLength(1);
    expect(result.current.placedGates[0].type).toBe('H');
  });

  it('groups multiple gates', () => {
    const { result } = renderHook(() => useCircuitStore());

    // Add 2 gates
    act(() => {
      result.current.addGate({ id: 'g1', type: 'H', qubit: 0, position: 0 });
      result.current.addGate({ id: 'g2', type: 'X', qubit: 0, position: 1 });
    });

    // Group them
    act(() => {
      result.current.group(['g1', 'g2'], 'MyGroup', '#FF5733');
    });

    const grouped = result.current.placedGates.find(g => g.type === 'group');
    expect(grouped).toBeDefined();
    expect(grouped.symbol).toBe('MyGroup');
    expect(grouped.gates).toHaveLength(2);
  });
});
```
**Reference**: Testing Zustand store logic in isolation

---

### **5.4 Integration/E2E/API Testing (Category 3)**
*(3-5 pages, 1.25 points)*

#### **5.4.1 REST API Integration Tests (httpx)**

**Test: Authentication Flow End-to-End**
```python
# tests/integration/test_auth_flow.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_google_oauth_callback_creates_user():
    """Verify OAuth callback creates new user and returns JWT"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Simulate Google OAuth callback
        response = await client.get(
            "/api/auth/google/callback",
            params={
                "code": "mock_google_code",
                "state": "random_state_123"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

        # Verify user created in database
        user = await db.users.find_one({"email": "test@gmail.com"})
        assert user is not None
        assert user["auth_provider"] == "google"

@pytest.mark.asyncio
async def test_token_refresh_extends_session():
    """Verify refresh token generates new access token"""
    # Create initial tokens
    access_token = create_access_token("user123")
    refresh_token = create_refresh_token("user123")

    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token}
        )

        assert response.status_code == 200
        new_access = response.json()["access_token"]
        assert new_access != access_token  # Different token issued

        # Verify new token works for authenticated endpoints
        projects_response = await client.get(
            "/api/projects",
            headers={"Authorization": f"Bearer {new_access}"}
        )
        assert projects_response.status_code == 200
```
**Reference**: [app/api/routes/auth.py:80-150](app/api/routes/auth.py#L80-L150)

**Test: Project CRUD Operations**
```python
# tests/integration/test_projects.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_and_retrieve_project(authenticated_client):
    """Verify project creation and retrieval workflow"""
    # Create project
    create_response = await authenticated_client.post(
        "/api/projects",
        json={
            "name": "My Quantum Project",
            "description": "Bell state experiments"
        }
    )

    assert create_response.status_code == 201
    project_id = create_response.json()["id"]

    # Retrieve project
    get_response = await authenticated_client.get(f"/api/projects/{project_id}")
    assert get_response.status_code == 200

    project = get_response.json()
    assert project["name"] == "My Quantum Project"
    assert project["circuits"] == []

@pytest.mark.asyncio
async def test_add_circuit_to_project(authenticated_client):
    """Verify circuit creation within project"""
    # Create project first
    proj_resp = await authenticated_client.post(
        "/api/projects",
        json={"name": "Test"}
    )
    project_id = proj_resp.json()["id"]

    # Add circuit
    circuit_resp = await authenticated_client.post(
        f"/api/projects/{project_id}/circuits",
        json={
            "name": "Bell State",
            "qubits": 2,
            "gates": [
                {"type": "H", "qubit": 0, "position": 0},
                {"type": "CNOT", "control": 0, "target": 1, "position": 1}
            ]
        }
    )

    assert circuit_resp.status_code == 201
    circuit_id = circuit_resp.json()["id"]

    # Verify circuit embedded in project
    get_resp = await authenticated_client.get(f"/api/projects/{project_id}")
    circuits = get_resp.json()["circuits"]
    assert len(circuits) == 1
    assert circuits[0]["id"] == circuit_id
```
**Reference**: Testing MongoDB embedded document operations

**Test: Job Submission and Execution Pipeline**
```python
# tests/integration/test_job_execution.py
import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
@patch('app.services.ssh_manager.SSHConnectionPool.execute_command')
async def test_job_submission_to_completion(mock_ssh_exec, authenticated_client):
    """Verify full job lifecycle: submit -> queue -> execute -> complete"""
    # Mock SSH execution to return quantum results
    mock_ssh_exec.return_value = AsyncMock(return_value={
        "state_vector": [0.707, 0, 0, 0.707],
        "measurements": {"00": 512, "11": 488}
    })

    # Submit job
    submit_resp = await authenticated_client.post(
        "/api/jobs",
        json={
            "circuit_id": "circuit123",
            "backend": "qiskit_simulator",
            "shots": 1000
        }
    )

    assert submit_resp.status_code == 202
    job_id = submit_resp.json()["job_id"]

    # Poll job status (simulate async execution)
    import asyncio
    await asyncio.sleep(2)  # Wait for background processing

    status_resp = await authenticated_client.get(f"/api/jobs/{job_id}")
    job = status_resp.json()

    assert job["status"] == "completed"
    assert "results" in job
    assert job["results"]["measurements"]["00"] + job["results"]["measurements"]["11"] == 1000

    # Verify SSH command called with correct circuit
    mock_ssh_exec.assert_called_once()
    call_args = mock_ssh_exec.call_args[0]
    assert "qiskit" in call_args[0].lower()
```
**Reference**: [app/api/routes/jobs.py:30-100](app/api/routes/jobs.py#L30-L100), [app/services/job_manager.py:50-150](app/services/job_manager.py#L50-L150)

---

#### **5.4.2 WebSocket Integration Tests**

**Test: Real-Time Job Updates via WebSocket**
```python
# tests/integration/test_websocket.py
import pytest
from websockets import connect
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_websocket_job_progress_streaming():
    """Verify WebSocket receives real-time job execution updates"""
    # Connect to WebSocket
    async with connect("ws://localhost:8000/ws") as websocket:
        # Authenticate
        await websocket.send(json.dumps({
            "type": "auth",
            "token": "valid_jwt_token"
        }))

        auth_resp = json.loads(await websocket.recv())
        assert auth_resp["type"] == "auth_success"

        # Join job room
        await websocket.send(json.dumps({
            "type": "join_room",
            "room": "job_job123"
        }))

        # Trigger job execution (via HTTP API in parallel)
        async with AsyncClient(base_url="http://localhost:8000") as client:
            await client.post(
                "/api/jobs",
                json={"circuit_id": "circuit123", "backend": "simulator"},
                headers={"Authorization": "Bearer valid_jwt_token"}
            )

        # Receive WebSocket messages
        messages = []
        async for message in websocket:
            data = json.loads(message)
            messages.append(data)

            if data["type"] == "job_completed":
                break

        # Verify message sequence
        assert any(m["type"] == "job_queued" for m in messages)
        assert any(m["type"] == "job_running" for m in messages)
        assert any(m["type"] == "job_completed" for m in messages)

        # Verify final message contains results
        final = messages[-1]
        assert final["status"] == "completed"
        assert "results" in final
```
**Reference**: [app/websocket/connection_manager.py:70-150](app/websocket/connection_manager.py#L70-L150)

**Test: WebSocket Room Isolation**
```python
@pytest.mark.asyncio
async def test_websocket_room_isolation():
    """Verify messages only broadcast to users in same room"""
    # Connect two clients
    async with connect("ws://localhost:8000/ws") as ws1, \
               connect("ws://localhost:8000/ws") as ws2:

        # Both authenticate
        for ws in [ws1, ws2]:
            await ws.send(json.dumps({"type": "auth", "token": "token"}))
            await ws.recv()  # auth_success

        # Client 1 joins job_abc room
        await ws1.send(json.dumps({"type": "join_room", "room": "job_abc"}))

        # Client 2 joins job_xyz room
        await ws2.send(json.dumps({"type": "join_room", "room": "job_xyz"}))

        # Broadcast message to job_abc
        await connection_manager.broadcast_to_room("job_abc", {
            "type": "test_message",
            "content": "Hello job_abc"
        })

        # Client 1 receives message
        msg1 = json.loads(await asyncio.wait_for(ws1.recv(), timeout=1.0))
        assert msg1["content"] == "Hello job_abc"

        # Client 2 should NOT receive message
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(ws2.recv(), timeout=0.5)
```
**Reference**: Testing room-based broadcasting logic

---

### **5.5 Advanced Testing (Category 4)**
*(3-5 pages, 1.25 points)*

#### **5.5.1 Authentication & Authorization Testing**

**Test: JWT Expiration and Refresh**
```python
# tests/advanced/test_jwt_expiration.py
import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_expired_access_token_rejected():
    """Verify expired access tokens return 401"""
    # Create token that expired 1 hour ago
    expired_token = create_access_token("user123", expire_delta=-60)

    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/api/projects",
            headers={"Authorization": f"Bearer {expired_token}"}
        )

        assert response.status_code == 401
        assert "expired" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_frontend_auto_refresh_interceptor():
    """Verify axios interceptor auto-refreshes expired tokens"""
    # This test runs against live frontend + backend
    # Simulate: access token expires mid-session

    # 1. Login to get initial tokens
    # 2. Manually expire access token in localStorage
    # 3. Make API request
    # 4. Verify interceptor catches 401, calls /refresh, retries
    # 5. Verify request ultimately succeeds

    # (This requires Playwright/Cypress for browser automation)
    pass  # See section 5.5.3 for E2E test example
```
**Reference**: [lib/api/client.ts:20-50](lib/api/client.ts#L20-L50)

**Test: Multi-Provider OAuth Token Validation**
```python
@pytest.mark.asyncio
async def test_google_vs_microsoft_token_isolation():
    """Verify tokens from different providers cannot cross-authenticate"""
    # Create user via Google OAuth
    google_user = await create_user_via_oauth("google", "user@gmail.com")
    google_token = create_access_token(str(google_user.id))

    # Create user via Microsoft OAuth with SAME email
    ms_user = await create_user_via_oauth("microsoft", "user@outlook.com")
    ms_token = create_access_token(str(ms_user.id))

    # Verify tokens are not interchangeable
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Google token accesses Google user's projects
        google_resp = await client.get(
            "/api/projects",
            headers={"Authorization": f"Bearer {google_token}"}
        )
        assert google_resp.json()["owner_id"] == str(google_user.id)

        # Microsoft token accesses different user's projects
        ms_resp = await client.get(
            "/api/projects",
            headers={"Authorization": f"Bearer {ms_token}"}
        )
        assert ms_resp.json()["owner_id"] == str(ms_user.id)
        assert ms_user.id != google_user.id  # Different users
```

---

#### **5.5.2 Performance & Stress Testing**

**Test: SSH Connection Pool Under Load**
```python
# tests/advanced/test_ssh_pool_concurrency.py
import pytest
import asyncio
from app.services.ssh_manager import SSHConnectionPool

@pytest.mark.asyncio
async def test_connection_pool_concurrent_jobs():
    """Verify pool handles 10 simultaneous jobs without deadlock"""
    pool = SSHConnectionPool(max_connections=5)

    async def execute_job(job_id):
        connection = await pool.get_connection("user@quantum-server")
        result = await connection.execute_command(f"python simulate.py {job_id}")
        pool.release_connection(connection)
        return result

    # Submit 10 jobs concurrently (pool has only 5 connections)
    jobs = [execute_job(i) for i in range(10)]
    results = await asyncio.gather(*jobs)

    assert len(results) == 10
    assert all(r is not None for r in results)

    # Verify no connections leaked
    assert pool.active_connections == 0

@pytest.mark.asyncio
async def test_websocket_broadcast_latency():
    """Verify broadcast to 100 clients completes within 500ms"""
    from app.websocket.connection_manager import ConnectionManager
    manager = ConnectionManager()

    # Simulate 100 connected clients
    mock_connections = [MockWebSocket() for _ in range(100)]
    for conn in mock_connections:
        await manager.connect(conn, user_id=f"user{i}")
        await manager.join_room(conn, "job_abc")

    # Broadcast message and measure time
    start = time.time()
    await manager.broadcast_to_room("job_abc", {"type": "test", "data": "x" * 1000})
    elapsed = time.time() - start

    assert elapsed < 0.5  # 500ms threshold

    # Verify all clients received message
    for conn in mock_connections:
        assert conn.last_message["type"] == "test"
```

**Test: Circuit Undo/Redo Performance (50 Actions)**
```typescript
// tests/advanced/undo-redo-performance.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCircuitStore } from '../useCircuitStore';

describe('Undo/Redo Performance', () => {
  it('handles 50 actions within 100ms', () => {
    const { result } = renderHook(() => useCircuitStore());

    const start = performance.now();

    act(() => {
      // Add 50 gates
      for (let i = 0; i < 50; i++) {
        result.current.addGate({
          id: `gate-${i}`,
          type: i % 2 === 0 ? 'H' : 'X',
          qubit: i % 4,
          position: Math.floor(i / 4)
        });
      }

      // Undo all 50 actions
      for (let i = 0; i < 50; i++) {
        result.current.undo();
      }

      // Redo all 50 actions
      for (let i = 0; i < 50; i++) {
        result.current.redo();
      }
    });

    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);  // 100ms threshold
    expect(result.current.placedGates).toHaveLength(50);
  });
});
```
**Reference**: Verifying Zundo temporal middleware performance

---

#### **5.5.3 Network Resilience & Error Handling**

**Test: WebSocket Auto-Reconnect with Exponential Backoff**
```typescript
// tests/advanced/websocket-reconnect.test.ts
import { WebSocketProvider } from '@/lib/websocket/WebSocketProvider';

describe('WebSocket Reconnection', () => {
  it('retries with exponential backoff after disconnect', async () => {
    const mockWs = new MockWebSocket();
    const delays: number[] = [];

    // Mock setTimeout to capture delays
    vi.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
      delays.push(delay);
      return setTimeout(fn, 0);  // Execute immediately in test
    });

    // Simulate connection failure
    mockWs.readyState = WebSocket.CLOSED;

    const provider = new WebSocketProvider('ws://localhost:8000/ws');
    await provider.connect();

    // Trigger reconnection attempts
    for (let i = 0; i < 5; i++) {
      mockWs.onerror(new Event('error'));
    }

    // Verify exponential backoff: 1s, 2s, 4s, 8s, 16s
    expect(delays).toEqual([1000, 2000, 4000, 8000, 16000]);
  });
});
```
**Reference**: [WebSocketProvider.tsx:120-180](src/lib/websocket/WebSocketProvider.tsx#L120-L180)

**Test: SSH Command Timeout Handling**
```python
# tests/advanced/test_ssh_timeout.py
import pytest
from app.services.ssh_manager import SSHConnectionPool

@pytest.mark.asyncio
async def test_ssh_command_timeout_after_30s():
    """Verify SSH commands timeout if remote execution hangs"""
    pool = SSHConnectionPool()
    connection = await pool.get_connection("user@slow-server")

    with pytest.raises(TimeoutError, match="SSH command exceeded 30s timeout"):
        # Simulate command that never returns
        await connection.execute_command(
            "sleep 60",  # Command takes 60s, timeout is 30s
            timeout=30
        )
```

---

#### **5.5.4 Security Testing**

**Test: SQL Injection Prevention (MongoDB)**
```python
# tests/advanced/test_nosql_injection.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_project_name_nosql_injection_blocked():
    """Verify malicious MongoDB operators rejected in user input"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Attempt NoSQL injection via project name
        response = await client.post(
            "/api/projects",
            json={
                "name": {"$ne": None},  # MongoDB operator
                "description": "Test"
            },
            headers={"Authorization": "Bearer valid_token"}
        )

        # Should fail validation (Pydantic rejects dict for string field)
        assert response.status_code == 422
        assert "name" in response.json()["detail"][0]["loc"]
```

**Test: XSS Prevention in Circuit Names**
```python
@pytest.mark.asyncio
async def test_circuit_name_xss_escaped():
    """Verify script tags in circuit names are escaped"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/projects/proj123/circuits",
            json={
                "name": "<script>alert('XSS')</script>",
                "qubits": 2
            },
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 201
        circuit = response.json()

        # Verify name stored as-is but frontend escapes
        assert circuit["name"] == "<script>alert('XSS')</script>"

        # Frontend test: verify React escapes when rendering
        # (Would use Playwright to check DOM doesn't execute script)
```

**Test: CORS Policy Enforcement**
```python
@pytest.mark.asyncio
async def test_cors_blocks_unauthorized_origins():
    """Verify CORS policy blocks requests from unauthorized domains"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.options(
            "/api/projects",
            headers={
                "Origin": "https://malicious-site.com",
                "Access-Control-Request-Method": "GET"
            }
        )

        # CORS preflight should not include malicious origin in allowed origins
        assert response.status_code == 403 or \
               "https://malicious-site.com" not in response.headers.get("Access-Control-Allow-Origin", "")
```

---

### **5.6 Test Coverage Summary**
*(1 page)*

**Coverage Targets**:
| Component | Coverage Goal | Current Coverage | Status |
|-----------|--------------|------------------|---------|
| Backend Core (security.py, auth) | 90% | 85% | ⚠️ |
| Backend Repositories | 80% | 78% | ⚠️ |
| Backend Services (SSH, jobs) | 75% | 72% | ⚠️ |
| Frontend Stores (Zustand) | 85% | 88% | ✅ |
| Frontend Components | 70% | 65% | ⚠️ |
| WebSocket Logic | 80% | 82% | ✅ |
| Integration Tests | N/A | 25 tests | ✅ |

**Test Execution**:
```bash
# Backend tests
pytest tests/ --cov=app --cov-report=html

# Frontend tests
npm run test:coverage

# Integration tests (requires backend running)
pytest tests/integration/ --asyncio-mode=auto

# CI/CD (GitHub Actions)
.github/workflows/test.yml  # Runs on every PR
```

**Test Gaps to Address**:
1. **Frontend E2E**: Add Playwright tests for full user workflows (login → create circuit → execute → view results)
2. **Load Testing**: Use Locust/K6 to simulate 100 concurrent users
3. **Accessibility**: Add axe-core tests for WCAG compliance

---

---

## **REQUIREMENT 7: Running Software Demonstration (5 points)**
*Each demo script worth ~0.6 points*

### **6. Software Demonstration Scripts**
*(6-8 pages total)*

---

### **6.1 Demo 1: Basic Functionality Walkthrough**
*(1 page, demonstrates core features work end-to-end)*

**Objective**: Show user can create account, build circuit, execute, and view results

**Prerequisites**:
- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:5173`
- MongoDB accessible
- Clean database (no existing users/projects)

**Demo Script**:

```markdown
### DEMO 1: Basic Functionality

**Step 1: User Registration (Google OAuth)**
1. Navigate to http://localhost:5173
2. Click "Sign in with Google"
3. In OAuth popup, select account "demo@gmail.com"
4. ✅ Verify redirect to `/projects` page
5. ✅ Verify header shows user avatar and name

**Step 2: Create Project**
1. Click "New Project" button
2. Enter name: "Bell State Demo"
3. Enter description: "Demonstrates quantum entanglement"
4. Click "Create"
5. ✅ Verify project appears in projects list
6. Click project to open

**Step 3: Build Bell State Circuit**
1. Click "New Circuit" → Name: "Bell State" → Qubits: 2
2. From gate palette, drag "H" gate to qubit 0, position 0
3. Drag "CNOT" gate, set control=0, target=1, position=1
4. ✅ Verify circuit diagram shows:
   ```
   q0: ─H─●─
          │
   q1: ───X─
   ```
5. Click "Save Circuit"

**Step 4: Execute Circuit**
1. Click "Run" button
2. Configure:
   - Backend: "Qiskit Simulator"
   - Shots: 1000
   - Server: "localhost"
3. Click "Submit Job"
4. ✅ Verify job appears in "Jobs" panel with status "Queued"
5. ✅ Watch status transition: Queued → Running → Completed (~5 seconds)

**Step 5: View Results**
1. Click completed job in jobs list
2. ✅ Verify results panel opens with tabs:
   - **Overview**: State vector bar chart showing |00⟩ and |11⟩ amplitudes ~0.707
   - **Histogram**: Measurement counts showing ~500 for "00" and ~500 for "11"
   - **Density Matrix**: 4x4 heatmap with nonzero elements at (0,0), (0,3), (3,0), (3,3)
3. ✅ Verify probabilities sum to 100%

**Step 6: Edit and Re-Run**
1. Click back to circuit composer
2. Add "X" gate to qubit 1 at position 2
3. Save and re-run
4. ✅ Verify new results show |01⟩ and |10⟩ states instead

**✅ DEMO 1 COMPLETE**: Basic create-execute-visualize workflow validated
```

**Evidence**: Record screen video or take screenshots at each ✅ checkpoint

---

### **6.2 Demo 2: OOP Modeling (Exam Topic 1)**
*(1 page, demonstrates UML diagrams map to implementation)*

**Objective**: Walk through class diagram → actual code for Circuit/Gate classes

**Prerequisites**: Backend and frontend code accessible

**Demo Script**:

```markdown
### DEMO 2: OOP Modeling with UML Diagrams

**Part A: Class Diagram Walkthrough**
1. Open `/docs/class-diagram-main.png` in image viewer
2. Identify key classes:
   - `Circuit`: Has qubits, gates[], methods: add_gate(), validate()
   - `Gate`: Abstract base with qubit, position, apply()
   - `HGate`, `CNOTGate`: Concrete implementations
   - `CircuitExecutor`: Composition relationship with Circuit
3. ✅ Note inheritance hierarchy and multiplicities

**Part B: Code Implementation Mapping**

**Circuit Class (Backend)**
```python
# Open: app/models/circuit.py:10-45
class Circuit(BaseModel):
    """Corresponds to 'Circuit' class in class-diagram-main.png"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    qubits: int
    gates: List[Gate] = []  # Composition: Circuit HAS-MANY Gates

    def add_gate(self, gate: Gate) -> None:
        """Method shown in class diagram"""
        if gate.qubit >= self.qubits:
            raise ValueError(f"Qubit {gate.qubit} out of range")
        self.gates.append(gate)

    def validate(self) -> bool:
        """Validates DAG structure (no cycles, measurements at end)"""
        # Implementation details...
```
✅ **Verify**: Class attributes match diagram boxes

**Gate Hierarchy (Backend)**
```python
# Open: app/models/gate.py:5-60
class Gate(BaseModel):
    """Abstract base class for all quantum gates"""
    type: str
    qubit: int
    position: int

    @abstractmethod
    def apply(self, state_vector: np.ndarray) -> np.ndarray:
        """Abstract method from class diagram"""
        pass

class HGate(Gate):
    """Concrete implementation - Hadamard gate"""
    type: Literal["H"] = "H"

    def apply(self, state_vector):
        # Apply Hadamard matrix...

class CNOTGate(Gate):
    """Concrete implementation - Controlled-NOT"""
    type: Literal["CNOT"] = "CNOT"
    control: int
    target: int

    def apply(self, state_vector):
        # Apply CNOT matrix...
```
✅ **Verify**: Inheritance relationship matches diagram arrows

**Part C: Sequence Diagram → Runtime Behavior**
1. Open `/docs/sequence-diagram-job-execution.png`
2. Trace execution flow: Frontend → API → JobManager → SSHManager → Backend Server
3. Open corresponding code:
   ```python
   # app/api/routes/jobs.py:45-80
   @router.post("/jobs")
   async def submit_job(job_request: JobRequest, user_id: str):
       # Step 1: Validate circuit (corresponds to "validate()" in sequence diagram)
       circuit = await circuit_repo.get(job_request.circuit_id)
       circuit.validate()

       # Step 2: Create job (corresponds to "create_job()" message)
       job = await job_manager.create_job(circuit, user_id)

       # Step 3: Execute via SSH (corresponds to "execute_remote()" message)
       ssh_manager.execute_async(job.id, circuit)

       return {"job_id": job.id}
   ```
4. ✅ **Verify**: Code execution order matches sequence diagram message flow

**✅ DEMO 2 COMPLETE**: UML diagrams accurately model implementation
```

**Evidence**: Side-by-side comparison screenshots of diagram + code

---

### **6.3 Demo 3: OOP Languages (Exam Topic 2)**
*(1 page, demonstrates Python + TypeScript OOP features)*

**Objective**: Show inheritance, polymorphism, encapsulation, dependency injection

**Demo Script**:

```markdown
### DEMO 3: OOP Language Features

**Part A: Python Inheritance & Polymorphism**

**Inheritance Example - Gate Classes**
```python
# app/models/gate.py
class Gate(BaseModel):
    """Base class - defines interface"""
    @abstractmethod
    def apply(self, state_vector: np.ndarray) -> np.ndarray:
        pass

class HGate(Gate):
    """Derived class - implements interface"""
    def apply(self, state_vector):
        return hadamard_matrix @ state_vector

class XGate(Gate):
    """Another derived class - same interface, different behavior"""
    def apply(self, state_vector):
        return pauli_x_matrix @ state_vector
```
✅ **Demo Polymorphism**:
```python
# Circuit executor treats all gates uniformly
def execute_circuit(gates: List[Gate], initial_state):
    state = initial_state
    for gate in gates:
        state = gate.apply(state)  # Polymorphic call - runtime determines which apply()
    return state
```

**Encapsulation Example - Repository Pattern**
```python
# app/repositories/project_repository.py:15-50
class ProjectRepository:
    """Encapsulates MongoDB operations - hides implementation details"""
    def __init__(self, db: Database):
        self._db = db  # Private attribute (by convention)
        self._collection = db.projects

    async def create(self, project: Project) -> Project:
        """Public interface - internal details hidden"""
        result = await self._collection.insert_one(project.dict())
        project.id = str(result.inserted_id)
        return project

    async def _build_query(self, filters: dict):
        """Private helper method - not exposed to consumers"""
        # Complex query building logic...
```
✅ **Verify**: External code calls `create()`, never accesses `_collection` directly

**Part B: TypeScript Inheritance & Generics**

**Inheritance Example - Store Base Class**
```typescript
// src/lib/store/BaseStore.ts
abstract class BaseStore<T> {
  protected state: T;  // Protected - accessible by subclasses

  abstract getState(): T;  // Abstract method - subclasses must implement

  protected setState(newState: T): void {  // Concrete method - inherited
    this.state = newState;
  }
}

// src/features/circuit/store/CircuitStore.ts
class CircuitStore extends BaseStore<CircuitState> {
  getState(): CircuitState {
    return this.state;  // Implements abstract method
  }

  addGate(gate: Gate): void {
    this.setState({
      ...this.state,
      gates: [...this.state.gates, gate]
    });  // Uses inherited method
  }
}
```

**Generics Example - API Client**
```typescript
// src/lib/api/client.ts:60-80
class ApiClient {
  async get<T>(url: string): Promise<T> {  // Generic method
    const response = await fetch(url);
    return response.json() as T;
  }
}

// Usage with type safety
interface Project { id: string; name: string; }
const project = await apiClient.get<Project>("/api/projects/123");
// TypeScript knows 'project' has id and name properties
```

**Part C: Dependency Injection (Python)**
```python
# app/main.py:25-40
def get_db() -> Database:
    """Dependency provider"""
    client = MongoClient(settings.MONGODB_URL)
    return client[settings.DATABASE_NAME]

def get_project_repo(db: Database = Depends(get_db)) -> ProjectRepository:
    """Injected dependency"""
    return ProjectRepository(db)

@router.get("/projects")
async def list_projects(
    repo: ProjectRepository = Depends(get_project_repo),  # DI here
    user_id: str = Depends(get_current_user)
):
    """Endpoint receives repository WITHOUT creating it"""
    return await repo.find_by_owner(user_id)
```
✅ **Benefit**: Easy to mock `repo` in tests, swap implementations

**✅ DEMO 3 COMPLETE**: Core OOP concepts demonstrated in both languages
```

**Evidence**: Code snippets with annotations highlighting OOP features

---

### **6.4 Demo 4: Data Structures (Exam Topic 3)**
*(1 page, demonstrates DAG, stacks, hash maps)*

**Objective**: Show circuit DAG validation, undo/redo stacks, job queue hash map

**Demo Script**:

```markdown
### DEMO 4: Data Structures in Action

**Part A: Circuit as Directed Acyclic Graph (DAG)**

**DAG Validation Algorithm**
```python
# app/services/circuit_validator.py:30-80
def validate_circuit_dag(circuit: Circuit) -> ValidationResult:
    """Ensures circuit forms valid DAG (no cycles, topological order)"""

    # Build adjacency list (graph representation)
    graph: dict[int, list[int]] = defaultdict(list)
    for gate in circuit.gates:
        if isinstance(gate, CNOTGate):
            # CNOT creates edge: control qubit → target qubit
            graph[gate.control].append(gate.target)

    # Detect cycles using DFS with color marking
    WHITE, GRAY, BLACK = 0, 1, 2
    colors = {q: WHITE for q in range(circuit.qubits)}

    def has_cycle(node):
        if colors[node] == GRAY:  # Back edge = cycle
            return True
        if colors[node] == BLACK:  # Already processed
            return False

        colors[node] = GRAY
        for neighbor in graph[node]:
            if has_cycle(neighbor):
                return True
        colors[node] = BLACK
        return False

    for qubit in range(circuit.qubits):
        if colors[qubit] == WHITE:
            if has_cycle(qubit):
                return ValidationResult(valid=False, error="Cycle detected")

    return ValidationResult(valid=True)
```
✅ **Demo with Example**:
```python
# Valid DAG:
#   q0: ─●─    (q0 controls q1)
#        │
#   q1: ─X─●─  (q1 controls q2)
#          │
#   q2: ───X─
# Graph: {0: [1], 1: [2]} - no cycles ✅

# Invalid (cycle):
#   q0: ─●─X─  (q0→q1, q1→q0)
#        │ │
#   q1: ─X─●─
# Graph: {0: [1], 1: [0]} - cycle detected ❌
```

**Part B: Undo/Redo with Dual Stacks**

**Zundo Implementation (TypeScript)**
```typescript
// node_modules/zundo/src/temporal.ts (conceptual)
interface TemporalState<T> {
  past: T[];    // Stack of previous states
  present: T;   // Current state
  future: T[];  // Stack of undone states (for redo)
}

function temporal<T>(store: Store<T>) {
  return {
    ...store,
    undo: () => {
      const { past, present, future } = get();
      if (past.length === 0) return;  // Nothing to undo

      // Pop from past, push present to future
      const previous = past[past.length - 1];
      set({
        past: past.slice(0, -1),        // Stack pop
        present: previous,
        future: [present, ...future]    // Stack push
      });
    },
    redo: () => {
      const { past, present, future } = get();
      if (future.length === 0) return;  // Nothing to redo

      // Pop from future, push present to past
      const next = future[0];
      set({
        past: [...past, present],       // Stack push
        present: next,
        future: future.slice(1)         // Stack pop
      });
    }
  };
}
```
✅ **Trace Execution**:
```
Initial: past=[], present={gates: []}, future=[]

1. Add H gate:
   past=[], present={gates: [H]}, future=[]

2. Add X gate:
   past=[{gates: [H]}], present={gates: [H, X]}, future=[]

3. Undo:
   past=[], present={gates: [H]}, future=[{gates: [H, X]}]

4. Redo:
   past=[{gates: [H]}], present={gates: [H, X]}, future=[]
```

**Part C: Job Queue as Hash Map**

**JobManager Implementation (Python)**
```python
# app/services/job_manager.py:20-90
class JobManager:
    def __init__(self):
        self._jobs: dict[str, Job] = {}  # Hash map: job_id → Job object
        self._queue: deque[str] = deque()  # FIFO queue of job IDs

    async def submit_job(self, circuit: Circuit, user_id: str) -> Job:
        """O(1) insertion into hash map"""
        job = Job(
            id=str(uuid4()),
            circuit=circuit,
            status="queued",
            user_id=user_id
        )
        self._jobs[job.id] = job  # Hash map insert: O(1)
        self._queue.append(job.id)  # Queue enqueue: O(1)
        return job

    async def get_job(self, job_id: str) -> Job:
        """O(1) lookup by job ID"""
        return self._jobs.get(job_id)  # Hash map lookup: O(1)

    async def process_next(self):
        """Process jobs in FIFO order"""
        if not self._queue:
            return

        job_id = self._queue.popleft()  # Queue dequeue: O(1)
        job = self._jobs[job_id]  # Hash map lookup: O(1)

        # Execute job...
        job.status = "running"
        await ssh_manager.execute(job)
        job.status = "completed"
```
✅ **Performance Analysis**:
- **Hash Map**: O(1) job lookup by ID (vs O(n) for list)
- **Deque**: O(1) append/popleft (vs O(n) for list pop(0))
- **Trade-off**: Extra memory for hash map, but 10000x faster for large job counts

**✅ DEMO 4 COMPLETE**: DAG, stacks, hash maps in production use
```

**Evidence**: Draw DAG diagrams, trace stack operations, measure lookup times

---

### **6.5 Demo 5: Complex Feature 1 - SSH + WebSocket Pipeline**
*(1 page, demonstrates most technically sophisticated feature)*

**Objective**: Show full execution pipeline from frontend to remote quantum server

**Demo Script**:

```markdown
### DEMO 5: SSH + WebSocket Execution Pipeline

**Architecture Overview**:
```
Frontend (React)
  ↓ HTTP POST /api/jobs
FastAPI Backend
  ↓ SSH (Paramiko)
Remote Quantum Server (Python)
  ↓ WebSocket broadcast
FastAPI Backend
  ↓ WebSocket push
Frontend (React) - Live updates
```

**Part A: Job Submission (Frontend)**
```typescript
// src/features/jobs/hooks/useJobSubmission.ts:30-60
const submitJob = async (circuitId: string, config: JobConfig) => {
  // Step 1: HTTP request to backend
  const response = await apiClient.post("/api/jobs", {
    circuit_id: circuitId,
    backend: config.backend,
    shots: config.shots,
    server: config.server
  });

  const jobId = response.data.job_id;

  // Step 2: Join WebSocket room for real-time updates
  websocket.send(JSON.stringify({
    type: "join_room",
    room: `job_${jobId}`
  }));

  return jobId;
};
```

**Part B: Backend Job Orchestration**
```python
# app/api/routes/jobs.py:45-100
@router.post("/jobs")
async def submit_job(
    request: JobRequest,
    user_id: str = Depends(get_current_user),
    job_manager: JobManager = Depends(get_job_manager),
    ssh_manager: SSHManager = Depends(get_ssh_manager)
):
    # Step 1: Create job in database
    job = await job_manager.create_job(
        circuit_id=request.circuit_id,
        user_id=user_id,
        config=request.config
    )

    # Step 2: Execute asynchronously via SSH
    asyncio.create_task(
        execute_job_async(job.id, ssh_manager, job_manager)
    )

    return {"job_id": job.id, "status": "queued"}

async def execute_job_async(
    job_id: str,
    ssh_manager: SSHManager,
    job_manager: JobManager
):
    """Background task - streams output via WebSocket"""
    job = await job_manager.get_job(job_id)

    # Step 3: Get SSH connection from pool
    connection = await ssh_manager.get_connection(job.config.server)

    # Step 4: Execute remote Python script
    command = f"python quantum_simulate.py --circuit '{job.circuit.to_qasm()}' --shots {job.config.shots}"

    # Step 5: Stream output line-by-line
    async for line in connection.stream_command(command):
        # Broadcast each line to WebSocket room
        await connection_manager.broadcast_to_room(
            f"job_{job_id}",
            {
                "type": "job_output",
                "job_id": job_id,
                "line": line
            }
        )

    # Step 6: Parse final results
    results = parse_quantum_results(output)
    await job_manager.update_job(job_id, status="completed", results=results)

    # Step 7: Broadcast completion
    await connection_manager.broadcast_to_room(
        f"job_{job_id}",
        {
            "type": "job_completed",
            "job_id": job_id,
            "results": results
        }
    )

    # Step 8: Return connection to pool
    ssh_manager.release_connection(connection)
```

**Part C: SSH Connection Pooling**
```python
# app/services/ssh_manager.py:30-100
class SSHConnectionPool:
    def __init__(self, max_connections: int = 10):
        self._pool: dict[str, paramiko.SSHClient] = {}  # server → connection
        self._active: dict[str, int] = {}  # server → active count
        self._max = max_connections

    async def get_connection(self, server: str) -> SSHConnection:
        """Reuse existing connection or create new one"""
        if server in self._pool and self._active[server] < 5:
            # Reuse existing connection
            self._active[server] += 1
            return SSHConnection(self._pool[server], server)

        if len(self._pool) >= self._max:
            raise RuntimeError("Connection pool exhausted")

        # Create new connection
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=server,
            username=settings.SSH_USER,
            key_filename=settings.SSH_KEY_PATH
        )

        self._pool[server] = client
        self._active[server] = 1
        return SSHConnection(client, server)

    def release_connection(self, connection: SSHConnection):
        """Return connection to pool"""
        self._active[connection.server] -= 1
        # Connection remains open for reuse
```

**Part D: WebSocket Real-Time Updates (Frontend)**
```typescript
// src/lib/websocket/WebSocketProvider.tsx:100-150
useEffect(() => {
  if (!socket) return;

  const handleMessage = (event: MessageEvent) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "job_output":
        // Append line to console output
        setJobConsole(prev => [...prev, data.line]);
        break;

      case "job_completed":
        // Update job status and show results
        setJobs(prev => prev.map(job =>
          job.id === data.job_id
            ? { ...job, status: "completed", results: data.results }
            : job
        ));
        toast.success("Job completed successfully!");
        break;
    }
  };

  socket.addEventListener("message", handleMessage);
  return () => socket.removeEventListener("message", handleMessage);
}, [socket]);
```

**Live Demo Steps**:
1. Open browser DevTools → Network → WS tab
2. Submit job from circuit composer
3. ✅ Observe WebSocket messages streaming in real-time:
   ```json
   {"type": "job_output", "line": "Initializing quantum simulator..."}
   {"type": "job_output", "line": "Applying H gate to qubit 0..."}
   {"type": "job_output", "line": "Applying CNOT gate..."}
   {"type": "job_output", "line": "Running 1000 shots..."}
   {"type": "job_completed", "results": {"state_vector": [...]}}
   ```
4. ✅ Verify job console updates in real-time without page refresh
5. ✅ Check backend logs show SSH connection pooling

**✅ DEMO 5 COMPLETE**: Full-stack real-time execution pipeline validated
```

**Evidence**: Video recording showing WebSocket messages + console output

---

### **6.6 Demo 6: Complex Feature 2 - Circuit Designer with Undo/Redo**
*(1 page)*

**Objective**: Demonstrate Zundo temporal state management with grouping

**Demo Script**:

```markdown
### DEMO 6: Interactive Circuit Designer

**Part A: Undo/Redo for Gate Placement**

**Live Demo**:
1. Open circuit composer for new circuit (4 qubits)
2. Place gates in sequence:
   - H on q0, p0
   - X on q1, p0
   - Y on q2, p0
   - Z on q3, p0
3. ✅ Verify all 4 gates rendered
4. Press Cmd+Z (undo)
5. ✅ Verify Z gate disappears
6. Press Cmd+Z three more times
7. ✅ Verify all gates removed
8. Press Cmd+Shift+Z (redo) four times
9. ✅ Verify all gates reappear in original positions

**Zundo State Inspection**:
```typescript
// Open browser console, inspect Zustand DevTools
const store = useCircuitStore.temporal.getState();

// After adding 4 gates:
store.pastStates.length  // 4 (each gate addition recorded)
store.futureStates.length  // 0 (nothing undone yet)

// After 2 undos:
store.pastStates.length  // 2
store.futureStates.length  // 2

// Verify history limit (50 actions):
for (let i = 0; i < 60; i++) {
  store.addGate({...});
}
store.pastStates.length  // Max 50 (oldest actions dropped)
```

**Part B: Grouping Algorithm**

**Code Walkthrough**:
```typescript
// src/features/circuit/store/circuitStore.ts:120-180
const group = (itemIds: string[], symbol: string, color: string) => {
  const { placedGates } = get();

  // Step 1: Find all gates to group
  const toGroup = placedGates.filter(g => itemIds.includes(g.id));

  // Step 2: Calculate bounding box
  const minQubit = Math.min(...toGroup.map(g => g.qubit));
  const maxQubit = Math.max(...toGroup.map(g => g.qubit));
  const minPos = Math.min(...toGroup.map(g => g.position));
  const maxPos = Math.max(...toGroup.map(g => g.position));

  // Step 3: Create group object
  const groupId = `group-${Date.now()}`;
  const group: GroupGate = {
    id: groupId,
    type: 'group',
    symbol,
    color,
    qubit: minQubit,
    position: minPos,
    width: maxPos - minPos + 1,
    height: maxQubit - minQubit + 1,
    gates: toGroup  // Embed original gates
  };

  // Step 4: Remove individual gates, add group
  const remaining = placedGates.filter(g => !itemIds.includes(g.id));
  set({
    placedGates: [...remaining, group]
  });

  // Zundo automatically records this state change
};
```

**Live Demo - Grouping**:
1. Build GHZ state circuit:
   ```
   q0: ─H─●─●─
          │ │
   q1: ───X─┼─
            │
   q2: ─────X─
   ```
2. Select all 4 gates (H, CNOT, CNOT)
3. Right-click → "Group" → Symbol: "GHZ" → Color: Purple
4. ✅ Verify purple box appears around gates with "GHZ" label
5. Press Cmd+Z
6. ✅ Verify grouping undone (gates back to individual)
7. Press Cmd+Shift+Z
8. ✅ Verify group restored

**Part C: Drag-and-Drop Integration**

**@dnd-kit Integration**:
```typescript
// src/features/circuit/components/CircuitComposer.tsx:80-120
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor)
);

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  if (!over) return;

  // Parse drop zone: "drop-q2-p5" → qubit=2, position=5
  const [_, qubit, position] = over.id.toString().split('-');

  // Get dragged gate
  const gate = active.data.current as Gate;

  // Update store (Zundo records this)
  setPlacedGates(prev => prev.map(g =>
    g.id === gate.id
      ? { ...g, qubit: parseInt(qubit), position: parseInt(position) }
      : g
  ));
};

return (
  <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
    <CircuitGrid />
    <GatePalette />
  </DndContext>
);
```

**Live Demo - Drag to Reposition**:
1. Drag H gate from position 0 to position 3
2. ✅ Verify gate moves smoothly
3. Press Cmd+Z
4. ✅ Verify gate returns to position 0
5. Try dragging to invalid position (off-grid)
6. ✅ Verify gate snaps back to original position

**✅ DEMO 6 COMPLETE**: Temporal state management with complex interactions
```

**Evidence**: Screen recording showing undo/redo + grouping in action

---

### **6.7 Demo 7: Complex Feature 3 - Multi-Provider OAuth**
*(1 page)*

**Objective**: Show Google + Microsoft OAuth with profile picture handling

**Demo Script**:

```markdown
### DEMO 7: Multi-Provider OAuth Federation

**Part A: Google OAuth Flow**

**Backend Endpoint**:
```python
# app/api/routes/auth.py:30-80
@router.get("/auth/google")
async def google_auth():
    """Redirect user to Google OAuth consent screen"""
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={settings.GOOGLE_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=openid email profile&"
        f"state={generate_random_state()}"
    )
    return RedirectResponse(google_auth_url)

@router.get("/auth/google/callback")
async def google_callback(code: str, state: str):
    """Exchange code for tokens, fetch user profile"""
    # Step 1: Exchange authorization code for access token
    token_response = await httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
    )
    tokens = token_response.json()

    # Step 2: Fetch user profile
    profile_response = await httpx.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    profile = profile_response.json()

    # Step 3: Create or update user in database
    user = await user_repo.find_by_email(profile["email"])
    if not user:
        user = await user_repo.create(User(
            email=profile["email"],
            name=profile["name"],
            profile_picture=profile["picture"],  # Direct URL from Google
            auth_provider="google"
        ))

    # Step 4: Generate JWT
    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    # Step 5: Redirect to frontend with tokens
    return RedirectResponse(
        f"{settings.FRONTEND_URL}/auth/callback?"
        f"access_token={access_token}&"
        f"refresh_token={refresh_token}"
    )
```

**Live Demo - Google**:
1. Click "Sign in with Google"
2. ✅ Verify redirect to accounts.google.com
3. Select account and authorize
4. ✅ Verify redirect back to frontend with tokens in URL
5. ✅ Verify header displays Google profile picture
6. Open browser DevTools → Application → Local Storage
7. ✅ Verify tokens stored:
   ```json
   {
     "access_token": "eyJ...",
     "refresh_token": "eyJ...",
     "user": {
       "email": "demo@gmail.com",
       "name": "Demo User",
       "profile_picture": "https://lh3.googleusercontent.com/a/..."
     }
   }
   ```

**Part B: Microsoft OAuth with MSAL**

**Frontend - MSAL Configuration**:
```typescript
// src/lib/auth/msalConfig.ts
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin + '/auth/callback'
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false
  }
};

export const msalInstance = new PublicClientApplication(msalConfig);

// Login function
export const loginWithMicrosoft = async () => {
  const loginRequest = {
    scopes: ['openid', 'profile', 'email', 'User.Read']  // User.Read for profile picture
  };

  const response = await msalInstance.loginPopup(loginRequest);
  return response;
};
```

**Backend - Microsoft Profile Picture Handling**:
```python
# app/api/routes/auth.py:150-200
@router.post("/auth/microsoft")
async def microsoft_auth(token: str):
    """Verify Microsoft token and fetch profile"""
    # Step 1: Verify ID token
    try:
        decoded = jwt.decode(
            token,
            options={"verify_signature": False}  # MSAL already verified
        )
    except:
        raise HTTPException(401, "Invalid token")

    # Step 2: Fetch profile picture from Microsoft Graph API
    graph_response = await httpx.get(
        "https://graph.microsoft.com/v1.0/me/photo/$value",
        headers={"Authorization": f"Bearer {token}"}
    )

    if graph_response.status_code == 200:
        # Upload photo to our storage (e.g., S3)
        photo_url = await upload_profile_picture(
            graph_response.content,
            filename=f"profile_{decoded['sub']}.jpg"
        )
    else:
        # Microsoft Graph API may fail if no photo set
        photo_url = None

    # Step 3: Create/update user
    user = await user_repo.find_by_email(decoded["email"])
    if not user:
        user = await user_repo.create(User(
            email=decoded["email"],
            name=decoded["name"],
            profile_picture=photo_url,  # Our hosted URL (not Microsoft's)
            auth_provider="microsoft"
        ))

    # Step 4: Generate JWT
    access_token = create_access_token(str(user.id))
    return {"access_token": access_token}
```

**Live Demo - Microsoft**:
1. Click "Sign in with Microsoft"
2. ✅ Verify MSAL popup opens
3. Sign in with Microsoft account
4. ✅ Verify profile picture appears (or default avatar if none set)
5. Open MongoDB Compass, inspect users collection:
   ```json
   {
     "_id": "...",
     "email": "demo@outlook.com",
     "auth_provider": "microsoft",
     "profile_picture": "https://qubit-storage.s3.amazonaws.com/profile_xyz.jpg"
   }
   ```

**Part C: Email Verification (Google OAuth Only)**

**Email Verification Flow**:
```python
# app/api/routes/auth.py:250-300
@router.post("/auth/send-verification")
async def send_verification_email(user_id: str):
    """Send email verification link"""
    user = await user_repo.get(user_id)

    # Generate verification token (expires in 1 hour)
    token = create_verification_token(user_id, expire_hours=1)

    # Send email via Resend
    await resend.emails.send({
        "from": "noreply@qubit.app",
        "to": user.email,
        "subject": "Verify your Qubit account",
        "html": f"""
            <h1>Welcome to Qubit!</h1>
            <p>Click the link below to verify your email:</p>
            <a href="{settings.FRONTEND_URL}/auth/verify?token={token}">
                Verify Email
            </a>
        """
    })

    # Store verification token in MongoDB with TTL index
    await db.verification_tokens.insert_one({
        "user_id": user_id,
        "token": token,
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(hours=1)
    })

    # MongoDB TTL index automatically deletes expired tokens:
    # db.verification_tokens.create_index("expires_at", expireAfterSeconds=0)

@router.get("/auth/verify")
async def verify_email(token: str):
    """Verify email token and activate account"""
    record = await db.verification_tokens.find_one({"token": token})
    if not record or record["expires_at"] < datetime.now():
        raise HTTPException(400, "Token expired or invalid")

    # Mark user as verified
    await user_repo.update(record["user_id"], {"email_verified": True})

    # Delete token
    await db.verification_tokens.delete_one({"token": token})

    return {"message": "Email verified successfully"}
```

**Live Demo - Email Verification**:
1. Register with Google OAuth (unverified user created)
2. ✅ Check email inbox for verification link
3. Click verification link
4. ✅ Verify redirect to frontend with success message
5. Inspect MongoDB:
   ```json
   // Before verification:
   {"email_verified": false}

   // After verification:
   {"email_verified": true}

   // verification_tokens collection:
   [] // Empty (token deleted after use)
   ```

**✅ DEMO 7 COMPLETE**: Multi-provider OAuth with advanced features
```

**Evidence**: Screenshots of Google/Microsoft login + MongoDB user records

---

### **6.8 Demo 8: Testing & Advanced Functionality**
*(1 page)*

**Objective**: Demonstrate test suite execution and advanced features

**Demo Script**:

```markdown
### DEMO 8: Testing & Advanced Features

**Part A: Run Backend Test Suite**

**Execute Tests**:
```bash
# Terminal 1: Start backend
cd backend
poetry run uvicorn app.main:app --reload

# Terminal 2: Run tests
poetry run pytest tests/ -v --cov=app --cov-report=html

# Expected output:
tests/unit/test_security.py::test_create_access_token PASSED       [5%]
tests/unit/test_circuit_validator.py::test_valid_bell_state PASSED [10%]
tests/integration/test_auth_flow.py::test_google_oauth_callback PASSED [50%]
tests/advanced/test_ssh_pool_concurrency.py::test_connection_pool PASSED [95%]

========== 48 passed, 2 warnings in 12.34s ==========

Coverage Report:
app/core/security.py        87%
app/services/ssh_manager.py 75%
app/api/routes/jobs.py      82%
```
✅ **Verify**: All tests pass, coverage > 70%

**Open Coverage Report**:
```bash
open htmlcov/index.html  # macOS
```
✅ **Inspect**: Red-highlighted lines show uncovered code branches

**Part B: Run Frontend Tests**

**Execute Tests**:
```bash
cd frontend
npm run test:coverage

# Expected output:
✓ src/features/circuit/store/__tests__/useCircuitStore.test.ts (4)
✓ src/features/auth/components/__tests__/GoogleAuthButton.test.tsx (2)
✓ src/lib/websocket/__tests__/WebSocketProvider.test.tsx (3)

Test Files  12 passed (12)
     Tests  48 passed (48)
  Duration  3.45s

Coverage summary:
Statements   : 72.5% ( 450/620 )
Branches     : 68.3% ( 102/149 )
Functions    : 75.2% ( 85/113 )
Lines        : 74.1% ( 420/567 )
```
✅ **Verify**: All component tests pass

**Part C: Manual Integration Test**

**Full Workflow Test**:
1. **Setup**: Clean database, restart servers
2. **Step 1**: Register with Google OAuth
   - ✅ User created in MongoDB
   - ✅ JWT tokens returned
3. **Step 2**: Create project "Integration Test"
   - ✅ POST /api/projects returns 201
   - ✅ Project appears in UI
4. **Step 3**: Build 3-qubit QFT circuit
   - ✅ 10 gates placed (H, controlled rotations, swaps)
   - ✅ Circuit saved to database
5. **Step 4**: Submit job to quantum simulator
   - ✅ WebSocket connects
   - ✅ Job status updates: Queued → Running → Completed
   - ✅ Console shows SSH output in real-time
6. **Step 5**: View results
   - ✅ All 7 visualization types render
   - ✅ Probability sums to 100%
7. **Step 6**: Edit circuit (add measurement)
   - ✅ Undo/redo works
   - ✅ Changes persisted
8. **Step 7**: Re-run modified circuit
   - ✅ New job created
   - ✅ Results differ from previous run

✅ **Complete Workflow**: End-to-end success

**Part D: Advanced Features Demo**

**Feature 1: Circuit Export to QASM**
```python
# In Python console or Jupyter notebook
from app.models.circuit import Circuit

circuit = Circuit(
    qubits=2,
    gates=[
        {"type": "H", "qubit": 0, "position": 0},
        {"type": "CNOT", "control": 0, "target": 1, "position": 1}
    ]
)

qasm = circuit.to_qasm()
print(qasm)

# Output:
"""
OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
creg c[2];
h q[0];
cx q[0],q[1];
measure q -> c;
"""
```
✅ **Verify**: QASM format correct, can import into Qiskit

**Feature 2: Job Cancellation**
```typescript
// In browser console
const cancelJob = async (jobId: string) => {
  const response = await fetch(`http://localhost:8000/api/jobs/${jobId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
  });
  return response.json();
};

// Cancel running job
await cancelJob('job_abc123');
```
✅ **Verify**: Job status changes to "cancelled", SSH process killed

**Feature 3: Dark Mode Toggle**
```typescript
// In browser console or UI settings
document.documentElement.classList.toggle('dark');
```
✅ **Verify**: All components switch to dark color scheme

**Feature 4: Circuit Code Editor (Monaco)**
```typescript
// Open circuit code tab in UI
// Verify Monaco editor displays circuit as Python code:
from qiskit import QuantumCircuit

qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)
qc.measure_all()
```
✅ **Verify**: Syntax highlighting, autocompletion work

**✅ DEMO 8 COMPLETE**: Comprehensive testing and advanced feature validation
```

**Evidence**: Test output screenshots, coverage reports, feature recordings

---

### **6.9 Summary of Demonstrations**

| Demo | Requirement Validated | Key Evidence |
|------|----------------------|--------------|
| 1 | Basic functionality | End-to-end workflow success |
| 2 | OOP Modeling (Exam) | UML diagrams match code |
| 3 | OOP Languages (Exam) | Inheritance, polymorphism, DI |
| 4 | Data Structures (Exam) | DAG, stacks, hash maps |
| 5 | Complex Feature 1 | SSH+WebSocket real-time pipeline |
| 6 | Complex Feature 2 | Undo/redo with Zundo |
| 7 | Complex Feature 3 | Multi-provider OAuth |
| 8 | Testing + Advanced | 70%+ coverage, advanced features |

**Submission Checklist**:
- [ ] All 8 demo scripts documented with expected outcomes
- [ ] Screenshots/videos captured for each demo
- [ ] Test suite execution logs included
- [ ] Coverage reports generated
- [ ] Known issues documented in demo notes

---

---

## **BIBLIOGRAPHY STARTER LIST**
*(Compiled from all technology citations)*

**35+ IEEE-formatted citations for thesis references**

### **Frontend Technologies**

[1] "React - A JavaScript library for building user interfaces," Meta Platforms, Inc., 2024. [Online]. Available: https://react.dev/. [Accessed: Nov. 11, 2025].

[2] "TypeScript - JavaScript with syntax for types," Microsoft Corporation, 2024. [Online]. Available: https://www.typescriptlang.org/. [Accessed: Nov. 11, 2025].

[3] "Vite - Next Generation Frontend Tooling," Evan You, 2024. [Online]. Available: https://vitejs.dev/. [Accessed: Nov. 11, 2025].

[4] "Zustand - Bear necessities for state management in React," Poimandres, 2024. [Online]. Available: https://github.com/pmndrs/zustand. [Accessed: Nov. 11, 2025].

[5] "Zundo - Enable time-travel in your apps," Charkour, 2024. [Online]. Available: https://github.com/charkour/zundo. [Accessed: Nov. 11, 2025].

[6] "Radix UI - Unstyled, accessible components for building design systems," WorkOS, 2024. [Online]. Available: https://www.radix-ui.com/. [Accessed: Nov. 11, 2025].

[7] "Tailwind CSS - Utility-first CSS framework," Tailwind Labs, 2024. [Online]. Available: https://tailwindcss.com/. [Accessed: Nov. 11, 2025].

[8] M. Bostock, "D3.js - Data-Driven Documents," IEEE Trans. Vis. Comput. Graph., vol. 17, no. 12, pp. 2301-2309, Dec. 2011. [Online]. Available: https://d3js.org/.

[9] "Plotly.js - JavaScript graphing library," Plotly Technologies Inc., 2024. [Online]. Available: https://plotly.com/javascript/. [Accessed: Nov. 11, 2025].

[10] "Monaco Editor - The code editor that powers VS Code," Microsoft Corporation, 2024. [Online]. Available: https://microsoft.github.io/monaco-editor/. [Accessed: Nov. 11, 2025].

[11] "dnd kit - Modern drag and drop toolkit for React," Claudéric Demers, 2024. [Online]. Available: https://dndkit.com/. [Accessed: Nov. 11, 2025].

### **Backend Technologies**

[12] S. Ramirez, "FastAPI - Modern, fast web framework for building APIs with Python," 2024. [Online]. Available: https://fastapi.tiangolo.com/. [Accessed: Nov. 11, 2025].

[13] "Pydantic - Data validation using Python type hints," Samuel Colvin, 2024. [Online]. Available: https://docs.pydantic.dev/. [Accessed: Nov. 11, 2025].

[14] "MongoDB - NoSQL document database," MongoDB, Inc., 2024. [Online]. Available: https://www.mongodb.com/. [Accessed: Nov. 11, 2025].

[15] "PyMongo - Python distribution containing tools for working with MongoDB," MongoDB, Inc., 2024. [Online]. Available: https://pymongo.readthedocs.io/. [Accessed: Nov. 11, 2025].

[16] "Paramiko - Python implementation of SSHv2 protocol," Jeff Forcier, 2024. [Online]. Available: https://www.paramiko.org/. [Accessed: Nov. 11, 2025].

[17] "python-jose - JavaScript Object Signing and Encryption for Python," Michael Davis, 2024. [Online]. Available: https://github.com/mpdavis/python-jose. [Accessed: Nov. 11, 2025].

[18] "Passlib - Password hashing library for Python," Eli Collins, 2024. [Online]. Available: https://passlib.readthedocs.io/. [Accessed: Nov. 11, 2025].

### **Authentication & Authorization**

[19] "Google Identity Platform - OAuth 2.0 implementation," Google LLC, 2024. [Online]. Available: https://developers.google.com/identity. [Accessed: Nov. 11, 2025].

[20] "Microsoft Authentication Library (MSAL) for JavaScript," Microsoft Corporation, 2024. [Online]. Available: https://github.com/AzureAD/microsoft-authentication-library-for-js. [Accessed: Nov. 11, 2025].

[21] D. Hardt, "The OAuth 2.0 Authorization Framework," RFC 6749, Oct. 2012. [Online]. Available: https://www.rfc-editor.org/rfc/rfc6749.

[22] M. Jones, J. Bradley, and N. Sakimura, "JSON Web Token (JWT)," RFC 7519, May 2015. [Online]. Available: https://www.rfc-editor.org/rfc/rfc7519.

### **Quantum Computing**

[23] H. Abraham et al., "Qiskit: An open-source framework for quantum computing," Zenodo, Mar. 2024. [Online]. Available: https://qiskit.org/. DOI: 10.5281/zenodo.2573505.

[24] M. A. Nielsen and I. L. Chuang, *Quantum Computation and Quantum Information*, 10th Anniversary ed. Cambridge, UK: Cambridge University Press, 2010.

[25] J. Preskill, "Quantum Computing in the NISQ era and beyond," Quantum, vol. 2, p. 79, Aug. 2018. DOI: 10.22331/q-2018-08-06-79.

### **Software Engineering Concepts**

[26] M. Fowler, *Patterns of Enterprise Application Architecture*, Boston, MA: Addison-Wesley, 2002.

[27] E. Gamma, R. Helm, R. Johnson, and J. Vlissides, *Design Patterns: Elements of Reusable Object-Oriented Software*, Reading, MA: Addison-Wesley, 1994.

[28] R. C. Martin, *Clean Architecture: A Craftsman's Guide to Software Structure and Design*, Upper Saddle River, NJ: Prentice Hall, 2017.

[29] "UML 2.5.1 Specification," Object Management Group, Dec. 2017. [Online]. Available: https://www.omg.org/spec/UML/2.5.1/.

### **Testing & Development Tools**

[30] "pytest - Mature full-featured Python testing tool," Holger Krekel, 2024. [Online]. Available: https://docs.pytest.org/. [Accessed: Nov. 11, 2025].

[31] "Vitest - Blazing Fast Unit Test Framework," Anthony Fu, 2024. [Online]. Available: https://vitest.dev/. [Accessed: Nov. 11, 2025].

[32] "React Testing Library - Simple and complete testing utilities," Kent C. Dodds, 2024. [Online]. Available: https://testing-library.com/react. [Accessed: Nov. 11, 2025].

[33] "Git - Distributed version control system," Software Freedom Conservancy, 2024. [Online]. Available: https://git-scm.com/. [Accessed: Nov. 11, 2025].

### **Web Standards & Protocols**

[34] I. Fette and A. Melnikov, "The WebSocket Protocol," RFC 6455, Dec. 2011. [Online]. Available: https://www.rfc-editor.org/rfc/rfc6455.

[35] "HTML Living Standard - Web Sockets," WHATWG, 2024. [Online]. Available: https://html.spec.whatwg.org/multipage/web-sockets.html.

[36] R. Fielding, "Representational State Transfer (REST)," Ph.D. dissertation, Univ. California, Irvine, 2000. [Online]. Available: https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm.

---

---

## **TIMELINE SUGGESTION**

**Estimated time to write each section (assumes implementation complete)**

| Section | Pages | Estimated Time | Priority |
|---------|-------|----------------|----------|
| 1. Introduction | 5 | 3-4 hours | HIGH |
| 2. User Documentation | 20-25 | 10-12 hours | MEDIUM |
| 3. Solution Plan | 10-12 | 8-10 hours | HIGH |
| 4. Realization | 10-12 | 8-10 hours | HIGH |
| 5. Testing | 15-20 | 12-15 hours | HIGH |
| 6. Demonstrations | 6-8 | 6-8 hours | CRITICAL |
| Bibliography | 2 | 2 hours | LOW |
| Formatting/Figures | N/A | 5-6 hours | MEDIUM |
| **TOTAL** | **95-120** | **60-75 hours** | - |

**Recommended Schedule (8 weeks)**:
- **Weeks 1-2**: Sections 1, 3, 4 (foundation, design, implementation)
- **Weeks 3-4**: Section 5 (testing - run tests, capture evidence)
- **Week 5**: Section 2 (user documentation - screenshots)
- **Week 6**: Section 6 (demonstrations - record videos)
- **Week 7**: Bibliography, formatting, figure integration
- **Week 8**: Review, revisions, final polish

---

## **PRIORITY ORDER**

**Recommended writing sequence (by evaluation requirement)**:

1. **REQUIREMENT 6 (Testing)** - Do this FIRST while code is fresh
   - Run all tests NOW, capture outputs
   - Document any test failures and fixes
   - Generate coverage reports

2. **REQUIREMENT 7 (Demonstrations)** - Do this SECOND
   - Record demo videos before code changes
   - Ensure reproducibility of all 8 demos

3. **REQUIREMENT 1 (Exam Topics)** - Foundation for other sections
   - Map UML diagrams to code
   - Establish technical vocabulary

4. **REQUIREMENT 4 (Solution Plan)** - Use existing UML diagrams
   - Mostly just explaining existing diagrams
   - Reference diagrams created during development

5. **REQUIREMENT 5 (Realization)** - Extract from codebase
   - Copy-paste code examples
   - Add explanatory comments

6. **REQUIREMENT 3 (User Documentation)** - Time-consuming but straightforward
   - Take screenshots systematically
   - Follow feature-by-feature structure

7. **REQUIREMENT 2 (Structure/Language)** - Do LAST
   - Final formatting pass
   - Add table of contents
   - Check citations

---

## **COMMON PITFALLS & WARNINGS**

### **Pitfall 1: Insufficient Testing Documentation**
**Problem**: Students often write only 5-6 pages of testing (minimum is 10)
**Solution**:
- Include test code snippets (not just descriptions)
- Add screenshots of test outputs
- Document BOTH passing and failing tests
- Explain WHY you chose certain test cases

### **Pitfall 2: Missing Complex Feature Justification**
**Problem**: Claiming a feature is "complex" without technical proof
**Solution**:
- Show specific code that demonstrates complexity
- Explain WHAT makes it challenging (concurrency, state management, protocols)
- Compare to simpler alternatives

### **Pitfall 3: UML Diagrams Don't Match Code**
**Problem**: Creating UML diagrams that look nice but don't reflect actual implementation
**Solution**:
- Generate diagrams FROM code when possible
- Include file paths and line numbers in diagram captions
- Update diagrams when code changes

### **Pitfall 4: User Documentation Without Screenshots**
**Problem**: Describing features without visual proof
**Solution**:
- Every feature needs AT LEAST one screenshot
- Use annotations (arrows, highlights) to explain UI elements
- Show both successful and error states

### **Pitfall 5: Incomplete Demonstration Scripts**
**Problem**: Vague "Demo: Show the app works" without steps
**Solution**:
- Write step-by-step scripts with expected outcomes
- Include ✅ checkpoints for verification
- Record videos as evidence

### **Pitfall 6: Missing Bibliography Citations**
**Problem**: Using technologies without citing official documentation
**Solution**:
- Cite EVERY framework, library, and tool
- Use IEEE format consistently
- Include access dates for online sources

### **Pitfall 7: Poor Time Management**
**Problem**: Spending 80% of time on implementation, 20% on documentation
**Solution**:
- Start documentation DURING development
- Write tests BEFORE implementing features (TDD)
- Take screenshots as you build features

---

## **FINAL CHECKLIST FOR 30/30 POINTS**

### **REQUIREMENT 1: Exam Topics (4 points)**
- [ ] OOP Modeling: 3+ UML diagrams included and explained
- [ ] OOP Languages: Code examples show inheritance, polymorphism, encapsulation
- [ ] Data Structures: DAG, stacks, hash maps demonstrated with code

### **REQUIREMENT 2: Structure/Language/Appearance (3 points)**
- [ ] Table of contents with page numbers
- [ ] Consistent formatting (fonts, margins, headings)
- [ ] All figures numbered and captioned (e.g., "Figure 3.2: Class Diagram")
- [ ] Bibliography in IEEE format
- [ ] No grammatical errors (proofread!)

### **REQUIREMENT 3: User Documentation (4 points)**
- [ ] Minimum 20 pages (ideally 25+ for safety margin)
- [ ] Covers: Installation, Configuration, All Features, Troubleshooting
- [ ] 15+ screenshots showing actual UI
- [ ] Step-by-step guides for common workflows

### **REQUIREMENT 4: Solution Plan (4 points)**
- [ ] Minimum 10 pages (ideally 12+ for safety margin)
- [ ] Includes: Static diagrams (class, component), Dynamic diagrams (sequence, state), Use cases, UI design
- [ ] All 13 existing UML diagrams referenced
- [ ] Architecture decisions justified

### **REQUIREMENT 5: Realization (4 points)**
- [ ] Minimum 10 pages (ideally 12+ for safety margin)
- [ ] Section 4.2 cites 30+ technologies (you have 40 ✅)
- [ ] Code examples for basic AND complex features
- [ ] Known bugs documented
- [ ] Future enhancements listed

### **REQUIREMENT 6: Testing (5 points)**
- [ ] Minimum 10 pages (ideally 15-20 for thoroughness)
- [ ] 4 categories: UI, Unit, Integration, Advanced
- [ ] Test code snippets included
- [ ] Coverage reports attached
- [ ] Test output screenshots

### **REQUIREMENT 7: Demonstrations (5 points)**
- [ ] 8 demo scripts completed
- [ ] Each demo has step-by-step instructions
- [ ] Evidence (screenshots/videos) for each demo
- [ ] All demos reproducible

### **Overall Checklist**
- [ ] Total pages: 95-120 (within target range)
- [ ] All 30 points addressable in submitted thesis
- [ ] Bibliography has 35+ entries
- [ ] All code references include file paths and line numbers
- [ ] Thesis compiles to PDF without errors

---

## **END OF PART 4**

**Summary of All 4 Parts**:
- **PART 1**: Requirements 1-3 (Exam topics, Structure, User Documentation up to 2.1.6)
- **PART 2**: Requirement 3 continued (User Documentation 2.2-2.5) + Requirement 4 partial (Solution Plan 3.1-3.7.4)
- **PART 3**: Requirement 5 (Realization/Implementation 4.1-4.5.5)
- **PART 4**: Requirement 6 (Testing 5.1-5.6) + Requirement 7 (Demonstrations 6.1-6.9) + Bibliography + Timeline + Pitfalls + Checklist

**Your thesis outline is now COMPLETE! You have a comprehensive roadmap covering all 7 evaluation requirements (30 points total) with 95-120 pages of structured content.**

**Next Steps**:
1. Review all 4 parts for consistency
2. Begin writing sections in priority order (Testing → Demos → Exam Topics → Solution Plan → Realization → User Documentation → Formatting)
3. Use this outline as your thesis table of contents
4. Populate each section with actual content from your codebase
5. Proofread and format according to REQUIREMENT 2 guidelines

**This outline should give you a strong foundation for a 30/30 submission.** 🎓