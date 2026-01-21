# Qubitkit

<a href="https://github.com/alfaarizi/qubit/blob/main/LICENSE"><img src="https://img.shields.io/github/license/alfaarizi/qubit" alt="License"></a>
<a href="https://github.com/alfaarizi/qubit/deployments"><img src="https://img.shields.io/github/deployments/alfaarizi/qubit/production" alt="Deployment"></a>
<a href="https://github.com/alfaarizi/qubit/commits/main"><img src="https://img.shields.io/github/last-commit/alfaarizi/qubit" alt="Last commit"></a>

**Quantum Unitary Benchmarking and Interactive Toolkit**

A comprehensive web-based platform for designing, simulating, and analyzing quantum circuits with advanced visualization capabilities powered by the SQUANDER library.

<p align="center">
  <img src="squander_logo_light_sm.png" alt="SQUANDER Logo" width="400"/>
</p>

## Features

- **Visual Circuit Composer** - Drag-and-drop interface for building quantum circuits
- **QASM Editor** - Write and edit circuits using OpenQASM 2.0
- **Circuit Partitioning** - Optimize circuits using SQUANDER's partitioning algorithms
- **Visualizations** - Statevector density, measurement probabilities, entropy, partition structures
- **Project Management** - Organize multiple quantum circuits and experiments
- **Job Monitoring** - Real-time execution tracking via WebSocket

## Tech Stack

| Component | Technologies |
|-----------|-------------|
| Frontend  | React 19, TypeScript, Vite, TailwindCSS, Zustand, D3, Plotly |
| Backend   | FastAPI, MongoDB, WebSocket, SQUANDER |
| Auth      | Google OAuth, Azure MSAL, JWT |

## Prerequisites

- **Node.js** 18+
- **Python** 3.8+
- **MongoDB** (local or Atlas)
- **SQUANDER** library (optional, for circuit partitioning)

## Quick Start

```bash
# Clone repository
git clone https://github.com/alfaarizi/qubit.git
cd qubit

# Backend setup
cd backend
cp .env.example .env          # Configure environment variables
pip install -e .
serve                         # Runs on http://localhost:8000

# Frontend setup (new terminal)
cd frontend
cp .env.example .env.local    # Configure environment variables
npm install
npm run dev                   # Runs on http://localhost:5173
```

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for detailed configuration.

## Project Structure

```
qubit/
├── backend/              # FastAPI backend
│   ├── app/              # Application code
│   │   ├── api/          # REST & WebSocket endpoints
│   │   ├── core/         # Config, security, dependencies
│   │   ├── db/           # MongoDB connection
│   │   ├── models/       # Database models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic
│   └── tests/            # Unit, integration, performance tests
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── features/     # Feature modules (circuit, gates, results)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities (QASM parser, API client)
│   │   ├── pages/        # Route pages
│   │   └── stores/       # Zustand state management
│   └── cypress/          # E2E tests
├── packages/qubitkit/    # Python package (PyPI)
└── docs/                 # Documentation
```

## QubitKit Python Package

```bash
pip install -i https://test.pypi.org/simple/ qubitkit
```

## License

Apache-2.0 - see [LICENSE](LICENSE)

---

*Powered by [SQUANDER](https://github.com/rakytap/sequential-quantum-gate-decomposer)*
