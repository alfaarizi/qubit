# Qubit Frontend

React + TypeScript + Vite quantum circuit visualization and manipulation application.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Testing

### Run Unit Tests

```bash
npm run test
```

### View Test UI Dashboard

```bash
npm run test:ui
```

### Generate Coverage Report

```bash
npm run test:coverage
```

## Testing Structure

Unit tests are organized by feature:
- **stores** - Zustand state management
- **features/gates** - Gate utilities and validation
- **features/circuit** - Circuit store and DAG logic
- **lib/qasm** - QASM conversion

See `src/test/README.md` for more details.
