/// <reference types="cypress" />

import { selectors } from '../support/helpers'

describe('Circuit Results', (): void => {
  const testProject = `Test Project ${crypto.randomUUID()}`
  let projectId: string

  before((): void => {
    cy.ensureProjectAndCircuitTab(testProject)
    cy.url().then((url) => {
      const match = url.match(/\/project\/([^/]+)/)
      if (match) {
        projectId = match[1]
      }
    })

    cy.fixture('4mod5-v0_20.qasm').then((qasmContent) => {
      cy.get(selectors.composer.qasmFileInput).selectFile({
        contents: Cypress.Buffer.from(qasmContent),
        fileName: '4mod5-v0_20.qasm',
        mimeType: 'text/plain',
      }, { force: true })
    })
    cy.get(selectors.composer.canvas, { timeout: 30000 }).should('be.visible')
    cy.get(selectors.composer.canvas).within(() => {
      cy.get('g', { timeout: 30000 }).should('exist')
    })
    cy.wait(8000)
  })

  beforeEach((): void => {
    cy.url().then((url) => {
      if (!url.includes(`/project/${projectId}`)) {
        cy.visit(`/project/${projectId}`)
        cy.get(selectors.composer.addCircuitTabButton, { timeout: 10000 }).should('be.visible')
        cy.wait(2000)
        cy.get('body').then(($body) => {
          const tabs = Cypress.$(selectors.composer.circuitTabAny)
          if (tabs.length > 0) {
            cy.get(selectors.composer.circuitTabAny, { timeout: 5000 }).first().click()
            cy.get(selectors.composer.circuitTabContentAny, { timeout: 10000 })
              .should('have.attr', 'data-state', 'active')
          } else {
            cy.get(selectors.composer.addCircuitTabButton).click({ force: true })
            cy.get(selectors.composer.circuitTabAny, { timeout: 5000 }).should('exist')
            cy.get(selectors.composer.circuitTabContentAny, { timeout: 10000 })
              .should('have.attr', 'data-state', 'active')
          }
        })
      } else {
        cy.get('body').then(($body) => {
          const tabs = Cypress.$(selectors.composer.circuitTabAny)
          if (tabs.length > 0) {
            cy.get(selectors.composer.circuitTabAny, { timeout: 5000 }).first().click()
            cy.get(selectors.composer.circuitTabContentAny, { timeout: 10000 })
              .should('have.attr', 'data-state', 'active')
          }
        })
      }
    })
    cy.get(selectors.composer.canvas, { timeout: 10000 }).should('be.visible')
  })

  after(() => {
    cy.deleteProject(testProject)
  })

  it('should show empty state when no results', (): void => {
    cy.get(selectors.results.emptyState, { timeout: 10000 }).should('be.visible')
  })

  it('should run partition execution to generate results', (): void => {
    cy.get(selectors.composer.toolbar, { timeout: 10000 }).should('be.visible')
    cy.wait(500)
    
    cy.get(selectors.composer.strategySelect).click()
    cy.get(selectors.composer.strategyOption('gtqcp'), { timeout: 5000 }).click()
    cy.wait(500)

    cy.get(selectors.composer.maxPartitionSizeSelect).click()
    cy.get(selectors.composer.maxPartitionSizeOption(4), { timeout: 5000 }).click()
    cy.wait(500)

    cy.get(selectors.composer.runButton, { timeout: 10000 }).should('exist')
    cy.get(selectors.composer.runButton).should('not.be.disabled')
    cy.get(selectors.composer.runButton).then(($el) => {
      if (!$el.is(':visible')) {
        cy.wrap($el).scrollIntoView()
      }
    })
    cy.get(selectors.composer.runButton).click()
    cy.wait(8000)
  })

  it('should display results panel after execution', (): void => {
    cy.get(selectors.results.resultsPanel, { timeout: 10000 }).should('be.visible')
    cy.get(selectors.results.summaryCard, { timeout: 10000 }).should('be.visible')
  })

  it('should display circuit metadata in results', (): void => {
    cy.get(selectors.results.metadata, { timeout: 10000 }).should('exist')
    cy.get(selectors.results.metadata).should('contain', 'qubit')
  })

  it('should display partition visualizations', (): void => {
    cy.get(selectors.results.partitionSection, { timeout: 10000 }).should('exist')
    cy.get(selectors.results.partitionViewer, { timeout: 10000 }).should('exist')
    cy.get(selectors.results.partitionHistogram, { timeout: 10000 }).should('exist')
  })

  it('should display measurement visualizations section', (): void => {
    cy.get(selectors.results.measurementsSection, { timeout: 10000 }).should('exist')
  })

  it('should display quantum state visualizations section', (): void => {
    cy.get(selectors.results.quantumStateSection, { timeout: 10000 }).should('exist')
  })

  it('should display entropy visualizations section', (): void => {
    cy.get(selectors.results.entropySection, { timeout: 10000 }).should('exist')
  })
})
