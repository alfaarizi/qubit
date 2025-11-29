/// <reference types="cypress" />

/**
 * test data fixtures for E2E tests
 */
export const testData = {
  auth: {
    testEmail: 'ziziyusrizal@gmail.com', // use verified email for testing
    verificationCode: '12345',
  },
  projects: {
    defaultName: 'Test Circuit',
    defaultDescription: 'A test quantum circuit',
  },
  qasmCode: `OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
h q[0];
cx q[0],q[1];`,
} as const

/**
 * common selectors used throughout the app
 */
export const selectors = {
  auth: {
    emailInput: 'input[type="email"]',
    sendCodeButton: 'button:contains("Continue with Email")',
    codeInputs: '[data-testid^="code-input-"]',
    verifyButton: 'button[type="submit"]:contains("Continue")',
  },
  navigation: {
    userMenu: '[data-testid="user-menu"]',
    logoutButton: '[role="menuitem"]:contains("Sign out")',
    themeToggle: '[data-testid="theme-toggle"]',
    languageSwitcher: '[data-testid="language-switcher"]',
  },
  projects: {
    // Toolbar and filters
    sidebar: '[data-testid="projects-sidebar"]',
    toolbar: '[data-testid="projects-toolbar"]',
    searchInput: '[data-testid="projects-search-input"]',
    viewToggleGrid: '[data-testid="projects-view-toggle-grid"]',
    viewToggleList: '[data-testid="projects-view-toggle-list"]',
    newButton: '[data-testid="projects-new-button"]',

    // Filters
    filterAll: '[data-testid="projects-filter-all"]',
    filterYours: '[data-testid="projects-filter-yours"]',
    filterShared: '[data-testid="projects-filter-shared"]',
    filterArchived: '[data-testid="projects-filter-archived"]',
    filterTrashed: '[data-testid="projects-filter-trashed"]',

    // Project cards/list
    grid: '[data-testid="projects-grid"]',
    list: '[data-testid="projects-list"]',
    card: (id: string) => `[data-testid="project-card-${id}"]`,
    cardAny: '[data-testid^="project-card-"]',
    actionsMenu: (id: string) => `[data-testid="project-actions-menu-${id}"]`,
    actionsMenuAny: '[data-testid^="project-actions-menu-"]',
    actionOpen: '[data-testid="project-action-open"]',
    actionRename: '[data-testid="project-action-rename"]',
    actionDuplicate: '[data-testid="project-action-duplicate"]',
    actionDelete: '[data-testid="project-action-delete"]',

    // Create dialog
    createDialog: '[data-testid="project-create-dialog"]',
    nameInput: '[data-testid="project-name-input"]',
    descriptionInput: '[data-testid="project-description-input"]',
    createSubmit: '[data-testid="project-create-submit"]',

    // Rename dialog
    renameDialog: '[data-testid="project-rename-dialog"]',
    renameNameInput: '[data-testid="project-rename-name-input"]',
    renameDescriptionInput: '[data-testid="project-rename-description-input"]',
    renameSubmit: '[data-testid="project-rename-submit"]',

    // Delete dialog
    deleteDialog: '[data-testid="project-delete-dialog"]',
    deleteConfirm: '[data-testid="project-delete-confirm"]',

    // Project metadata
    metadataTimestamp: '[data-testid="project-metadata-timestamp"]',
    metadataCircuitCount: '[data-testid="project-metadata-circuit-count"]',
  },
  composer: {
    canvas: '[data-testid="circuit-canvas"]',
    toolbar: '[data-testid="circuit-toolbar"]',

    // Circuit tab controls
    addCircuitTabButton: '[data-testid="add-circuit-tab-button"]',
    circuitTabAny: '[data-testid^="circuit-tab-"]',
    circuitTabContentAny: '[data-testid^="circuit-tab-content-"]',

    // Qubit controls
    addQubitButton: '[data-testid="add-qubit-button"]',
    removeQubitButton: '[data-testid="remove-qubit-button"]',

    // File menu and QASM import
    fileMenuButton: '[data-testid="file-menu-button"]',
    importQasmButton: '[data-testid="import-qasm-button"]',
    qasmFileInput: '[data-testid="qasm-file-input"]',

    // Edit controls
    undoButton: '[data-testid="undo-button"]',
    redoButton: '[data-testid="redo-button"]',
    clearButton: '[data-testid="clear-circuit-button"]',

    // Partition controls
    backendSelect: '[data-testid="partition-backend-select"]',
    strategySelect: '[data-testid="partition-strategy-select"]',
    strategyOption: (value: string) => `[data-testid="strategy-${value}"]`,
    maxPartitionSizeSelect: '[data-testid="max-partition-size-select"]',
    maxPartitionSizeOption: (size: number) => `[data-testid="max-partition-size-${size}"]`,
    timeoutInput: '[data-testid="simulation-timeout-input"]',

    // Execution controls
    runButton: '[data-testid="run-circuit-button"]',
    abortButton: '[data-testid="abort-execution-button"]',

    // Simulation options
    simulationOptionsButton: '[data-testid="simulation-options-button"]',
    optionDensityMatrix: '[data-testid="option-density-matrix"]',
    optionEntropy: '[data-testid="option-entropy"]',
  },
  results: {
    // Main panel
    resultsPanel: '[data-testid="results-panel"]',
    emptyState: '[data-testid="results-empty-state"]',
    summaryCard: '[data-testid="results-summary-card"]',

    // Metadata
    metadata: '[data-testid="results-metadata"]',
    fidelity: '[data-testid="results-fidelity"]',
    errors: '[data-testid="results-errors"]',

    // Partition visualizations
    partitionSection: '[data-testid="results-partition-section"]',
    partitionViewer: '[data-testid="results-partition-viewer"]',
    partitionHistogram: '[data-testid="results-partition-histogram"]',

    // Measurement visualizations
    measurementsSection: '[data-testid="results-measurements-section"]',
    measurementHistograms: '[data-testid="results-measurement-histograms"]',
    measurementOriginal: '[data-testid="results-measurement-original"]',
    measurementPartitioned: '[data-testid="results-measurement-partitioned"]',
    probabilityComparison: '[data-testid="results-probability-comparison"]',

    // Quantum state visualizations
    quantumStateSection: '[data-testid="results-quantum-state-section"]',
    stateVectors: '[data-testid="results-state-vectors"]',
    stateVectorOriginal: '[data-testid="results-state-vector-original"]',
    stateVectorPartitioned: '[data-testid="results-state-vector-partitioned"]',
    densityMatrices: '[data-testid="results-density-matrices"]',
    densityMatrixOriginal: '[data-testid="results-density-matrix-original"]',
    densityMatrixPartitioned: '[data-testid="results-density-matrix-partitioned"]',

    // Entropy visualizations
    entropySection: '[data-testid="results-entropy-section"]',
    entropyChart: '[data-testid="results-entropy-chart"]',
  },
} as const

/**
 * wait for page navigation and content to be ready
 */
export function waitForPageLoad(): void {
  cy.get('body').should('exist')
}

/**
 * check if user is authenticated by looking for protected content
 */
export function isUserAuthenticated(): boolean {
  // check if we're not on login page
  return !cy.url().should('not.include', '/login')
}

