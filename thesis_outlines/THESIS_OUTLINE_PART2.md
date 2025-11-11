# COMPREHENSIVE THESIS OUTLINE FOR QUBIT PROJECT - PART 2

**[CONTINUATION FROM PART 1]**

---

### **2.2. Usage Instructions (16-18 pages)** *(Continued from Part 1)*

**Purpose**: Step-by-step guide for all major features with screenshots, workflows, and troubleshooting.

**Page Count**: 16-18 pages

---

#### **2.2.2. Feature-by-Feature Guides (10 pages)** *(Continued)*

---

**2.2.2.3. Quantum Circuit Composer (4 pages)** *(Continued)*

**D. Grouping and Ungrouping Gates (Nested Circuits) (0.5 pages)**

**Purpose**: Create reusable circuit components (subcircuits) for complex designs.

**Creating a Circuit Group:**
1. **Select Gates**: Click-and-drag selection box around multiple gates, or Shift+Click individual gates
2. **Group Action**:
   - **Method 1**: Right-click selection → "Group into Circuit"
   - **Method 2**: Press Ctrl/Cmd + G
3. **Group Dialog**:
   - **Symbol**: Enter a short label (e.g., "QFT", "Grover", "Bell") - shown on circuit
   - **Color**: Choose color for visual distinction (e.g., blue for QFT, green for Grover)
   - Click "Create"
4. **Result**: Selected gates replaced with single "circuit block" spanning required qubits
   - Block shows custom symbol and color
   - Click block to expand/collapse nested view

**Screenshot: Group creation dialog with symbol and color picker**

**Nested Circuit Display:**
- **Collapsed View**: Shows circuit symbol on canvas (compact)
- **Expanded View**: Click circuit block → Toggle "Show Nested Circuit" → Gates inside become visible (grayed out to distinguish from main circuit)

**Screenshot: Nested circuit in expanded view**

**Ungrouping a Circuit:**
1. **Select Circuit Block**: Click on grouped circuit
2. **Ungroup Action**:
   - **Method 1**: Right-click → "Ungroup Circuit"
   - **Method 2**: Press Ctrl/Cmd + Shift + G
3. **Result**: Circuit block replaced with original gates at same depth/qubit positions

**Use Cases:**
- **Reusable Patterns**: Group frequently used gate sequences (Bell state, QFT)
- **Hierarchical Design**: Build complex circuits from smaller modules
- **Visual Clarity**: Reduce clutter by grouping related gates

---

**E. Working with Measurements (0.5 pages)**

**Adding Measurements:**
- **Method 1**: Click "Measurement" toggle button for each qubit in toolbar
- **Method 2**: Click measurement icon at end of qubit line (meter symbol)
- **Result**: Measurement gate appears at rightmost position on qubit

**Measurement Icon**: Classical measurement gate (meter symbol) indicating qubit collapse

**Removing Measurements:**
- Click measurement icon again to toggle off

**Measurement Behavior:**
- All measurements occur at end of circuit (final depth)
- Measured qubits collapse to classical bits (0 or 1)
- Simulation returns measurement counts (e.g., {"00": 502, "11": 498} for 1000 shots)

**Screenshot: Circuit with measurements on qubits 0 and 1**

---

**F. Keyboard Shortcuts (0.5 pages)**

**Essential Shortcuts:**

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| **Undo** | Ctrl + Z | Cmd + Z |
| **Redo** | Ctrl + Shift + Z or Ctrl + Y | Cmd + Shift + Z |
| **Delete Selection** | Delete or Backspace | Delete or Backspace |
| **Select All** | Ctrl + A | Cmd + A |
| **Copy** | Ctrl + C | Cmd + C |
| **Paste** | Ctrl + V | Cmd + V |
| **Duplicate** | Ctrl + D | Cmd + D |
| **Group Gates** | Ctrl + G | Cmd + G |
| **Ungroup Circuit** | Ctrl + Shift + G | Cmd + Shift + G |
| **Save** | Ctrl + S | Cmd + S |
| **Toggle Inspector** | Ctrl + I | Cmd + I |
| **Toggle QASM View** | Ctrl + Q | Cmd + Q |

**Navigation Shortcuts:**
- **Zoom In**: Ctrl/Cmd + Plus or Scroll Up
- **Zoom Out**: Ctrl/Cmd + Minus or Scroll Down
- **Reset Zoom**: Ctrl/Cmd + 0 (zero)
- **Pan Canvas**: Hold Space + Drag

---

**2.2.2.4. Circuit Execution (2 pages)**

**Purpose**: Submit circuits for remote simulation and monitor job progress.

---

**A. Job Submission (0.5 pages)**

**Step 1: Finalize Circuit**
- Ensure circuit is complete (gates placed, measurements added)
- Check circuit validity:
  - No overlapping gates
  - Control qubits connected to targets
  - At least one gate in circuit

**Step 2: Click "Execute" or "Run Partition"**
- **Execute Button**: Located in top toolbar (play icon ▶)
- **Partition Options** (if available):
  - Click dropdown arrow next to Execute
  - Choose partition strategy:
    - **kahn**: Topological sort-based partitioning
    - **ilp**: Integer Linear Programming (optimal, slower)
    - **ilp-fusion**: ILP with gate fusion optimization
    - **tdag**: T-depth-aware grouping
    - **gtqcp**: Graph theory-based partitioning
    - **qiskit**: Qiskit transpiler-based
    - **bqskit-***: Berkeley Quantum Synthesis Toolkit variants
  - Set **Max Partition Size**: Number of qubits per partition (default: 4)
  - Click "Start Partition"

**Screenshot: Execute button with partition options dropdown**

**Step 3: Job Submission Confirmation**
- Toast notification appears: "Job submitted: Partition job [job-id]"
- Job added to job queue (visible in status bar or job panel)

---

**B. Monitoring Progress (1 page)**

**Real-time Job Updates:**

**Job Status Indicator:**
- **Location**: Status bar (bottom) or dedicated job panel (side panel)
- **Job Card Shows**:
  - Job ID (short UUID)
  - Job Type (Partition, Import)
  - Circuit Name
  - Status (Pending, Running, Complete, Error)
  - Progress Bar (0-100%)
  - Current Phase (e.g., "Uploading circuit", "Executing SQUANDER")

**Screenshot: Job panel showing running job with progress bar**

**Job Phases (11 total):**
1. **Preparing** (5%): Validating circuit, serializing to QASM
2. **Connecting** (10%): Establishing SSH connection to SQUANDER server
3. **Uploading** (20%): Transferring circuit file to remote server
4. **Queued** (25%): Job waiting in remote queue
5. **Executing** (30-80%): SQUANDER running partition algorithm (progress updates every few seconds)
6. **Downloading** (85%): Fetching results from server
7. **Processing** (90%): Parsing results, computing state vectors
8. **Visualizing** (95%): Generating charts (probabilities, density matrix, etc.)
9. **Saving** (98%): Persisting results to MongoDB
10. **Complete** (100%): Job finished successfully
11. **Error** (if failed): Error message displayed

**Live Log Stream:**
- Expand job card to see detailed logs
- Shows SQUANDER output in real-time (e.g., "Partition 1: 3 gates on 2 qubits")

**Screenshot: Expanded job card with live log stream**

---

**C. Viewing Results (0.5 pages)**

**After Job Completion:**
1. **Success Notification**: Toast shows "Job completed successfully" with summary:
   - Fidelity: 0.99999 (similarity between original and partitioned circuit)
   - Execution time: 12.4 seconds
   - Partitions created: 3 partitions
2. **Results Panel Opens**: Right sidebar switches to "Results" tab automatically
3. **Results Available**:
   - State vector visualization
   - Measurement histogram
   - Density matrix heatmap
   - Entanglement entropy chart
   - Probability comparison (original vs partitioned)
   - Partition distribution histogram

**Navigation:**
- Click "View Results" button in job card
- Or navigate to Results panel manually (right sidebar → Results tab)

**(Detailed results visualization guide in §2.2.2.5 below)**

---

**D. Cancelling Jobs (0.5 pages)**

**How to Cancel:**
1. Locate running job in job panel
2. Click **"Cancel"** button (X icon or "Cancel Job" button)
3. Confirmation dialog: "Are you sure you want to cancel this job?"
4. Click "Confirm"

**What Happens:**
- Frontend sends cancel request to backend via API
- Backend terminates SSH process on remote server
- Job status changes to "Cancelled" (or "Error: Cancelled by user")
- Partial results (if any) are discarded
- WebSocket room cleaned up

**When to Cancel:**
- Job taking too long (>10 minutes may indicate server issue)
- Wrong partition strategy selected
- Circuit has errors discovered after submission

**Screenshot: Job cancellation confirmation dialog**

---

**2.2.2.5. Results Visualization (2.5 pages)**

**Purpose**: Understand and interpret quantum simulation results through interactive visualizations.

---

**A. Visualization Types Overview (0.5 pages)**

**Results Panel Layout:**
- **Location**: Right sidebar, "Results" tab
- **Structure**: Tabbed interface with 7 visualization types
- **Tabs**:
  1. Overview (summary statistics)
  2. State Vector
  3. Measurement Histogram
  4. Density Matrix
  5. Entanglement Entropy
  6. Probability Comparison
  7. Partition Info

**Screenshot: Results panel with tab navigation**

---

**B. Overview Tab (0.5 pages)**

**Summary Statistics:**
- **Circuit Info**:
  - Number of qubits: 3
  - Number of gates: 5
  - Circuit depth: 3
- **Simulation Info**:
  - Partition strategy: kahn
  - Max partition size: 4
  - Number of partitions: 2
  - Execution time: 12.4s
- **Quality Metrics**:
  - Fidelity: 0.999999 (6 nines, excellent)
  - Max probability difference: 0.0002
  - Mean probability difference: 0.00005

**Interpretation:**
- **Fidelity close to 1.0**: Partitioned circuit accurately represents original
- **Low probability difference**: Measurement outcomes nearly identical

---

**C. State Vector Visualization (0.5 pages)**

**What is a State Vector?**
- Complex vector representing quantum state: |ψ⟩ = α₀|000⟩ + α₁|001⟩ + ... + α₇|111⟩
- Each amplitude αᵢ is a complex number (real + imaginary parts)

**Visualization:**
- **Bar Chart**: Magnitude and phase of each basis state
  - X-axis: Basis states (|000⟩, |001⟩, ..., |111⟩)
  - Y-axis (left): Magnitude |αᵢ| (height of bar)
  - Y-axis (right): Phase arg(αᵢ) (color or secondary bar)
- **Table**: Numerical values for each amplitude
  - Columns: Basis State, Real, Imaginary, Magnitude, Phase
  - Example: |00⟩: 0.707 + 0.000i, Magnitude: 0.707, Phase: 0°

**Interactive Features:**
- Hover over bar to see exact values
- Toggle between magnitude and phase views
- Download data as CSV

**Screenshot: State vector bar chart with magnitude and phase**

---

**D. Measurement Histogram (0.5 pages)**

**What is Measured?**
- After measuring qubits, quantum state collapses to classical bit string (e.g., "101")
- Simulation samples 10,000 shots (default) to estimate probability distribution

**Visualization:**
- **Bar Chart**: Count of each measurement outcome
  - X-axis: Bit strings (00, 01, 10, 11 for 2 qubits)
  - Y-axis: Number of occurrences (out of 10,000 shots)
- **Example**: Bell state |00⟩+|11⟩ → ~50% "00", ~50% "11", 0% "01" and "10"

**Interactive Features:**
- Hover to see exact counts and percentages
- Sort by count (descending/ascending)
- Filter to show only outcomes above threshold (e.g., >1%)

**Screenshot: Measurement histogram for Bell state**

---

**E. Density Matrix Heatmap (0.5 pages)**

**What is a Density Matrix?**
- Matrix representation of quantum state (handles mixed states)
- ρ = |ψ⟩⟨ψ| for pure states
- 2ⁿ × 2ⁿ matrix for n qubits

**Visualization:**
- **Heatmap**: Two panels (Real and Imaginary parts)
  - Rows/Columns: Basis states (|00⟩, |01⟩, |10⟩, |11⟩)
  - Color: Red (positive), Blue (negative), White (zero)
  - Intensity: Magnitude of matrix element

