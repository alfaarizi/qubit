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

## Unit Tests

Run unit tests with Vitest:

```bash
npm run test          # Run all tests
npm run test:ui       # Visual dashboard
npm run test:coverage # Coverage report
```

Unit tests are organized by feature:
- **stores** - Zustand state management
- **features/gates** - Gate utilities and validation
- **features/circuit** - Circuit store and DAG logic
- **lib/qasm** - QASM conversion

## E2E Tests

Run end-to-end tests with Cypress (requires frontend server running):

```bash
npm run cy:open       # Interactive test runner
npm run cy:run        # Headless mode
```

E2E tests cover:
- **auth.cy.ts** - Authentication flow
- **circuit-compose.cy.ts** - Circuit composition
- **visualization.cy.ts** - Results visualization
- **performance.cy.ts** - UI responsiveness
