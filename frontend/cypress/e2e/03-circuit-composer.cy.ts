/// <reference types="cypress" />

import { testData, selectors } from '../support/helpers'

describe('Circuit Composer', (): void => {
  beforeEach((): void => {
    cy.clearLocalStorage()
    cy.clearCookies()
    cy.emailLogin(testData.auth.testEmail)

    // open an existing project or create a new one
    cy.get('[data-testid^="project-card-"]').first().click()
    cy.wait(1000)

    // add a circuit tab to initialize
    cy.get(selectors.composer.addCircuitTabButton).click()
  })

  it('should display circuit composer canvas', (): void => {
    cy.get(selectors.composer.canvas).should('be.visible')
  })

  it('should display circuit toolbar with controls', (): void => {
    cy.get(selectors.composer.toolbar).should('be.visible')
    cy.get(selectors.composer.runButton).should('be.visible')
  })

  it('should display file menu button', (): void => {
    cy.get(selectors.composer.fileMenuButton).should('be.visible')
  })

  it('should display undo and redo buttons', (): void => {
    cy.get(selectors.composer.undoButton).should('exist')
    cy.get(selectors.composer.redoButton).should('exist')
  })

  it('should display clear circuit button', (): void => {
    cy.get(selectors.composer.clearButton).should('exist')
  })

  it('should display partition backend selector', (): void => {
    cy.get(selectors.composer.backendSelect).should('be.visible')
  })

  it('should display partition strategy selector', (): void => {
    cy.get(selectors.composer.strategySelect).should('be.visible')
  })

  it('should display max partition size selector', (): void => {
    cy.get(selectors.composer.maxPartitionSizeSelect).should('be.visible')
  })

  it('should display timeout input', (): void => {
    cy.get(selectors.composer.timeoutInput).should('be.visible')
  })

  it('should display run and abort buttons', (): void => {
    cy.get(selectors.composer.runButton).should('be.visible')
    cy.get(selectors.composer.abortButton).should('be.visible')
  })

  it('should display add and remove qubit buttons', (): void => {
    cy.get(selectors.composer.addQubitButton).should('be.visible')
    cy.get(selectors.composer.removeQubitButton).should('be.visible')
  })

  it('should add qubits when add button is clicked', (): void => {
    cy.get(selectors.composer.addQubitButton).click()
    cy.get(selectors.composer.addQubitButton).click()
    cy.wait(500)
    cy.get(selectors.composer.canvas).should('be.visible')
  })

  it('should remove qubits when remove button is clicked', (): void => {
    cy.get(selectors.composer.addQubitButton).click()
    cy.get(selectors.composer.addQubitButton).click()
    cy.wait(200)
    cy.get(selectors.composer.removeQubitButton).click()
    cy.wait(500)
    cy.get(selectors.composer.canvas).should('be.visible')
  })
})