**Interpretation:**
- **Diagonal Elements**: Probabilities of basis states
- **Off-Diagonal Elements**: Quantum coherence (superposition)
- **Pure State**: Rank-1 matrix (only one non-zero eigenvalue)

**Interactive Features:**
- Toggle between Real, Imaginary, and Magnitude views
- Hover to see exact matrix element value
- Zoom/pan for large matrices (8+ qubits)

**Screenshot: Density matrix heatmap showing real and imaginary parts**

---

**F. Entanglement Entropy Chart (0.5 pages)**

**What is Entanglement Entropy?**
- Measure of quantum entanglement between subsystems
- von Neumann entropy: S = -Tr(ρ log₂ ρ) where ρ is reduced density matrix
- Higher entropy → more entanglement

**Visualization:**
- **Line Chart**: Entropy vs subsystem size
  - X-axis: Subsystem size (1, 2, ..., n-1 qubits)
  - Y-axis: Entanglement entropy (bits)
- **Example**: Bell state (2 qubits) → S(qubit 0) = 1 bit (maximal entanglement)

**Interpretation:**
- **Entropy = 0**: No entanglement (product state)
- **Entropy = log₂(dim)**: Maximal entanglement
- **Scaling**: Area law (shallow circuits) vs volume law (deep circuits)

**Interactive Features:**
- Hover to see entropy value for each subsystem size
- Compare original vs partitioned circuit entropy

**Screenshot: Entanglement entropy chart showing scaling**

---

**G. Probability Comparison (0.5 pages)**

**Purpose**: Compare measurement probabilities between original and partitioned circuits.

**Visualization:**
- **Grouped Bar Chart**: Side-by-side comparison
  - X-axis: Basis states
  - Y-axis: Probability (0 to 1)
  - Blue bars: Original circuit probabilities
  - Orange bars: Partitioned circuit probabilities
- **Difference Line**: Red line showing absolute difference |P_orig - P_part|

**Quality Indicator:**
- **Max Difference**: Largest probability discrepancy (goal: <0.001)
- **Mean Difference**: Average discrepancy (goal: <0.0001)

**Interpretation:**
- Bars nearly overlapping → high fidelity partition
- Large differences → partition introduces errors (try different strategy or smaller max partition size)

**Screenshot: Probability comparison chart**

---

**H. Partition Info Tab (0.5 pages)**

**Partition Details:**
- **Partition Distribution Histogram**:
  - X-axis: Partition index (1, 2, 3, ...)
  - Y-axis: Number of gates in partition
  - Shows workload balance across partitions
- **Partition List Table**:
  - Columns: Partition Index, Qubits, Gate Count, Gates (list)
  - Example: Partition 1: Qubits [0,1], 3 gates, [H, CNOT, RZ]

**Interactive Features:**
- Click partition in table to highlight corresponding gates on circuit canvas
- Export partition info as JSON

**Screenshot: Partition distribution histogram and partition table**

---

**2.2.2.6. Code Editor Features (1 page)**

**Purpose**: View and edit quantum circuits as QASM code.

---

**A. QASM Editor (0.5 pages)**

**Accessing QASM View:**
- Open Inspector Panel (right sidebar)
- Click "QASM" tab

**QASM Editor (Monaco Editor):**
- **Syntax Highlighting**: Keywords, gate names, comments
- **Line Numbers**: For easy reference
- **Error Detection**: Red underline for invalid QASM syntax
- **Auto-completion**: Suggests gate names, qubits
- **Read-Only Mode**: Default mode (view-only)
- **Edit Mode**: Click "Edit" button to enable editing (advanced users)

**Screenshot: QASM editor showing Bell state circuit**

**Example QASM Code:**
```
OPENQASM 2.0;
include "qelib1.inc";

qreg q[2];
creg c[2];

h q[0];
cx q[0],q[1];
measure q[0] -> c[0];
measure q[1] -> c[1];
```

---

**B. Editing QASM (0.5 pages)**

**Enabling Edit Mode:**
1. Click "Edit" button in QASM panel
2. Editor becomes editable (cursor appears)

**Editing:**
- Modify gate commands (e.g., change `h q[0];` to `x q[0];`)
- Add/remove gates
- Change qubit indices

**Applying Changes:**
1. Click "Apply" button
2. Parser validates QASM syntax
3. If valid:
   - Circuit canvas updates to reflect changes
   - Gates repositioned based on QASM order
4. If invalid:
   - Error message appears
   - Circuit not updated
   - Fix errors and try again

**Use Cases:**
- **Quick Edits**: Faster than drag-and-drop for simple changes
- **Import Circuits**: Paste QASM from external sources
- **Learning**: Understand QASM syntax by seeing code-to-circuit mapping

**Screenshot: QASM editor in edit mode with "Apply" and "Cancel" buttons**

---

**2.2.2.7. Theme and Language Settings (0.5 pages)**

**A. Theme Selection**

**Changing Theme:**
1. Click theme toggle icon in navigation bar (sun/moon icon)
2. Cycles through options:
   - **Light Mode**: White background, dark text
   - **Dark Mode**: Dark background, light text
   - **System**: Follows operating system preference

**Theme Persistence:**
- Selection saved to localStorage
- Persists across browser sessions

**Screenshot: Theme toggle with three options**

---

**B. Language Selection**

**Changing Language:**
1. Click language selector in navigation bar (flag icon or "EN" button)
2. Dropdown shows available languages:
   - 🇬🇧 English (en-US)
   - 🇩🇪 Deutsch (de) - German
   - 🇭🇺 Magyar (hu) - Hungarian
3. Click desired language
4. UI text updates immediately (navigation labels, buttons, tooltips)

**Internationalization Scope:**
- **Translated**: UI labels, button text, error messages, tooltips
- **Not Translated**: Code (QASM), gate names (H, CNOT, etc.), documentation content

**Screenshot: Language selector dropdown**

---

### **2.3. Common Workflows (2 pages)**

**Purpose**: Step-by-step guides for typical user scenarios.

---

#### **2.3.1. Creating and Running a Simple Circuit (1 page)**

**Scenario**: Create a Bell state circuit, simulate, and view results.

**Step-by-Step:**

1. **Login**: Navigate to Qubit application, sign in with preferred method
2. **Create Project**: Click "New Project" → Enter name "My Bell State" → Click "Create"
3. **Open Composer**: Project opens in composer view (empty 3-qubit canvas)
4. **Add Hadamard Gate**:
   - Locate H gate in Gates Panel (blue icon)
   - Drag H gate onto qubit 0, depth 0
5. **Add CNOT Gate**:
   - Locate CNOT gate (orange icon with dot and ⊕)
   - Drag CNOT onto depth 1, control on qubit 0, target on qubit 1
6. **Add Measurements**:
   - Click measurement toggle for qubit 0
   - Click measurement toggle for qubit 1
7. **Execute Circuit**:
   - Click "Execute" button in toolbar
   - Choose partition strategy (default: kahn) → Click "Start"
8. **Monitor Progress**:
   - Job panel shows progress (Preparing → Uploading → Executing → Complete)
   - Wait ~10-30 seconds for completion
9. **View Results**:
   - Results panel opens automatically
   - Go to "Measurement Histogram" tab
   - Observe: ~50% "00", ~50% "11", 0% "01" and "10" (as expected for Bell state)
10. **Verify State Vector**:
    - Go to "State Vector" tab
    - Observe: |00⟩ amplitude = 0.707, |11⟩ amplitude = 0.707 (equal superposition)

**Expected Time**: 3-5 minutes

**Screenshot: Complete workflow in 4 panels (composer, execution, progress, results)**

---

#### **2.3.2. Saving and Loading Projects (0.5 pages)**

**Saving:**
- **Auto-Save**: Circuit auto-saves every 5 seconds while editing (watch for "Saved" indicator in status bar)
- **Manual Save**: Press Ctrl/Cmd + S or click "Save" button in toolbar

**Loading:**
1. Navigate to "Projects" page (click "Projects" in navigation bar)
2. Browse project list
3. Click project card to open
4. Project loads with all circuits intact
5. Select circuit from left sidebar to edit

**Exporting Circuits (Future Feature):**
- Export as QASM file (download .qasm file)
- Export as PNG image (circuit diagram screenshot)
- Export as JSON (full circuit data)

---

#### **2.3.3. Comparing Partition Strategies (0.5 pages)**

**Scenario**: Compare different partition algorithms for a 5-qubit circuit.

**Step-by-Step:**
1. Create a complex 5-qubit circuit with 10+ gates
2. **First Execution**: Execute with strategy "kahn", max partition size 4
   - Note fidelity (e.g., 0.9998) and execution time (e.g., 15s)
3. **Second Execution**: Execute again with strategy "ilp", same max partition size
   - Compare fidelity (e.g., 0.9999, improved) and execution time (e.g., 45s, slower but more accurate)
4. **Third Execution**: Try "bqskit-qfactor" strategy
   - Compare results
5. **Analysis**: View "Probability Comparison" tab to see which strategy has lowest error

**Use Case**: Optimize for speed vs accuracy trade-off

---

### **2.4. Troubleshooting (2 pages)**

**Purpose**: Solutions to common issues and error messages.

---

#### **2.4.1. Common Errors and Solutions (1 page)**

**Error: "Invalid circuit: No gates present"**
- **Cause**: Trying to execute empty circuit
- **Solution**: Add at least one gate before executing

**Error: "Authentication failed: Invalid token"**
- **Cause**: JWT token expired (after 30 minutes)
- **Solution**: Refresh page to trigger auto-refresh, or logout and login again

**Error: "Failed to connect to backend API"**
- **Cause**: Backend server not running or network issue
- **Solution**:
  - Check backend status: navigate to http://localhost:8000/api/v1/health
  - Restart backend server: `uvicorn app.main:app --reload`
  - Check firewall settings

**Error: "Job timeout: Execution exceeded 300 seconds"**
- **Cause**: Circuit too large or SQUANDER server overloaded
- **Solution**:
  - Simplify circuit (remove gates or reduce qubits)
  - Increase SQUANDER_EXEC_TIMEOUT in backend .env
  - Contact administrator to check server status

**Error: "OAuth popup blocked"**
- **Cause**: Browser blocking popup windows
- **Solution**: Click "Allow popups" in browser address bar, try OAuth login again

