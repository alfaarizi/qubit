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

- **Visual Circuit Composer** - Intuitive drag-and-drop interface for building quantum circuits
- **QASM Editor** - Write and edit circuits using OpenQASM 2.0
- **Circuit Partitioning** - Optimize large quantum circuits using SQUANDER's partitioning algorithms
- **Advanced Visualizations** - Explore statevector density, measurement probabilities, entropy, and partition structures
- **Project Management** - Organize and track multiple quantum circuits and experiments
- **Job Monitoring** - Real-time execution tracking and result analysis

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: FastAPI (Python) + MongoDB
- **Quantum Computing**: SQUANDER library, QubitKit Python package
- **Authentication**: Google, Azure MSAL

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- MongoDB

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/qubit.git
cd qubit
```

2. Start the backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .
uvicorn src.main:app --reload
```

3. Start the frontend:
```bash
cd frontend
npm install
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## QubitKit Python Package

The QubitKit package is available on [Test PyPI](https://test.pypi.org/project/qubitkit/0.1.0/):

```bash
pip install -i https://test.pypi.org/simple/ qubitkit
```

## License

Apache-2.0 - see [LICENSE](LICENSE) for details

## About SQUANDER

This project leverages the [SQUANDER](https://github.com/rakytap/sequential-quantum-gate-decomposer) library for quantum circuit decomposition and optimization.
