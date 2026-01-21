# Qubit Frontend

React + TypeScript + Vite quantum circuit visualization application.

## Setup

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8000/api/v1` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | `*.apps.googleusercontent.com` |
| `VITE_MICROSOFT_CLIENT_ID` | Azure AD client ID | `uuid` |
| `VITE_DEV_PORT` | Development server port (optional) | `3000` |

## Running

```bash
npm run dev       # Development server (http://localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint check
```

## Project Structure

```
src/
├── components/
│   └── ui/              # Reusable UI components (shadcn/ui)
├── features/
│   ├── circuit/         # Circuit state, DAG logic, validation
│   ├── composer/        # Drag-and-drop circuit builder
│   ├── gates/           # Gate definitions and utilities
│   ├── inspector/       # Gate property inspector
│   └── results/         # Visualization components
├── hooks/               # Custom React hooks (WebSocket, auth, etc.)
├── i18n/                # Internationalization (i18next)
├── lib/
│   ├── api/             # Axios API client
│   └── qasm/            # OpenQASM 2.0 parser/generator
├── pages/               # Route components
├── providers/           # Context providers (theme, auth)
├── stores/              # Zustand state management
│   ├── authStore.ts     # Authentication state
│   ├── projectStore.ts  # Project management
│   └── circuitStore.ts  # Circuit editor state
├── styles/              # Global styles
└── types/               # TypeScript type definitions
```

## Key Features

| Feature | Location | Description |
|---------|----------|-------------|
| Circuit Composer | `features/composer` | Drag-and-drop gate placement |
| QASM Editor | `lib/qasm` | OpenQASM 2.0 import/export |
| Visualizations | `features/results` | D3/Plotly charts for quantum states |
| State Management | `stores/` | Zustand with undo/redo (zundo) |
| Real-time Updates | `hooks/useWebSocket` | Job status via WebSocket |

## Testing

### Unit Tests (Vitest)

```bash
npm run test          # Run tests
npm run test:ui       # Visual dashboard
npm run test:coverage # Coverage report
```

### E2E Tests (Cypress)

Requires backend and frontend servers running:

```bash
npm run cy:open       # Interactive mode
npm run cy:run        # Headless mode
```

E2E test coverage:
- `01-authentication.cy.ts` - Login/logout flows
- `02-project-management.cy.ts` - Project CRUD
- `03-circuit-composer.cy.ts` - Gate drag-and-drop
- `04-circuit-import.cy.ts` - QASM import
- `05-circuit-partition.cy.ts` - Partitioning workflow
- `06-circuit-results.cy.ts` - Results visualization