**Error: "WebSocket connection failed"**
- **Cause**: Network issue or backend WebSocket endpoint unreachable
- **Solution**:
  - Check browser console (F12) for WebSocket error messages
  - Verify backend WebSocket endpoint: ws://localhost:8000/api/v1/ws/
  - Check firewall/proxy settings (WebSocket requires ws:// or wss:// protocol)

**Error: "Undo history limit reached"**
- **Cause**: Exceeded 50-state undo limit
- **Solution**: Not an error, oldest state removed from history (expected behavior)

---

#### **2.4.2. Connection Issues (0.5 pages)**

**Symptom: Page loads slowly or not at all**
- **Check**: Internet connection (try loading google.com)
- **Check**: Backend server running (http://localhost:8000/docs should load)
- **Check**: Frontend dev server running (terminal should show "VITE ... ready")
- **Solution**: Restart frontend server: `npm run dev`

**Symptom: Real-time updates not working (job progress stuck)**
- **Cause**: WebSocket disconnected
- **Check**: Browser console (F12) for "WebSocket closed" messages
- **Solution**:
  - Refresh page to reconnect WebSocket
  - Check backend logs for WebSocket errors
  - Verify network allows WebSocket connections (some corporate firewalls block)

---

#### **2.4.3. Authentication Problems (0.5 pages)**

**Problem: Google OAuth not working**
- **Check**: GOOGLE_CLIENT_ID configured in frontend .env
- **Check**: Authorized redirect URIs in Google Cloud Console match your URL
- **Solution**:
  - Verify client ID: compare frontend .env with Google Cloud Console
  - Add http://localhost:5173 to authorized origins
  - Clear browser cookies for accounts.google.com

**Problem: Microsoft OAuth not working**
- **Cause**: MSAL configuration issue
- **Solution**:
  - Verify MICROSOFT_CLIENT_ID in frontend .env
  - Check Azure Portal: redirect URI must be type "Single-page application (SPA)"
  - Enable "Access tokens" and "ID tokens" in Authentication settings
  - Try redirect flow instead of popup (MSAL auto-fallback on popup block)

**Problem: Email verification code not received**
- **Check**: Email address correct (check spam folder)
- **Check**: Resend API key configured in backend .env
- **Check**: Resend dashboard for delivery status
- **Solution**:
  - Wait 1-2 minutes (email may be delayed)
  - Request new code (rate limit: 1 code per minute per email)
  - Verify RESEND_API_KEY is valid (not expired)

---

### **2.5. Coverage Checklist (1 page)**

**Purpose**: Ensure all features documented align with existing diagrams and codebase.

---

#### **Features Documented in User Documentation:**

**Based on Wireframes:**
- ✅ **Login Wireframe** ([login_wireframe.png](docs/wireframe/login_wireframe.png)): §2.2.2.1 User Authentication
  - Google OAuth login
  - Microsoft OAuth login
  - Email verification login
  - Password registration
- ✅ **Home Wireframe** ([home_wireframe.png](docs/wireframe/home_wireframe.png)): §2.2.1.2 Creating Projects
  - Project list/grid view
  - "New Project" button
  - Navigation bar (profile, theme, language, logout)
- ✅ **Project Wireframe** ([project_wireframe.png](docs/wireframe/project_wireframe.png)): §2.2.2.2 Project Management
  - Circuit list sidebar
  - Active circuit display
  - Project details editing
- ✅ **Composer Wireframe** ([composer_wireframe.png](docs/wireframe/composer_wireframe.png)): §2.2.2.3 Circuit Composer
  - Gates panel (left)
  - Circuit canvas (center)
  - Inspector panel (right)
  - Toolbar (top)
- ✅ **Composer 2 Wireframe** ([composer_2_wireframe.png](docs/wireframe/composer_2_wireframe.png)): §2.2.2.3.D Grouping Gates
  - Nested circuit display
  - Circuit grouping dialog
- ✅ **Composer 3 Wireframe** ([composer_3_wireframe.png](docs/wireframe/composer_3_wireframe.png)): §2.2.2.4 Job Monitoring
  - Job panel showing progress
  - Real-time updates
- ✅ **Composer 4 Wireframe** ([composer_4_wireframe.png](docs/wireframe/composer_4_wireframe.png)): §2.2.2.5 Results Visualization
  - Results panel with tabs
  - Visualization types
- ✅ **Me Wireframe** ([me_wireframe.png](docs/wireframe/me_wireframe.png)): §2.2.2.1 Profile Management
  - Profile information display
  - Edit profile button
  - Theme and language selectors

**Based on Sequence Diagrams:**
- ✅ **User Authentication Sequence** ([user_authentication_sequence_diagram.plantuml](docs/sequence_diagram/user_authentication_sequence_diagram.plantuml)): §2.2.2.1
  - OAuth login flow
  - JWT token exchange
  - Email verification flow
- ✅ **Circuit Design Sequence** ([circuit_design_sequence_diagram.plantuml](docs/sequence_diagram/circuit_design_sequence_diagram.plantuml)): §2.2.2.3
  - Gate drag-and-drop
  - Circuit state updates
  - Auto-save to backend
- ✅ **Circuit Execution Sequence** ([circuit_execution_sequence_diagram.plantuml](docs/sequence_diagram/circuit_execution_sequence_diagram.plantuml)): §2.2.2.4
  - Job submission
  - SSH connection to SQUANDER
  - Results retrieval
- ✅ **Job Monitoring Sequence** ([job_monitoring_sequence_diagram.plantuml](docs/sequence_diagram/job_monitoring_sequence_diagram.plantuml)): §2.2.2.4.B
  - WebSocket room join
  - Real-time progress updates
  - Job completion notification
- ✅ **Job Cancellation Sequence** ([job_cancellation_sequence_diagram.plantuml](docs/sequence_diagram/job_cancellation_sequence_diagram.plantuml)): §2.2.2.4.D
  - Cancel request
  - SSH process termination
  - Cleanup
- ✅ **Project Management Sequence** ([project_management_sequence_diagram.plantuml](docs/sequence_diagram/project_management_sequence_diagram.plantuml)): §2.2.2.2
  - Create project
  - Update project
  - Delete project

**Based on Use Case Diagrams:**
- ✅ **Circuit Design Use Cases** ([circuit_design_use_case_diagram.plantuml](docs/use_case_diagram/circuit_design_use_case_diagram.plantuml)): §2.2.2.3
  - Add gate
  - Remove gate
  - Group gates
  - Ungroup circuit
  - View QASM code
  - Edit QASM code
- ✅ **Circuit Execution & Job Monitoring Use Cases** ([circuit_execution_and_job_monitoring_use_case_diagram.plantuml](docs/use_case_diagram/circuit_execution_and_job_monitoring_use_case_diagram.plantuml)): §2.2.2.4, §2.2.2.5
  - Execute circuit
  - Select partition strategy
  - Monitor job progress
  - Cancel job
  - View results
  - Download results
- ✅ **User Authentication & Project Management Use Cases** ([user_authentication_and_project_management_use_case_diagram.plantuml](docs/use_case_diagram/user_authentication_and_project_management_use_case_diagram.plantuml)): §2.2.2.1, §2.2.2.2
  - Register user
  - Login (OAuth, email)
  - Logout
  - Edit profile
  - Create project
  - Open project
  - Delete project
  - Create circuit
  - Delete circuit

**All features documented! ✅**

---

---

## **REQUIREMENT 4: Solution Plan / Design Documentation (4 points, minimum 10 pages)**

**Purpose**: Comprehensive design documentation with UML diagrams, UI wireframes, database schema, and architecture decisions before implementation.

**Suggested Page Count**: 18-22 pages (minimum 10 required)

---

### **Section Structure: 3. DEVELOPER DOCUMENTATION - SOLUTION PLAN**

---

### **3.1. Introduction to Design Documentation (1 page)**

**Purpose**: Explain the role of design documentation and how it guided implementation.

**Key Topics:**
- Design-first approach: UML diagrams created before coding
- Iterative refinement: Diagrams updated as requirements evolved
- Communication tool: Diagrams used to discuss architecture with stakeholders (supervisor, peers)
- Traceability: Each diagram element maps to implementation (see Realization section)

**Structure of Solution Plan:**
1. **Static Structure Diagrams** (§3.2): Class, Component, Package diagrams
2. **Dynamic Behavior Diagrams** (§3.3): State, Sequence diagrams
3. **Functional Requirements Diagrams** (§3.4): Use Case diagrams
4. **UI Design** (§3.5): Wireframes and design system
5. **Data Design** (§3.6): Database schema, API design
6. **Core Functionality Design** (§3.7): Algorithms, design patterns, architecture decisions

---

### **3.2. Static Structure Diagrams (5 pages)**

**Purpose**: Document the system's static architecture (classes, components, packages).

---

#### **3.2.1. Class Diagram - Backend (1.5 pages)**

**Figure Reference**: [docs/class_diagram/backend_uml_class_diagram.plantuml](docs/class_diagram/backend_uml_class_diagram.plantuml)

**Purpose**: Define backend class relationships, inheritance hierarchies, and composition patterns.

**Key Classes:**

**1. User Model** (`app/models/user.py:10`):
```python
class User(BaseModel):
    - _id: ObjectId
    - email: str [unique]
    - hashed_password: Optional[str]
    - first_name, last_name: Optional[str]
    - is_active: bool
    - oauth_provider: Optional[str]
    - oauth_subject_id: Optional[str]
    - created_at, updated_at: datetime

    + from_dict(data: Dict) -> User
    + to_dict() -> Dict
```

**2. Project Model** (`app/models/project.py:15`):
```python
class Project(BaseModel):
    - id: Optional[str]
    - user_id: str
    - name: str
    - circuits: List[CircuitInfo]  # Composition
    - active_circuit_id: str
    - created_at, updated_at: datetime

class CircuitInfo(BaseModel):
    - id: str
    - name: str
    - numQubits: int
    - gates: List[SerializedGate]
    - results: Optional[SimulationResults]
```

**3. SquanderClient** (`app/services/squander_client.py:30`):
```python
class SquanderClient:
    # Class variables (shared across instances)
    - _connection_pool: Dict[str, SquanderClient]
    - _pool_lock: asyncio.Lock
    - _semaphore: asyncio.Semaphore(5)

    # Instance variables
    - _session_id: str
    - _ssh_client: Optional[paramiko.SSHClient]
    - _sftp: Optional[paramiko.SFTPClient]
    - last_used: float

    # Methods
    + __init__(session_id: str)
    + async connect() -> None
    + async disconnect() -> None
    + async execute_command(command: str) -> tuple[str, str, int]
    + async upload_file(local_path: str, remote_path: str) -> None
    + async run_partition(...) -> AsyncGenerator[Dict, None]

    # Class methods (Factory pattern)
    + @classmethod async get_connection(session_id: str) -> SquanderClient
```

**4. ConnectionManager** (`app/services/websocket_manager.py:15`):
```python
class ConnectionManager:
    - connections: Dict[str, WebSocket]
    - sessions: Dict[str, Dict[str, Any]]
    - rooms: Dict[str, Set[str]]

    + async connect(websocket: WebSocket, client_id: Optional[str]) -> str
    + def disconnect(connection_id: str)
    + async join_room(connection_id: str, room: str) -> bool
    + async send_message(connection_id: str, message: Any)
    + async broadcast_to_room(room: str, message: Any)
```

**Relationships:**
- **Inheritance**: User and Project inherit from Pydantic `BaseModel` (provides validation, serialization)
- **Composition**: Project contains List of CircuitInfo (strong "has-a" relationship)
- **Dependency**: API endpoints depend on SquanderClient and ConnectionManager services
- **Association**: User associated with Projects (user_id foreign key, weak reference)

**Design Patterns Visible:**
- **Repository Pattern**: Models encapsulate database access logic
- **Factory Pattern**: `SquanderClient.get_connection()` class method creates/retrieves instances
- **Singleton Pattern**: ConnectionManager single instance shared across application
- **Dependency Injection**: FastAPI `Depends()` for authentication and database access

**OOP Concepts Demonstrated:**
- **Encapsulation**: Private attributes (`_ssh_client`), public methods (`connect()`)
- **Information Hiding**: Internal connection pool details hidden from API endpoints
- **Type Checking**: Pydantic models validate types at runtime
- **Memory Management**: SquanderClient cleanup via `__del__` or context manager

**Screenshot/Figure**: Include rendered class diagram from PlantUML with caption:
"Figure 4: Backend UML class diagram showing core models (User, Project, CircuitInfo) and service classes (SquanderClient, ConnectionManager) with their attributes, methods, and relationships."

---

#### **3.2.2. Component Diagram - Frontend (1.5 pages)**

**Figure Reference**: [docs/component_diagram/frontend_component_diagram.plantuml](docs/component_diagram/frontend_component_diagram.plantuml)

**Purpose**: Define frontend component architecture, composition hierarchy, and data flow.

**Key Components:**

**1. Pages (Top-Level Components):**
- **AuthPage**: Login/registration interface, OAuth buttons
- **HomePage**: Project list, navigation
- **ProjectWorkspace**: Main composer view
- **ProfilePage**: User profile and settings

**2. Layout Components:**
- **Header**: Navigation bar, theme toggle, language selector, user menu
- **Sidebar**: Project list (left) or inspector panel (right)
- **StatusBar**: Save indicator, gate count, job status

**3. Feature Components:**
- **CircuitCanvas** (`features/circuit/components/CircuitCanvas.tsx:45`):
  - **Props**: placedGates, numQubits, onGateClick, onGateMove
  - **Children**: GateIcon, CircuitThumbnail, MeasurementIcon
  - **Uses**: D3.js for SVG rendering, @dnd-kit for drag-and-drop
- **GatesPanel** (`features/gates/components/GatesPanel.tsx:30`):
  - **Props**: onGateSelect
  - **Children**: GateIcon (15 gate types)
- **QasmEditor** (`features/inspector/components/QasmEditor.tsx:25`):
  - **Props**: qasm, onQasmChange, readOnly
  - **Uses**: Monaco Editor
- **ResultsPanel** (`features/results/components/ResultsPanel.tsx:40`):
  - **Children**: StateVectorVisualization, MeasurementHistogram, DensityMatrixHeatmap, EntropyChart, ProbabilityComparison

**4. Stores (Zustand State Management):**
- **authStore**: Global authentication state (user, tokens, isAuthenticated)
- **jobStore**: Global job queue (Map of jobs)
- **projectsStore**: Global project list
- **circuitStores**: Per-circuit state map (Map<circuitId, CircuitStore>)

**5. Hooks (Custom Logic):**
- **useWebSocket**: WebSocket connection management
- **useJobManager**: Job lifecycle management (enqueue, monitor, complete)
- **useMessageBus**: Event bus for cross-component communication
- **useCircuitStore**: Access circuit-specific Zustand store

**Component Communication Patterns:**
- **Props**: Parent-to-child data flow (React standard)
- **Callbacks**: Child-to-parent events (onGateClick, onGateMove)
- **Zustand Store**: Global state sharing (auth, jobs, projects)
- **Context API**: Circuit store injection (`CircuitStoreContext`)
- **WebSocket**: Backend-to-frontend real-time updates (job progress)
- **Message Bus**: Broadcast WebSocket messages to all subscribers

**OOP Concepts Demonstrated:**
- **Component Composition**: CircuitCanvas composed of GateIcon, CircuitThumbnail (like class composition)
- **Encapsulation**: Custom hooks hide implementation details (useWebSocket abstracts reconnection logic)
- **Interface Definitions**: TypeScript interfaces define component props and store state
- **Polymorphism**: Union types (Gate | Circuit) handled with type guards

**Screenshot/Figure**: Include rendered component diagram with caption:
"Figure 5: Frontend component diagram showing React component hierarchy, Zustand stores, custom hooks, and communication patterns (props, callbacks, global state, WebSocket)."

---

#### **3.2.3. Package Diagram (1 page)**

**Figure Reference**: [docs/package_diagram/package_diagram.plantuml](docs/package_diagram/package_diagram.plantuml)

**Purpose**: Illustrate module organization, layered architecture, and dependency management.

**Backend Package Structure:**

```
backend/
├── app/
│   ├── api/              # API Layer (FastAPI routes)
│   │   ├── dependencies  # Shared dependencies (auth, database)
│   │   └── v1/           # API version 1
│   │       ├── api.py    # Router aggregation
│   │       └── endpoints/
│   ├── core/             # Business Logic Layer
│   │   ├── config        # Settings management
│   │   ├── security      # JWT creation/validation
│   │   └── oauth         # OAuth provider verification
│   ├── services/         # External Integrations Layer
│   │   ├── squander_client  # SSH client
│   │   ├── websocket_manager
│   │   └── simulate      # Circuit simulation
│   ├── models/           # Data Layer
│   │   ├── user
│   │   └── project
│   ├── schemas/          # Validation Layer (Pydantic)
│   │   ├── auth
│   │   └── project
│   └── db/               # Database Layer
│       └── mongodb       # MongoDB connection
└── tests/                # Test Layer
```

**Dependencies:**
- **API → Core**: API endpoints use security functions (JWT validation)
- **API → Services**: Endpoints call SquanderClient, ConnectionManager
- **API → Models**: Endpoints query/modify User and Project models
- **API → Schemas**: Request/response validation
- **Services → Core**: Services use configuration (Settings)
- **Models → DB**: Models interact with MongoDB
- **Core ← Config**: All layers depend on configuration

**Frontend Package Structure:**

```
frontend/src/
├── pages/               # Routing Layer
├── features/            # Feature Modules (domain logic)
│   ├── circuit/
│   ├── gates/
│   ├── inspector/
│   └── results/
├── components/          # UI Components
│   ├── common/
│   ├── layout/
│   └── ui/              # shadcn/ui primitives
├── stores/              # State Management
├── hooks/               # Custom Hooks
├── lib/                 # Utilities
│   ├── api/             # API client (axios)
│   └── qasm/
└── types/               # TypeScript Types
```

**Dependencies:**
- **Pages → Features**: Pages import feature components
- **Features → Components**: Features use UI components
- **Features → Stores**: Features access global state
- **Features → Hooks**: Features use custom hooks
- **Hooks → Lib/API**: Hooks call API client
- **All → Types**: All modules depend on type definitions

**Layered Architecture:**
- **Backend**: 5-layer architecture (API → Business Logic → Services → Data → Database)
- **Frontend**: Feature-based architecture with shared components, stores, hooks

**Design Rationale:**
- **Separation of Concerns**: Each package has single responsibility
- **Dependency Inversion**: High-level modules (API) depend on abstractions (interfaces), not concrete implementations
- **Testability**: Clear boundaries enable unit testing (mock dependencies)
- **Maintainability**: Modular structure allows independent updates

**Screenshot/Figure**: Include package diagram with caption:
"Figure 6: Package diagram showing backend and frontend module organization with layered architecture and dependency arrows."

---

#### **3.2.4. Object Diagram - Runtime Instances (1 page)**

**Purpose**: Show runtime object instances and their relationships during typical application usage (optional, but adds depth to OOP modeling coverage).

**Example Scenario**: User "alice@example.com" has 1 project with 2 circuits, executes circuit 1.

**Runtime Objects:**

```
User Object:
- _id: ObjectId("user123")
- email: "alice@example.com"
- oauth_provider: "google"

Project Object:
- id: "proj456"
- user_id: "user123"
- name: "Bell State Project"
- circuits: [Circuit1, Circuit2]
- active_circuit_id: "circuit1"

Circuit1 Object:
- id: "circuit1"
- name: "Bell State"
- numQubits: 2
- gates: [HGate, CNOTGate]

HGate Object:
- id: "gate-h-001"
- depth: 0
- gate: {name: "H"}
- targetQubits: [0]

CNOTGate Object:
- id: "gate-cnot-002"
- depth: 1
- gate: {name: "CNOT"}
- targetQubits: [1]
- controlQubits: [0]

SquanderClient Object (from pool):
- _session_id: "alice-session"
- _ssh_client: <paramiko.SSHClient connected to squander-server>
- last_used: 1704998400

WebSocket Connection:
- connection_id: "ws-abc123"
- websocket: <WebSocket connected>
- rooms: {"partition-job789"}

Job Object (in jobStore):
- jobId: "job789"
- circuitId: "circuit1"
- status: "running"
- updates: [...]
```

**Relationships:**
- Project → User (user_id reference)
- Circuit1 → Project (contained in circuits array)
- HGate, CNOTGate → Circuit1 (contained in gates array)
- SquanderClient → alice's session (connection pool entry)
- WebSocket → job789 room (room membership)

**OOP Concepts:**
- **Object Identity**: Each object has unique ID (ObjectId, UUID)
- **Object State**: Mutable state (job status changes from pending → running → complete)
- **Object Relationships**: Association (User-Project), Composition (Project-Circuit), Aggregation (Job-WebSocket room)

**Diagram**: Simple UML object diagram showing boxes with object name, attributes, and links between objects.

---

### **3.3. Dynamic Behavior Diagrams (5 pages)**

**Purpose**: Document system behavior over time (state transitions, message passing, event sequences).

---

#### **3.3.1. State Diagram - Job Execution Lifecycle (1 page)**

**Figure Reference**: [docs/state_diagram/job_execution_state_diagram.plantuml](docs/state_diagram/job_execution_state_diagram.plantuml)

**Purpose**: Model job state machine with transitions, events, guards, and actions.

**States:**
1. **Pending**: Job created, awaiting execution
2. **Running**: Job executing on SQUANDER server
3. **Complete**: Job finished successfully, results available
4. **Error**: Job failed with error message

**Transitions:**

| From | Event | Guard | To | Action |
|------|-------|-------|----|----- --|
| Pending | startJob() | SSH connected | Running | Send circuit to server, broadcast "started" |
| Running | jobComplete() | No errors | Complete | Store results, broadcast "complete", leave room |
| Running | jobError() | Error occurred | Error | Log error, broadcast "error", leave room |
| Running | cancelJob() | User requested | Error | Terminate SSH process, set error "Cancelled" |
| Complete | — | — | — | Terminal state |
| Error | — | — | — | Terminal state |

**Events:**
- **startJob()**: Backend receives execute request from frontend
- **jobComplete()**: SQUANDER process exits with code 0
- **jobError()**: SQUANDER process exits with non-zero code or SSH error
- **cancelJob()**: User clicks "Cancel" button in UI

**Guards:**
- **SSH connected**: Verify SSH client connected before starting job
- **No errors**: Check SQUANDER output for error messages

**Actions:**
- **broadcast(message)**: Send WebSocket message to room `{jobType}-{jobId}`
- **Store results**: Save SimulationResults to MongoDB
- **Leave room**: Disconnect from WebSocket room, cleanup resources

**Implementation Mapping:**
- **State Field**: `stores/jobStore.ts:15` has `status: 'pending' | 'running' | 'complete' | 'error'`
- **Transition Logic**: `api/v1/endpoints/circuits.py:45` updates `active_jobs` dict
- **WebSocket Broadcasting**: `services/websocket_manager.py:15` sends messages to room

**OOP Concepts:**
- **State Pattern**: Job behavior depends on current state (can cancel only if running)
- **Event-Driven Design**: External events (user actions, SSH results) trigger transitions

**Screenshot/Figure**: Include state diagram with caption:
"Figure 7: Job execution state machine showing transitions between pending, running, complete, and error states with triggering events and actions."

---

#### **3.3.2. Sequence Diagram - User Authentication (1 page)**

**Figure Reference**: [docs/sequence_diagram/user_authentication_sequence_diagram.plantuml](docs/sequence_diagram/user_authentication_sequence_diagram.plantuml)

**Purpose**: Document OAuth and email verification login flows with actor interactions.

**Actors:**
- **User**: Browser client
- **Frontend**: React application
- **OAuth Provider**: Google or Microsoft
- **Backend API**: FastAPI endpoints
- **Database**: MongoDB

**OAuth Login Flow:**

```
User -> Frontend: Click "Sign in with Google"
Frontend -> OAuth Provider: Open popup, request authorization
OAuth Provider -> User: Show consent screen
User -> OAuth Provider: Grant permissions
OAuth Provider -> Frontend: Return ID token
Frontend -> Backend API: POST /api/v1/auth/oauth/login {token, provider: "google"}
Backend API -> OAuth Provider: Verify token signature (google.oauth2.id_token)
OAuth Provider -> Backend API: Return user info {sub, email, name}
Backend API -> Database: Find or create user by email
Database -> Backend API: User document
Backend API -> Backend API: Generate JWT access + refresh tokens
Backend API -> Frontend: {access_token, refresh_token, user: {...}}
Frontend -> Frontend: Store tokens in authStore (localStorage)
Frontend -> User: Redirect to home page (logged in)
```

**Email Verification Flow:**

```
User -> Frontend: Click "Sign in with Email"
Frontend -> User: Show email input
User -> Frontend: Enter email address
Frontend -> Backend API: POST /api/v1/auth/email/send-code {email}
Backend API -> Backend API: Generate 6-digit code, store in DB with 5-min TTL
Backend API -> Resend API: Send email with code
Resend API -> User: Email arrives in inbox
User -> Frontend: Enter 6-digit code
Frontend -> Backend API: POST /api/v1/auth/email/verify {email, code}
Backend API -> Database: Verify code, check expiration
Database -> Backend API: Code valid
Backend API -> Backend API: Create/login user, generate JWT tokens
Backend API -> Frontend: {access_token, refresh_token, user}
Frontend -> Frontend: Store tokens, update authStore
Frontend -> User: Redirect to home page
```

**Key Interactions:**
- **Token Verification**: Backend verifies OAuth token with provider (prevents forged tokens)
- **User Creation/Lookup**: Backend checks if user exists, links OAuth account to existing email
- **JWT Generation**: Backend creates stateless JWT tokens (30-min access, 7-day refresh)
- **Client-Side Storage**: Frontend persists tokens in localStorage via Zustand persist middleware

**Implementation Mapping:**
- **Frontend**: `stores/authStore.ts:45` `oauthLogin()` function
- **Backend**: `api/v1/endpoints/auth.py:60` `oauth_login()` endpoint
- **OAuth Verification**: `core/oauth.py:15` `verify_google_token()`, `verify_microsoft_token()`
- **Email Service**: `core/email.py:10` `send_verification_code()`

**Screenshot/Figure**: Include sequence diagram with caption:
"Figure 8: User authentication sequence diagram showing OAuth and email verification flows with interactions between User, Frontend, OAuth Provider, Backend API, and Database."

---

#### **3.3.3. Sequence Diagram - Circuit Design (0.5 pages)**

**Figure Reference**: [docs/sequence_diagram/circuit_design_sequence_diagram.plantuml](docs/sequence_diagram/circuit_design_sequence_diagram.plantuml)

**Purpose**: Document gate placement and circuit editing workflow.

**Actors:**
- User
- CircuitCanvas (React component)
- CircuitStore (Zustand)
- Backend API

**Flow:**
```
User -> CircuitCanvas: Drag H gate onto q0, depth 0
CircuitCanvas -> CircuitCanvas: Calculate drop position (depth, qubit)
CircuitCanvas -> CircuitCanvas: Check collision (no gate at depth 0, q0)
CircuitCanvas -> CircuitStore: setPlacedGates([...gates, newHGate])
CircuitStore -> CircuitStore: Push current state to pastStates (Zundo)
CircuitStore -> CircuitStore: Update placedGates array
CircuitStore -> CircuitCanvas: Re-render with new gate
CircuitCanvas -> User: Gate appears on canvas
CircuitStore -> localStorage: Persist circuit state (debounced)
CircuitStore -> Backend API: POST /api/v1/projects/{id}/circuits/{cid} (auto-save, debounced 1s)
Backend API -> MongoDB: Update circuit.gates field
```

**Key Points:**
- **Collision Detection**: Frontend checks for overlapping gates before placement
- **Undo/Redo Integration**: Zundo middleware intercepts state updates, adds to history
- **Optimistic Updates**: UI updates immediately, backend save happens asynchronously
- **Debouncing**: Auto-save debounced (1 second) to avoid excessive API calls

---

#### **3.3.4. Sequence Diagram - Circuit Execution (1 page)**

**Figure Reference**: [docs/sequence_diagram/circuit_execution_sequence_diagram.plantuml](docs/sequence_diagram/circuit_execution_sequence_diagram.plantuml)

**Purpose**: Document job submission, SSH execution, and result retrieval workflow.

**Actors:**
- User
- Frontend
- Backend API
- WebSocket Server (ConnectionManager)
- SSH Server (SQUANDER)
- Database

**Flow:**
```
User -> Frontend: Click "Execute" button, select strategy "kahn"
Frontend -> Backend API: POST /api/v1/circuits/{id}/partition {strategy: "kahn", max_size: 4}
Backend API -> Backend API: Generate job_id, add to active_jobs dict
Backend API -> WebSocket Server: Create room "partition-{job_id}"
Backend API -> Frontend: {job_id, status: "pending"}
Frontend -> jobStore: enqueueJob(job_id, circuit_id, "partition")
Frontend -> WebSocket: joinRoom("partition-{job_id}", job_id)

Backend API -> SquanderClient: get_connection(session_id)
SquanderClient -> SSH Server: SSH connect (if not in pool)
SquanderClient -> SSH Server: Upload circuit QASM file
WebSocket Server -> Frontend: {type: "phase", phase: "uploading", progress: 20}

SquanderClient -> SSH Server: Execute "squander partition --strategy kahn ..."
SSH Server -> SquanderClient: Stream STDOUT (progress updates)
SquanderClient -> WebSocket Server: broadcast_to_room("partition-{job_id}", update)
WebSocket Server -> Frontend: {type: "log", message: "Partition 1: 3 gates", progress: 50}
Frontend -> jobStore: addUpdate(job_id, update)
Frontend -> User: Toast shows progress bar updating

SSH Server -> SquanderClient: Process complete, exit code 0
SquanderClient -> SSH Server: Download result JSON
SquanderClient -> Backend API: Parse results
Backend API -> Database: Update circuit.results field
Backend API -> WebSocket Server: broadcast_to_room({type: "complete", fidelity: 0.9999})
WebSocket Server -> Frontend: {type: "complete"}
Frontend -> jobStore: completeJob(job_id)
Frontend -> User: Toast "Job completed successfully", open results panel
Frontend -> WebSocket: leaveRoom("partition-{job_id}")
```

**Key Interactions:**
- **Asynchronous Execution**: Backend returns immediately (job_id), execution continues in background
- **Streaming Updates**: SSH STDOUT streamed to frontend via WebSocket (11 phases)
- **Room-Based Broadcasting**: Only clients in room `partition-{job_id}` receive updates
- **Result Persistence**: Final results stored in MongoDB for future access

---

#### **3.3.5. Sequence Diagram - Job Monitoring (0.5 pages)**

**Figure Reference**: [docs/sequence_diagram/job_monitoring_sequence_diagram.plantuml](docs/sequence_diagram/job_monitoring_sequence_diagram.plantuml)

**Purpose**: Document WebSocket subscription and real-time update delivery.

**Flow:**
```
Frontend -> WebSocket Server: Connect (ws://api.qubitkit.com/api/v1/ws/)
WebSocket Server -> Frontend: {type: "connection_established", connection_id}
Frontend -> WebSocket Server: {type: "join_room", room: "partition-job123", job_id: "job123"}
WebSocket Server -> WebSocket Server: Verify job ownership (user_id matches job.user_id)
WebSocket Server -> Frontend: {type: "room_joined", room: "partition-job123"}

[Backend sends updates to room during job execution]
WebSocket Server -> Frontend: {type: "phase", phase: "executing", progress: 60}
Frontend -> jobStore: addUpdate("job123", update)
Frontend -> User: Progress bar updates to 60%

[Job completes]
WebSocket Server -> Frontend: {type: "complete", results: {...}}
Frontend -> jobStore: completeJob("job123")
Frontend -> Frontend: Trigger results panel open
```

**Security Consideration**: Backend verifies job ownership before allowing room join (prevents users from monitoring other users' jobs).

---

#### **3.3.6. Sequence Diagram - Job Cancellation (0.5 pages)**

**Figure Reference**: [docs/sequence_diagram/job_cancellation_sequence_diagram.plantuml](docs/sequence_diagram/job_cancellation_sequence_diagram.plantuml)

**Purpose**: Document job cancellation flow with SSH process termination.

**Flow:**
```
User -> Frontend: Click "Cancel Job" button
Frontend -> Backend API: POST /api/v1/circuits/{cid}/jobs/{job_id}/cancel
Backend API -> active_jobs: Find job, verify user ownership
Backend API -> SquanderClient: Terminate SSH process (send Ctrl+C signal)
SSH Server -> SquanderClient: Process killed
SquanderClient -> Backend API: Return exit code (non-zero)
Backend API -> WebSocket Server: broadcast_to_room({type: "error", message: "Cancelled by user"})
WebSocket Server -> Frontend: {type: "error"}
Frontend -> jobStore: setJobError(job_id, "Cancelled by user")
Frontend -> User: Toast "Job cancelled"
Backend API -> active_jobs: Remove job from dict
Backend API -> Frontend: {status: "cancelled"}
```

---

#### **3.3.7. Sequence Diagram - Project Management (0.5 pages)**

**Figure Reference**: [docs/sequence_diagram/project_management_sequence_diagram.plantuml](docs/sequence_diagram/project_management_sequence_diagram.plantuml)

**Purpose**: Document CRUD operations for projects and circuits.

**Create Project Flow:**
```
User -> Frontend: Click "New Project", enter name "My Project"
Frontend -> Backend API: POST /api/v1/projects {name, circuits: [{id, name, numQubits: 3, gates: []}]}
Backend API -> Backend API: Validate auth (JWT from header)
Backend API -> Database: Insert project document
Database -> Backend API: {inserted_id: "proj123"}
Backend API -> Frontend: {id: "proj123", name: "My Project", ...}
Frontend -> projectsStore: Add project to list
Frontend -> User: Redirect to project workspace
```

**Update Circuit Flow:**
```
User -> CircuitCanvas: Add gate
CircuitStore -> Backend API: PUT /api/v1/projects/{proj_id}/circuits/{circuit_id} {gates: [...]} (debounced)
Backend API -> Database: Update circuits.$.gates (MongoDB array update)
Database -> Backend API: {matched_count: 1, modified_count: 1}
Backend API -> Frontend: {updated_at: timestamp}
Frontend -> StatusBar: Show "Saved" indicator
```

---

### **3.4. Functional Requirements Diagrams (2 pages)**

**Purpose**: Document system functionality from user perspective (use cases).

---

#### **3.4.1. Use Case Diagram - Circuit Design (0.5 pages)**

**Figure Reference**: [docs/use_case_diagram/circuit_design_use_case_diagram.plantuml](docs/use_case_diagram/circuit_design_use_case_diagram.plantuml)

**Purpose**: Define circuit composer use cases and actor interactions.

**Actors:**
- **User**: Authenticated user designing circuits

**Use Cases:**
1. **Add Gate**: Drag gate from palette onto canvas
   - **Precondition**: Circuit canvas open
   - **Postcondition**: Gate added to circuit, undo history updated
   - **Alternative Flow**: Invalid position (overlapping gate) → Error message

2. **Remove Gate**: Select gate, press Delete
   - **Precondition**: Gate exists in circuit
   - **Postcondition**: Gate removed, dependent gates updated (parent/child links)

3. **Move Gate**: Drag gate to new position
   - **Precondition**: Gate exists
   - **Postcondition**: Gate depth/qubit updated, collision detection performed

4. **Group Gates into Circuit**: Select multiple gates, create nested circuit
   - **Precondition**: ≥2 gates selected
   - **Postcondition**: Circuit block created, gates hidden inside

5. **Ungroup Circuit**: Expand nested circuit back to gates
   - **Precondition**: Circuit block exists
   - **Postcondition**: Gates restored to canvas

6. **Undo/Redo**: Revert/reapply circuit changes
   - **Precondition**: Undo/redo history not empty
   - **Postcondition**: Circuit state restored

7. **View QASM Code**: Display circuit as OpenQASM 2.0
   - **Postcondition**: QASM code shown in inspector panel

8. **Edit QASM Code**: Modify circuit via text editing
   - **Precondition**: Valid QASM syntax
   - **Postcondition**: Circuit canvas updates to match QASM

**Relationships:**
- **Extends**: "Edit QASM Code" extends "View QASM Code" (advanced feature)
- **Includes**: "Add Gate", "Remove Gate", "Move Gate" all include "Update Circuit State"

**Screenshot/Figure**: Include use case diagram with caption:
"Figure 9: Circuit design use case diagram showing user interactions with circuit composer (add/remove gates, grouping, undo/redo, QASM editing)."

---

#### **3.4.2. Use Case Diagram - Circuit Execution & Job Monitoring (1 page)**

**Figure Reference**: [docs/use_case_diagram/circuit_execution_and_job_monitoring_use_case_diagram.plantuml](docs/use_case_diagram/circuit_execution_and_job_monitoring_use_case_diagram.plantuml)

**Purpose**: Define job execution and monitoring use cases.

**Actors:**
- **User**: Submits jobs, monitors progress
- **SSH Server**: External SQUANDER execution server (secondary actor)

**Use Cases:**

1. **Execute Circuit**: Submit circuit for simulation
   - **Precondition**: Valid circuit (≥1 gate, measurements added)
   - **Inputs**: Partition strategy, max partition size
   - **Postcondition**: Job created, added to queue
   - **Alternative Flow**: Invalid circuit → Validation error

2. **Select Partition Strategy**: Choose algorithm (kahn, ilp, etc.)
   - **Precondition**: Execute button clicked
   - **Postcondition**: Strategy parameter passed to backend

3. **Monitor Job Progress**: View real-time updates via WebSocket
   - **Precondition**: Job running
   - **Postcondition**: User sees progress percentage, current phase
   - **Includes**: "Receive WebSocket Updates"

4. **Cancel Job**: Terminate running job
   - **Precondition**: Job in "running" state
   - **Postcondition**: SSH process killed, job status = "error"

5. **View Simulation Results**: Display visualizations after job completion
   - **Precondition**: Job status = "complete"
   - **Postcondition**: Results panel shows 7 visualization types
   - **Includes**: "Fetch Results from Database"

6. **Download Results**: Export results as JSON or CSV
   - **Precondition**: Results available
   - **Postcondition**: File downloaded to user's device

**SSH Server Interactions:**
- **<<execute>>**: User → System → SSH Server (circuit uploaded, SQUANDER executed)
- **<<stream>>**: SSH Server → System → User (progress updates streamed)

**Screenshot/Figure**: Include use case diagram with caption:
"Figure 10: Circuit execution and job monitoring use case diagram showing job submission, progress monitoring, cancellation, and result visualization with SSH Server as secondary actor."

---

#### **3.4.3. Use Case Diagram - User Authentication & Project Management (0.5 pages)**

**Figure Reference**: [docs/use_case_diagram/user_authentication_and_project_management_use_case_diagram.plantuml](docs/use_case_diagram/user_authentication_and_project_management_use_case_diagram.plantuml)

**Purpose**: Define authentication and project CRUD use cases.

**Actors:**
- **User**: Unauthenticated or authenticated
- **OAuth Provider**: Google or Microsoft (secondary actor)

**Authentication Use Cases:**
1. **Register User**: Create new account with email/password
2. **Login with OAuth**: Authenticate via Google or Microsoft
   - **Includes**: "Verify OAuth Token" (backend interaction with OAuth Provider)
3. **Login with Email**: Authenticate with email verification code
   - **Includes**: "Send Verification Code", "Verify Code"
4. **Logout**: Clear session, delete tokens

**Project Management Use Cases:**
1. **Create Project**: Initialize new project with default circuit
2. **Open Project**: Load project and circuits from database
3. **Update Project**: Rename project, edit description
4. **Delete Project**: Remove project and all circuits (confirmation required)
5. **Create Circuit**: Add new circuit to project
6. **Delete Circuit**: Remove circuit from project

**Screenshot/Figure**: Include use case diagram with caption:
"Figure 11: User authentication and project management use case diagram showing registration, multi-provider login, and project CRUD operations."

---

### **3.5. UI Design (3 pages)**

**Purpose**: Document wireframes, design system, and UI/UX decisions.

---

#### **3.5.1. Design System (1 page)**

**Purpose**: Define visual design language (colors, typography, components).

**Color Scheme:**

**Light Mode:**
- **Background**: White (#FFFFFF)
- **Foreground**: Dark Gray (#1F2937)
- **Primary**: Blue (#3B82F6) - buttons, links, accents
- **Secondary**: Gray (#6B7280) - secondary text
- **Accent**: Purple (#8B5CF6) - highlights, active states
- **Success**: Green (#10B981) - success messages, complete jobs
- **Warning**: Yellow (#F59E0B) - warnings
- **Error**: Red (#EF4444) - errors, failed jobs

**Dark Mode:**
- **Background**: Dark Gray (#1F2937)
- **Foreground**: Light Gray (#F3F4F6)
- **Primary**: Light Blue (#60A5FA)
- **Secondary**: Gray (#9CA3AF)
- **Accent**: Light Purple (#A78BFA)
- **Success**: Light Green (#34D399)
- **Warning**: Light Yellow (#FBBF24)
- **Error**: Light Red (#F87171)

**Typography:**
- **Font Family**:
  - Sans-serif: Inter (body text, UI)
  - Monospace: JetBrains Mono (code, QASM, gate symbols)
- **Font Sizes**:
  - Heading 1: 2rem (32px)
  - Heading 2: 1.5rem (24px)
  - Body: 1rem (16px)
  - Small: 0.875rem (14px)
  - Caption: 0.75rem (12px)

**Spacing Scale** (Tailwind CSS):
- 0.5 = 0.125rem (2px)
- 1 = 0.25rem (4px)
- 2 = 0.5rem (8px)
- 4 = 1rem (16px)
- 6 = 1.5rem (24px)
- 8 = 2rem (32px)

**Component Library** (shadcn/ui):
- **Buttons**: Primary, Secondary, Ghost, Destructive variants
- **Inputs**: Text, Number, Select, Checkbox
- **Dialogs**: Modal overlays with backdrop
- **Tooltips**: Hover descriptions for gates and buttons
- **Toast Notifications**: Bottom-right corner, auto-dismiss after 5s
- **Progress Bars**: Linear progress indicator for jobs

**Accessibility:**
- **Contrast Ratio**: ≥4.5:1 for text, ≥3:1 for UI components (WCAG AA)
- **Focus Indicators**: Blue outline (2px) on keyboard focus
- **Alt Text**: All images have descriptive alt text
- **Keyboard Navigation**: Tab order follows visual order

---

#### **3.5.2. Wireframe Explanations (2 pages)**

**Purpose**: Explain each wireframe, mapping to implemented UI and design decisions.

---

**A. Login Page Wireframe** ([login_wireframe.png](docs/wireframe/login_wireframe.png)) - §3.5.2.A

**Layout:**
- **Center-Aligned Card**: Login form in centered 400px-wide card
- **Logo**: Top of card (Qubit logo, 64px height)
- **Title**: "Sign In to Qubit" (Heading 1)
- **Authentication Options** (3 buttons, stacked vertically):
  1. "Sign in with Google" (Google logo + text, white background, gray border)
  2. "Sign in with Microsoft" (Microsoft logo + text, white background, gray border)
  3. "Sign in with Email" (envelope icon + text, primary blue background)
- **Footer**: "Don't have an account? Sign up" link

**Design Decisions:**
- **OAuth Prominence**: OAuth buttons placed above email to encourage social login (faster, no password management)
- **Visual Hierarchy**: Larger button size (h-12) for primary actions, clear separation (gap-4)
- **Error Handling**: Toast notifications for auth errors (bottom-right)

**Implementation**:
- **Component**: `pages/AuthPage.tsx:20`
- **OAuth Buttons**: `@react-oauth/google` GoogleLogin component, `@azure/msal-react` useMsal hook
- **Responsive**: Single column on mobile, card width reduces to 90vw

**Screenshot Annotations**: Indicate logo placement, button hierarchy, responsive behavior

---

**B. Home Page Wireframe** ([home_wireframe.png](docs/wireframe/home_wireframe.png)) - §3.5.2.B

**Layout:**
- **Header**: Navigation bar (fixed top, 64px height)
  - Left: Qubit logo + "Home" link
  - Right: Theme toggle, Language selector, User avatar dropdown
- **Main Content**: Project grid (3 columns on desktop, 1 on mobile)
  - Each project card shows: Thumbnail, Title, Description (truncated), Last Modified, Circuit Count
  - **Hover Effect**: Card shadow increases (elevation), scale slightly (1.02x)
- **Action Button**: "New Project" FAB (Floating Action Button, bottom-right, 56px diameter, primary blue)

**Design Decisions:**
- **Grid Layout**: Responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- **Card Design**: Border, shadow (shadow-sm), rounded corners (rounded-lg)
- **Empty State**: "No projects yet. Create your first project!" message with illustration

**Implementation**:
- **Component**: `pages/HomePage.tsx:15`
- **Data Source**: `stores/projectsStore.ts:20` fetches projects on mount
- **Navigation**: Click card → navigate to `/project/{project_id}`

---

**C. Project Workspace Wireframe** ([project_wireframe.png](docs/wireframe/project_wireframe.png)) - §3.5.2.C

**Layout:**
- **Left Sidebar** (250px wide, collapsible): Circuit list
  - Each circuit: Name, qubit count, gate count
  - Active circuit highlighted (primary background)
  - "+" button at bottom to create new circuit
- **Main Panel**: Circuit composer (see Composer Wireframe)
- **Status Bar** (bottom, 32px height): Save indicator, Gate count, Qubit count, Job status

**Design Decisions:**
- **Sidebar Toggle**: Hamburger icon to collapse/expand (extra screen space for canvas)
- **Active Indicator**: Bold text + blue background for selected circuit
- **Context Menu**: Right-click circuit → Rename, Duplicate, Delete

**Implementation**:
- **Component**: `pages/ProjectWorkspace.tsx:30`
- **Sidebar**: `components/layout/Sidebar.tsx:15`
- **Status Bar**: `components/layout/StatusBar.tsx:10`

---

**D. Composer Wireframes** ([composer_wireframe.png](docs/wireframe/composer_wireframe.png), [composer_2_wireframe.png](docs/wireframe/composer_2_wireframe.png), [composer_3_wireframe.png](docs/wireframe/composer_3_wireframe.png), [composer_4_wireframe.png](docs/wireframe/composer_4_wireframe.png)) - §3.5.2.D

**Composer Layout** (3-column layout):
1. **Gates Panel** (left, 200px wide):
   - Gate categories (tabs: Single-Qubit, Two-Qubit, Multi-Qubit)
   - Gate icons (40×40px) with tooltips
2. **Circuit Canvas** (center, flex-grow):
   - SVG viewport (pan/zoom enabled)
   - Qubit lines (horizontal gray lines)
   - Gates rendered as SVG elements
   - Toolbar above canvas: Undo, Redo, Add Qubit, Execute, Save, Export
3. **Inspector Panel** (right, 300px wide, collapsible):
   - Tabs: Properties, QASM, Results
   - Properties tab: Gate details (selected gate), circuit metadata
   - QASM tab: Monaco Editor
   - Results tab: Visualization tabs (see Composer 4)

**Composer 2 - Nested Circuits**:
- Grouped circuit shown as rounded rectangle with custom symbol
- Toggle "Show Nested Circuit" expands gates inside (grayed out, non-editable)
- Annotations: "Grouped circuit can be ungrouped with Ctrl+Shift+G"

**Composer 3 - Job Monitoring**:
- Job panel overlay (bottom-right, 400×200px card)
- Progress bar (0-100%), current phase text
- Expand button to show detailed logs
- Cancel button (X icon, top-right)

**Composer 4 - Results Visualization**:
- Inspector panel switched to "Results" tab
- Visualization type selector (tabs): Overview, State Vector, Histogram, Density Matrix, Entropy, Comparison, Partition Info
- Each visualization: Full-width chart (Plotly.js interactive)
- Export button (top-right): Download as PNG or JSON

**Design Decisions:**
- **Collapsible Panels**: Max screen space for canvas, panels toggle with keyboard (Ctrl+1, Ctrl+2, Ctrl+3)
- **Canvas Controls**: Zoom widget (bottom-left), minimap (optional)
- **Gate Rendering**: SVG symbols (H, X, CNOT dot/cross) with consistent 40×40px bounding box

**Implementation**:
- **Canvas**: `features/circuit/components/CircuitCanvas.tsx:45`
- **Gates Panel**: `features/gates/components/GatesPanel.tsx:30`
- **Inspector**: `features/inspector/components/InspectorPanel.tsx:20`
- **Results**: `features/results/components/ResultsPanel.tsx:40`

---

**E. User Profile Wireframe** ([me_wireframe.png](docs/wireframe/me_wireframe.png)) - §3.5.2.E

**Layout:**
- **Center Card** (600px wide):
  - **Avatar** (128px circle, top-center)
  - **User Info Section**:
    - Full Name (editable text input)
    - Email (read-only)
    - OAuth Provider (badge: "Google" or "Microsoft", blue background)
    - Account Created (timestamp)
  - **Settings Section**:
    - Theme selector (Light / Dark / System radio buttons)
    - Language selector (dropdown)
  - **Save Button** (primary blue, bottom-right)

**Design Decisions:**
- **Read-Only Email**: Email cannot be changed (linked to OAuth account)
- **Avatar Upload**: Future feature (not implemented yet)
- **Settings Integration**: Theme/language change immediately reflected in UI (no save button needed for settings)

**Implementation**:
- **Component**: `pages/ProfilePage.tsx:15`
- **Data Source**: `stores/authStore.ts:user` object

---

### **3.6. Data Persistence & API Design (3 pages)**

**Purpose**: Document database schema, API endpoints, and state management architecture.

---

#### **3.6.1. Database Design (1 page)**

**Purpose**: Define MongoDB collection schemas, indexes, and relationships.

**Collections:**

**1. users Collection:**
```javascript
{
  _id: ObjectId("..."),               // Primary key (auto-generated)
  email: "user@example.com",          // Unique index
  hashed_password: "$2b$12$...",      // bcrypt hash (null for OAuth users)
  first_name: "John",
  last_name: "Doe",
  is_active: true,
  is_superuser: false,
  oauth_provider: "google",           // null, "google", "microsoft"
  oauth_subject_id: "google-user-id",
  profile_url: "https://...",
  created_at: ISODate("2024-01-01"),
  updated_at: ISODate("2024-01-15")
}
```

**Indexes:**
- `email` (unique, ascending) - for O(log n) user lookup by email
- `oauth_provider + oauth_subject_id` (compound, sparse) - for OAuth login lookup

**Design Rationale:**
- **Flexible Authentication**: Support both password and OAuth (hashed_password nullable)
- **Soft Delete**: `is_active` flag instead of hard delete (audit trail)
- **Denormalization**: Profile URL stored directly (no separate profiles collection)

---

**2. projects Collection:**
```javascript
{
  _id: ObjectId("..."),
  user_id: "user-object-id-string",   // String reference (not ObjectId)
  name: "My Quantum Project",
  description: "Optional description",
  circuits: [                         // Embedded array
    {
      id: "circuit-uuid",
      name: "Bell State",
      numQubits: 2,
      gates: [                        // Nested array
        {
          id: "gate-uuid",
          depth: 0,
          gate: {name: "H"},
          targetQubits: [0],
          controlQubits: [],
          parents: [],
          children: ["gate-uuid-2"]
        }
      ],
      metadata: {
        created: "2024-01-01",
        modified: "2024-01-15"
      },
      results: {                      // Embedded document (large, ~1-5 KB)
        num_qubits: 2,
        num_shots: 10000,
        partition_info: {...},
        original: {
          state_vector: [[0.707, 0], [0.707, 0]],
          probabilities: [0.5, 0.5],
          counts: {"00": 5023, "11": 4977},
          density_matrix: {...},
          entropy_scaling: [...],
          unitary: [...]
        },
        partitioned: {...},
        comparison: {...},
        timestamp: 1704998400
      }
    }
  ],
  active_circuit_id: "circuit-uuid",
  created_at: ISODate("2024-01-01"),
  updated_at: ISODate("2024-01-15")
}
```

**Indexes:**
- `user_id` (ascending) - for O(log n) user's projects query
- `user_id + circuits.id` (compound) - for O(log n) specific circuit update

**Design Rationale:**
- **Embedded Documents**: Circuits embedded in Project (not separate collection)
  - **Pros**: Atomic updates, single read for entire project, no joins
  - **Cons**: 16MB document size limit (acceptable, circuits rarely >100KB each, max ~10-20 circuits per project)
- **No Foreign Key Constraints**: MongoDB doesn't enforce referential integrity (application-level checks)
- **Nested Arrays**: Gates array nested in circuits array (2 levels deep)
  - MongoDB supports positional operator `circuits.$.gates` for updates

---

**Database Schema Diagram (ERD-style):**

```
┌─────────────────┐         ┌─────────────────────────┐
│     users       │ 1     * │       projects          │
│─────────────────│─────────│─────────────────────────│
│ _id: ObjectId   │         │ _id: ObjectId           │
│ email: String   │         │ user_id: String (FK)    │
│ hashed_password │         │ name: String            │
│ oauth_provider  │         │ circuits: [             │
│ ...             │         │   {                     │
└─────────────────┘         │     id: String          │
                            │     gates: [            │
                            │       {id, depth, ...}  │
                            │     ],                  │
                            │     results: {...}      │
                            │   }                     │
                            │ ]                       │
                            │ ...                     │
                            └─────────────────────────┘
```

---

#### **3.6.2. API Design (1.5 pages)**

**Purpose**: Document RESTful endpoints, request/response formats, and WebSocket protocol.

**Base URL**: `http://localhost:8000/api/v1` (development), `https://api.qubitkit.com/api/v1` (production)

**Authentication Endpoints** (`/api/v1/auth`):

| Method | Endpoint | Description | Auth Required | Request Body | Response |
|--------|----------|-------------|---------------|--------------|----------|
| POST | `/register` | Create new user | No | `{email, password, first_name, last_name}` | `{access_token, refresh_token, user: {...}}` |
| POST | `/login` | Email/password login | No | `{email, password}` | `{access_token, refresh_token, user}` |
| POST | `/oauth/login` | OAuth login | No | `{token, provider: "google"\|"microsoft"}` | `{access_token, refresh_token, user}` |
| POST | `/email/send-code` | Send verification code | No | `{email}` | `{message: "Code sent"}` |
| POST | `/email/verify` | Verify code and login | No | `{email, code}` | `{access_token, refresh_token, user}` |
| POST | `/refresh` | Refresh access token | No | `{refresh_token}` | `{access_token}` |
| GET | `/me` | Get current user | Yes | — | `{user: {...}}` |

**Project Endpoints** (`/api/v1/projects`):

| Method | Endpoint | Description | Auth | Request | Response |
|--------|----------|-------------|------|---------|----------|
| POST | `/` | Create project | Yes | `{name, description?, circuits}` | `{id, name, ...}` |
| GET | `/` | List user's projects | Yes | — | `[{id, name, ...}, ...]` |
| GET | `/{project_id}` | Get project details | Yes | — | `{id, name, circuits: [...]}` |
| PUT | `/{project_id}` | Update project | Yes | `{name?, description?}` | `{id, updated_at}` |
| DELETE | `/{project_id}` | Delete project | Yes | — | `{message: "Deleted"}` |
| POST | `/{project_id}/circuits` | Create circuit | Yes | `{name, numQubits}` | `{id, name, ...}` |
| PUT | `/{project_id}/circuits/{circuit_id}` | Update circuit | Yes | `{gates?, numQubits?, measurements?}` | `{updated_at}` |
| DELETE | `/{project_id}/circuits/{circuit_id}` | Delete circuit | Yes | — | `{message: "Deleted"}` |

**Circuit Execution Endpoints** (`/api/v1/circuits`):

| Method | Endpoint | Description | Auth | Request | Response |
|--------|----------|-------------|------|---------|----------|
| POST | `/{circuit_id}/partition` | Start partition job | Yes | `{strategy, max_partition_size, num_shots?}` | `{job_id, status: "pending"}` |
| POST | `/{circuit_id}/import-qasm` | Import QASM circuit | Yes | `{qasm_code}` | `{job_id}` |
| GET | `/{circuit_id}/jobs` | List jobs for circuit | Yes | — | `[{job_id, status, ...}, ...]` |
| GET | `/{circuit_id}/jobs/{job_id}` | Get job status | Yes | — | `{job_id, status, updates: [...]}` |
| POST | `/{circuit_id}/jobs/{job_id}/cancel` | Cancel job | Yes | — | `{status: "cancelled"}` |

**WebSocket Endpoints** (`/api/v1/ws`):

- `ws://localhost:8000/api/v1/ws/` - General WebSocket connection (optional JWT in query param `?token=...`)
- `ws://localhost:8000/api/v1/ws/room/{room_name}` - Auto-join specific room (requires JWT, verifies job ownership)

**WebSocket Message Protocol:**

**Client → Server Messages:**
```json
{
  "type": "ping",
  "timestamp": 1704998400
}

{
  "type": "join_room",
  "room": "partition-job123",
  "job_id": "job123"  // Optional, for ownership verification
}

{
  "type": "leave_room",
  "room": "partition-job123"
}
```

**Server → Client Messages:**
```json
{
  "type": "connection_established",
  "connection_id": "ws-abc123"
}

{
  "type": "pong",
  "timestamp": 1704998400
}

{
  "type": "room_joined",
  "room": "partition-job123"
}

{
  "type": "phase",
  "jobId": "job123",
  "phase": "executing",
  "message": "Running SQUANDER partition algorithm",
  "progress": 60
}

{
  "type": "log",
  "jobId": "job123",
  "message": "Partition 1: 3 gates on 2 qubits",
  "progress": 65
}

{
  "type": "complete",
  "jobId": "job123",
  "results": {
    "fidelity": 0.9999,
    "execution_time": 12.4,
    "num_partitions": 3
  }
}

{
  "type": "error",
  "jobId": "job123",
  "message": "SSH connection failed: Timeout"
}
```

**Error Response Format:**
```json
{
  "detail": "Error message",
  "status_code": 400,
  "error_code": "INVALID_CIRCUIT"  // Optional application-specific code
}
```

**HTTP Status Codes:**
- **200 OK**: Successful GET request
- **201 Created**: Successful POST (resource created)
- **400 Bad Request**: Invalid input (validation error)
- **401 Unauthorized**: Missing/invalid JWT token
- **403 Forbidden**: Insufficient permissions (e.g., accessing other user's project)
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

---

#### **3.6.3. State Management Architecture (0.5 pages)**

**Purpose**: Document Zustand store organization and data flow patterns.

**Global Stores** (Singletons):

1. **authStore** (`stores/authStore.ts:15`):
   - **State**: user, accessToken, refreshToken, isAuthenticated, isLoading
   - **Actions**: login, register, oauthLogin, logout, refreshAuth, loadUser
   - **Persistence**: localStorage (key: 'auth-storage')

2. **jobStore** (`stores/jobStore.ts:20`):
   - **State**: queue (Map<jobId, Job>), version (number)
   - **Actions**: enqueueJob, dequeueJob, addUpdate, setJobError, completeJob
   - **No Persistence**: Jobs cleared on page refresh (intentional, prevents stale jobs)

3. **projectsStore** (`stores/projectsStore.ts:18`):
   - **State**: projects (array), activeProjectId
   - **Actions**: fetchProjects, createProject, updateProject, deleteProject
   - **Persistence**: localStorage (key: 'projects-storage', TTL: 1 hour)

**Per-Circuit Stores** (Multiple Instances):

4. **CircuitStore** (`features/circuit/store/CircuitStoreContext.tsx:50`):
   - **State**: placedGates, numQubits, measurements, isExecuting, executionProgress
   - **Actions**: setPlacedGates, setNumQubits, addQubit, removeQubit, toggleMeasurement, group, ungroup, reset
   - **Middleware**:
     - `temporal` (Zundo): Undo/redo with 50-state limit
     - `persist`: localStorage per circuit (key: `circuit-{circuitId}-storage`)
   - **Store Registry**: `Map<circuitId, CircuitStoreApi>` manages multiple instances

**Data Flow:**
```
User Action → Component → Zustand Store Action → State Update → Re-render Components

Example:
User drags gate → CircuitCanvas → circuitStore.setPlacedGates([...gates, newGate]) →
Zundo adds to pastStates → placedGates updated → CircuitCanvas re-renders →
Debounced API call → Backend updates MongoDB
```

---

### **3.7. Core Functionality Design (4 pages)**

**Purpose**: Document algorithms, design patterns, and architectural decisions for key features.

---

#### **3.7.1. Quantum Circuit Representation (1 page)**

**Purpose**: Define data structure for gates with dependencies (DAG).

**Data Structure:**
```typescript
interface Gate {
  id: string;               // UUID
  depth: number;            // Execution order (topological sort)
  gate: {name: string};     // Gate type ("H", "CNOT", ...)
  targetQubits: number[];   // Qubits operated on
  controlQubits: number[];  // Control qubits (for CNOT, CCX)
  parameters?: number[];    // Gate parameters (for RX, RY, RZ)
  parents: string[];        // Gate IDs that must execute before this gate
  children: string[];       // Gate IDs that depend on this gate
}

// Circuit stored as flat array + adjacency lists
placedGates: (Gate | Circuit)[]
```

**Design Rationale:**
- **Flat Array**: Simple iteration, easy serialization to MongoDB/JSON
- **Adjacency List (parents/children)**: Sparse graph, O(1) edge addition, O(V+E) space
- **Depth Field**: Cached topological sort, avoids DFS on every render (O(1) sort by depth)

**Algorithms:**

**1. Topological Sort (Kahn's Algorithm) - O(V + E):**
```python
def calculate_depths(gates: List[Gate]) -> List[Gate]:
    # Build in-degree map
    in_degree = {g.id: len(g.parents) for g in gates}

    # Queue gates with no parents (in-degree = 0)
    queue = [g for g in gates if in_degree[g.id] == 0]
    depth = 0

    while queue:
        # Process all gates at current depth
        next_queue = []
        for gate in queue:
            gate.depth = depth
            for child_id in gate.children:
                in_degree[child_id] -= 1
                if in_degree[child_id] == 0:
                    child = find_gate_by_id(gates, child_id)
                    next_queue.append(child)
        queue = next_queue
        depth += 1

    return gates
```

**2. Cycle Detection (DFS with Color Marking) - O(V + E):**
```typescript
enum Color {White, Gray, Black}

function hasCycle(gates: Gate[]): boolean {
  const color: Map<string, Color> = new Map();
  gates.forEach(g => color.set(g.id, Color.White));

  function visit(gateId: string): boolean {
    if (color.get(gateId) === Color.Gray) return true;  // Cycle found
    if (color.get(gateId) === Color.Black) return false; // Already visited

    color.set(gateId, Color.Gray);
    const gate = findGateById(gates, gateId);
    for (const childId of gate.children) {
      if (visit(childId)) return true;
    }
    color.set(gateId, Color.Black);
    return false;
  }

  for (const gate of gates) {
    if (color.get(gate.id) === Color.White && visit(gate.id)) {
      return true;
    }
  }
  return false;
}
```

**3. Collision Detection - O(n):**
```typescript
function hasCollision(gates: Gate[], newGate: Gate): boolean {
  return gates.some(g =>
    g.depth === newGate.depth &&
    g.targetQubits.some(q => newGate.targetQubits.includes(q) || newGate.controlQubits.includes(q))
  );
}
```

**Serialization Format (MongoDB/JSON):**
```json
{
  "gates": [
    {
      "id": "h-uuid",
      "depth": 0,
      "gate": {"name": "H"},
      "target_qubits": [0],
      "control_qubits": [],
      "parents": [],
      "children": ["cnot-uuid"]
    },
    {
      "id": "cnot-uuid",
      "depth": 1,
      "gate": {"name": "CNOT"},
      "target_qubits": [1],
      "control_qubits": [0],
      "parents": ["h-uuid"],
      "children": []
    }
  ]
}
```

---

#### **3.7.2. Job Execution Pipeline (1 page)**

**Purpose**: Document SSH communication, job state management, and error handling.

**State Machine** (Reference: [job_execution_state_diagram.plantuml](docs/state_diagram/job_execution_state_diagram.plantuml)):

**States**: Pending → Running → Complete / Error

**Job Lifecycle Steps:**

1. **Job Creation** (Frontend):
   - User clicks "Execute" button
   - Frontend generates `job_id` (UUID)
   - Adds job to `jobStore.queue` with status "pending"

2. **Job Submission** (API Call):
   - Frontend: `POST /api/v1/circuits/{id}/partition {strategy, max_size}`
   - Backend: Adds job to `active_jobs` dict

3. **WebSocket Room Setup**:
   - Backend creates room `partition-{job_id}`
   - Frontend auto-joins room via `useJobManager` hook

4. **SSH Connection** (Backend):
   - Get or create `SquanderClient` from connection pool
   - If not connected: `await client.connect()` (establish SSH)

5. **Circuit Upload** (Backend):
   - Serialize circuit to QASM format
   - Upload via SFTP: `await client.upload_file(local_path, remote_path)`
   - Broadcast: `{type: "phase", phase: "uploading", progress: 20}`

6. **SQUANDER Execution** (Backend):
   - Execute remote command: `squander partition --strategy kahn --input circuit.qasm --output result.json`
   - Stream STDOUT: `async for update in client.stream_command_output()`
   - Parse progress: Regex match for "Partition X: ..." patterns
   - Broadcast updates: `{type: "log", message, progress}`

7. **Result Download** (Backend):
   - Download result JSON: `await client.download_file(remote_result, local_result)`
   - Broadcast: `{type: "phase", phase: "downloading", progress: 85}`

8. **Result Processing** (Backend):
   - Parse JSON, compute fidelity, probabilities
   - Store in MongoDB: `db.projects.update_one(..., {"$set": {"circuits.$.results": results}})`

9. **Job Completion** (Backend + Frontend):
   - Backend broadcasts: `{type: "complete", results: {...}}`
   - Frontend: `jobStore.completeJob(job_id)`
   - Frontend: Show success toast, open results panel

**Error Handling:**

- **SSH Connection Failure**: Retry 3 times with exponential backoff (1s, 2s, 4s), then fail
- **SQUANDER Timeout**: If execution exceeds `SQUANDER_EXEC_TIMEOUT` (300s), kill process, mark as error
- **Parse Error**: If result JSON invalid, log error, mark job as error with message "Failed to parse results"
- **Network Disconnect**: Frontend detects WebSocket close, shows "Connection lost" warning, auto-reconnect

**Design Patterns:**
- **Observer Pattern**: WebSocket subscribers receive updates (pub/sub)
- **Command Pattern**: Job execution encapsulated as command object
- **Timeout Pattern**: Async timeout wrapper using `asyncio.wait_for()`

---

#### **3.7.3. Real-time Communication Design (1 page)**

**Purpose**: Document WebSocket protocol, room management, and reconnection logic.

**WebSocket Architecture:**

**Backend (FastAPI WebSocket):**
- **ConnectionManager Singleton**: Manages all WebSocket connections
  - `connections: Dict[str, WebSocket]` - Active connections
  - `rooms: Dict[str, Set[str]]` - Room membership
  - `sessions: Dict[str, Dict]` - Session metadata (last_used, user_id)

**Frontend (react-use-websocket):**
- **useWebSocket Hook**: Wraps WebSocket API
  - Auto-reconnect with exponential backoff (1s, 2s, 4s, ..., max 30s)
  - Message queue: Buffer messages during disconnect, send when reconnected
  - Heartbeat: Send ping every 30s, expect pong within 5s

**Room-Based Broadcasting:**

**Design:**
- Each job has a dedicated room: `{jobType}-{jobId}`
- Only users who own the job can join the room (verified by backend)
- Messages sent to room broadcast to all connections in that room

**Example:**
```typescript
// Frontend joins room
useEffect(() => {
  if (jobId && jobType) {
    joinRoom(`${jobType}-${jobId}`, jobId);
  }
  return () => {
    if (jobId && jobType) {
      leaveRoom(`${jobType}-${jobId}`);
    }
  };
}, [jobId, jobType]);

// Backend broadcasts to room
await manager.broadcast_to_room(
  f"{job_type}-{job_id}",
  {"type": "phase", "phase": "executing", "progress": 60}
)
```

**Message Flow:**
```
Backend (SQUANDER) → SquanderClient (parse) →
ConnectionManager.broadcast_to_room() →
WebSocket send() →
Frontend useWebSocket (receive) →
useMessageBus.broadcastMessage() →
useJobManager (subscribed) →
jobStore.addUpdate() →
React re-render (progress bar updates)
```

**Reconnection Logic:**
```typescript
// react-use-websocket config
const {sendMessage} = useWebSocket(wsUrl, {
  shouldReconnect: (closeEvent) => true,  // Always reconnect
  reconnectAttempts: 10,
  reconnectInterval: (attemptNumber) =>
    Math.min(Math.pow(2, attemptNumber) * 1000, 30000),  // Exponential backoff, max 30s
  onOpen: () => {
    console.log('WebSocket connected');
    // Re-join all rooms
    activeJobs.forEach(job => joinRoom(job.roomName, job.jobId));
  },
  onClose: () => {
    console.log('WebSocket disconnected');
    // Show warning to user
  }
});
```

**Scalability Considerations:**
- **Single-Instance Limitation**: Current design uses in-memory `ConnectionManager`, doesn't scale horizontally
- **Future Enhancement**: Add Redis pub/sub for multi-instance WebSocket support
  - Each server subscribes to Redis channel for its rooms
  - Broadcast publishes to Redis, all servers forward to local connections

---

#### **3.7.4. Authentication & Authorization Design (1 page)**

**Purpose**: Document OAuth integration, JWT token management, and security measures.

**OAuth Flow Design:**

**Google OAuth:**
```
User clicks "Sign in with Google" →
Frontend: GoogleLogin component (popup) →
Google OAuth Server: Show consent screen →
User grants permissions →
Google returns ID token (JWT) →
Frontend: POST /api/v1/auth/oauth/login {token, provider: "google"} →
Backend: Verify token with google.oauth2.id_token.verify_oauth2_token() →
Google's public key fetched (cached), signature validated →
Extract email, sub (Google user ID), name →
Backend: Find user by oauth_provider="google" AND oauth_subject_id=sub →
If not found: Check email, link OAuth or create new user →
Backend: Generate JWT access (30min) + refresh (7 days) tokens →
Return {access_token, refresh_token, user} →
Frontend: Store in authStore (localStorage)
```

**Microsoft OAuth:**
- Similar flow, but token format is `id_token|access_token` (pipe-separated)
- Backend splits token, verifies ID token with Microsoft's public keys
- Uses access token to fetch profile picture from Graph API

**JWT Token Structure:**
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user@example.com",        // User email (subject)
    "exp": 1704998400,                // Expiration timestamp
    "type": "access"                  // Token type (access or refresh)
  },
  "signature": "..."                  // HMAC-SHA256(header + payload, SECRET_KEY)
}
```

**Token Lifecycle:**
1. **Login**: Backend creates access (30min) + refresh (7 days) tokens
2. **API Request**: Frontend includes access token in `Authorization: Bearer {token}` header
3. **Token Validation**: Backend middleware verifies token signature, checks expiration
4. **Token Expiration**: After 30min, access token invalid
5. **Token Refresh**: Frontend detects 401 error, calls `POST /api/v1/auth/refresh {refresh_token}`
6. **New Access Token**: Backend verifies refresh token, generates new access token (refresh token reused)
7. **Retry Request**: Frontend retries original request with new access token

**Auto-Refresh Implementation (axios interceptor):**
```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;  // Prevent infinite loop
      try {
        await authStore.getState().refreshAuth();  // Refresh token
        error.config.headers.Authorization = `Bearer ${authStore.getState().accessToken}`;
        return apiClient.request(error.config);  // Retry
      } catch (refreshError) {
        authStore.getState().logout();  // Refresh failed, logout
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

**Security Measures:**
- **Secret Key**: Strong random key (32+ bytes), stored in `.env`, never exposed to frontend
- **Token Expiration**: Short-lived access tokens (30min) limit damage if stolen
- **Refresh Token Rotation**: (Future enhancement) Generate new refresh token on each refresh
- **HTTPS Only**: Tokens transmitted only over HTTPS (TLS encryption)
- **XSS Protection**: Tokens stored in localStorage (vulnerable to XSS), future: use httpOnly cookies
- **CSRF Protection**: JWT in Authorization header (not cookies), immune to CSRF

**Design Patterns:**
- **Interceptor Pattern**: Axios interceptors handle token refresh transparently
- **Factory Pattern**: Token creation functions (`create_access_token`, `create_refresh_token`)
- **Dependency Injection**: `Depends(get_current_user)` injects authenticated user into endpoints

---

**[PART 2 CONTINUES IN NEXT FILE DUE TO LENGTH...]**

---

**This is the end of PART 2. The outline continues with:**
- **REQUIREMENT 5**: Realization / Implementation Documentation (22-28 pages)
- **REQUIREMENT 6**: Testing Documentation (15-20 pages)
- **REQUIREMENT 7**: Running Software Demonstration (6 points)
- **Bibliography** (35+ items)
- **Timeline, Priority Order, Common Pitfalls, Final Checklist**
