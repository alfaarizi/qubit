/// <reference types="cypress" />

import { selectors, testData } from '../support/helpers'

describe('Circuit Composer', (): void => {
  const testProject = `Test Project ${crypto.randomUUID()}`
  let projectId: string

  before((): void => {
    cy.ensureProjectAndCircuitTab(testProject)
    // store project ID for navigation
    cy.url().then((url) => {
      const match = url.match(/\/project\/([^/]+)/)
      if (match) {
        projectId = match[1]
      }
    })
  })

  beforeEach((): void => {
    // verify we're on the composer page with canvas visible
    // if not, navigate back (should be rare after session restore)
    cy.url().then((url) => {
      if (!url.includes(`/project/${projectId}`)) {
        cy.visit(`/project/${projectId}`)
        cy.get(selectors.composer.addCircuitTabButton, { timeout: 10000 }).should('be.visible')
        cy.get('body').then(($body) => {
          const tabs = Cypress.$(selectors.composer.circuitTabAny)
          if (tabs.length > 0) {
            cy.get(selectors.composer.circuitTabAny, { timeout: 5000 }).first().click()
          } else {
            cy.get(selectors.composer.addCircuitTabButton).click({ force: true })
            cy.get(selectors.composer.circuitTabAny, { timeout: 5000 }).should('exist')
          }
        })
      }
    })
    // ensure canvas is visible
    cy.get(selectors.composer.canvas, { timeout: 10000 }).should('be.visible')
  })

  after(() => {
    cy.deleteProject(testProject)
  })

  it('should display circuit composer interface', (): void => {
    cy.get(selectors.composer.canvas).should('be.visible')
    cy.get(selectors.composer.toolbar).should('be.visible')
  })

  it('should display all toolbar controls', (): void => {
    cy.get(selectors.composer.fileMenuButton).should('be.visible')
    cy.get(selectors.composer.undoButton).should('exist')
    cy.get(selectors.composer.redoButton).should('exist')
    cy.get(selectors.composer.clearButton).should('exist')
    cy.get(selectors.composer.addQubitButton).should('be.visible')
    cy.get(selectors.composer.removeQubitButton).should('be.visible')
  })

  it('should display partition configuration controls', (): void => {
    // ensure toolbar is visible and fully rendered
    cy.get(selectors.composer.toolbar, { timeout: 10000 }).should('be.visible')
    cy.wait(500) // give toolbar time to fully render all children
    cy.get(selectors.composer.backendSelect).should('be.visible')
    cy.get(selectors.composer.strategySelect).should('be.visible')
    cy.get(selectors.composer.maxPartitionSizeSelect).should('be.visible')
    // wait for timeout input - check it exists first, then scroll into view if needed
    cy.get(selectors.composer.timeoutInput, { timeout: 10000 }).should('exist')
    cy.get(selectors.composer.timeoutInput).then(($el) => {
      if (!$el.is(':visible')) {
        cy.wrap($el).scrollIntoView()
      }
    })
    cy.get(selectors.composer.timeoutInput).should('be.visible')
  })

  it('should display execution controls', (): void => {
    // ensure toolbar is visible and fully rendered
    cy.get(selectors.composer.toolbar, { timeout: 10000 }).should('be.visible')
    cy.wait(500) // give toolbar time to fully render all children
    // wait for run button - check it exists first, then scroll into view if needed
    cy.get(selectors.composer.runButton, { timeout: 10000 }).should('exist')
    cy.get(selectors.composer.runButton).then(($el) => {
      if (!$el.is(':visible')) {
        cy.wrap($el).scrollIntoView()
      }
    })
    cy.get(selectors.composer.runButton).should('be.visible')
    cy.get(selectors.composer.abortButton).should('be.visible')
  })

  it('should add and remove qubits', (): void => {
    cy.get(selectors.composer.addQubitButton).click()
    cy.get(selectors.composer.addQubitButton).click()
    cy.wait(200)
    cy.get(selectors.composer.removeQubitButton).click()
    cy.get(selectors.composer.canvas).should('be.visible')
  })
})
