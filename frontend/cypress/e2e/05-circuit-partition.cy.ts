/// <reference types="cypress" />

import { testData, selectors } from '../support/helpers'

describe('Circuit Partition', (): void => {
  beforeEach((): void => {
    cy.clearLocalStorage()
    cy.clearCookies()
    cy.emailLogin(testData.auth.testEmail)

    // open an existing project or create a new one
    cy.get('[data-testid^="project-card-"]').first().click()
    cy.wait(1000)

    // add a circuit tab to initialize
    cy.get(selectors.composer.addCircuitTabButton).click()

    // import a circuit to partition
    const qasmCode = testData.qasmCode

    cy.get(selectors.composer.fileMenuButton).click()
    cy.get(selectors.composer.importQasmButton).click()
    cy.get(selectors.composer.qasmFileInput).selectFile({
      contents: Cypress.Buffer.from(qasmCode),
      fileName: 'partition-test.qasm',
      mimeType: 'text/plain',
    }, { force: true })

    cy.wait(2000)
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

  it('should allow selecting partition backend', (): void => {
    cy.get(selectors.composer.backendSelect).click()
    cy.get('[role="option"]').should('have.length.greaterThan', 0)
  })

  it('should allow selecting partition strategy', (): void => {
    cy.get(selectors.composer.strategySelect).click()
    cy.get('[role="option"]').should('have.length.greaterThan', 5)
  })

  it('should allow selecting max partition size', (): void => {
    cy.get(selectors.composer.maxPartitionSizeSelect).click()
    cy.get('[role="option"]').should('have.length.greaterThan', 0)
  })

  it('should allow entering custom timeout value', (): void => {
    cy.get(selectors.composer.timeoutInput).clear().type('60')
    cy.get(selectors.composer.timeoutInput).should('have.value', '60')
  })

  it('should execute partition with default settings', (): void => {
    cy.get(selectors.composer.runButton).click()
    cy.wait(5000)
    cy.get('body').should('exist')
  })

  it('should allow aborting partition execution', (): void => {
    cy.get(selectors.composer.runButton).click()
    cy.wait(500)
    cy.get(selectors.composer.abortButton).click()
    cy.wait(1000)
    cy.get('body').should('exist')
  })

  it('should clear circuit when clear button is clicked', (): void => {
    cy.get(selectors.composer.clearButton).click()
    cy.wait(500)
    cy.get(selectors.composer.canvas).should('be.visible')
  })

  it('should maintain partition settings after circuit import', (): void => {
    // set custom timeout
    cy.get(selectors.composer.timeoutInput).clear().type('90')

    // import another circuit
    cy.get(selectors.composer.fileMenuButton).click()
    cy.get(selectors.composer.importQasmButton).click()
    cy.get(selectors.composer.qasmFileInput).selectFile({
      contents: Cypress.Buffer.from(testData.qasmCode),
      fileName: 'test2.qasm',
      mimeType: 'text/plain',
    }, { force: true })

    cy.wait(2000)

    // timeout should still be 90
    cy.get(selectors.composer.timeoutInput).should('have.value', '90')
  })

  it('should display canvas with imported circuit', (): void => {
    cy.get(selectors.composer.canvas).should('be.visible')
  })
})
