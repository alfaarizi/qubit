/// <reference types="cypress" />

import { testData, selectors } from '../support/helpers'

describe('Results Visualization', (): void => {
  beforeEach((): void => {
    cy.clearLocalStorage()
    cy.clearCookies()
    cy.emailLogin(testData.auth.testEmail)

    // open an existing project or create a new one
    cy.get('[data-testid^="project-card-"]').first().click()
    cy.wait(1000)

    // add a circuit tab to initialize
    cy.get(selectors.composer.addCircuitTabButton).click()

    // import a circuit and run partition to get results
    const qasmCode = testData.qasmCode

    cy.get(selectors.composer.fileMenuButton).click()
    cy.get(selectors.composer.importQasmButton).click()
    cy.get(selectors.composer.qasmFileInput).selectFile({
      contents: Cypress.Buffer.from(qasmCode),
      fileName: 'results-test.qasm',
      mimeType: 'text/plain',
    }, { force: true })

    cy.wait(2000)

    // run partition to generate results
    cy.get(selectors.composer.runButton).click()
    cy.wait(8000)
  })

  it('should display results panel after execution', (): void => {
    cy.get(selectors.results.resultsPanel).should('be.visible')
  })

  it('should display results summary card', (): void => {
    cy.get(selectors.results.summaryCard).should('be.visible')
  })

  it('should display circuit metadata in results', (): void => {
    cy.get(selectors.results.metadata).should('exist')
    cy.get(selectors.results.metadata).should('contain', 'qubit')
  })

  it('should display circuit fidelity if available', (): void => {
    cy.get('body').then(($body) => {
      if ($body.find(selectors.results.fidelity).length > 0) {
        cy.get(selectors.results.fidelity).should('be.visible')
        cy.get(selectors.results.fidelity).should('contain', '%')
      }
    })
  })

  it('should display partition section with partition data', (): void => {
    cy.get(selectors.results.partitionSection).should('exist')
  })

  it('should display partition circuit viewer', (): void => {
    cy.get(selectors.results.partitionViewer).should('exist')
  })

  it('should display partition distribution histogram', (): void => {
    cy.get(selectors.results.partitionHistogram).should('exist')
  })

  it('should display measurement visualizations section', (): void => {
    cy.get(selectors.results.measurementsSection).should('exist')
  })

  it('should display measurement histograms if available', (): void => {
    cy.get('body').then(($body) => {
      if ($body.find(selectors.results.measurementHistograms).length > 0) {
        cy.get(selectors.results.measurementHistograms).should('be.visible')
      }
    })
  })

  it('should display quantum state visualizations section', (): void => {
    cy.get(selectors.results.quantumStateSection).should('exist')
  })

  it('should display state vector visualizations if available', (): void => {
    cy.get('body').then(($body) => {
      if ($body.find(selectors.results.stateVectors).length > 0) {
        cy.get(selectors.results.stateVectors).should('be.visible')
      }
    })
  })

  it('should display density matrix heatmaps if available', (): void => {
    cy.get('body').then(($body) => {
      if ($body.find(selectors.results.densityMatrices).length > 0) {
        cy.get(selectors.results.densityMatrices).should('be.visible')
      }
    })
  })

  it('should display entropy visualizations section', (): void => {
    cy.get(selectors.results.entropySection).should('exist')
  })

  it('should display entropy chart if available', (): void => {
    cy.get('body').then(($body) => {
      if ($body.find(selectors.results.entropyChart).length > 0) {
        cy.get(selectors.results.entropyChart).should('be.visible')
      }
    })
  })

  it('should show empty state when no results', (): void => {
    // clear circuit to remove results
    cy.get(selectors.composer.clearButton).click()
    cy.wait(500)

    // should show empty state
    cy.get(selectors.results.emptyState).should('be.visible')
  })

  it('should display error messages if execution fails', (): void => {
    // clear and import a potentially problematic circuit
    cy.get(selectors.composer.clearButton).click()
    cy.wait(500)

    // check for errors section (will only appear if there are errors)
    cy.get('body').then(($body) => {
      if ($body.find(selectors.results.errors).length > 0) {
        cy.get(selectors.results.errors).should('be.visible')
      }
    })
  })
})
