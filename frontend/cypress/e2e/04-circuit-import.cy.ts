/// <reference types="cypress" />

import { selectors } from '../support/helpers'

describe('Circuit Import', (): void => {
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

  const importQasmFile = (fixturePath: string, fileName: string): void => {
    cy.get(selectors.composer.fileMenuButton).click()
    cy.get(selectors.composer.importQasmButton).click()
    cy.fixture(fixturePath).then((qasmContent) => {
      cy.get(selectors.composer.qasmFileInput).selectFile({
        contents: Cypress.Buffer.from(qasmContent),
        fileName,
        mimeType: 'text/plain',
      }, { force: true })
    })
    cy.wait(5000)
  }

  it('should open file menu with QASM import option', (): void => {
    cy.get(selectors.composer.fileMenuButton).click()
    cy.get(selectors.composer.importQasmButton).should('be.visible')
  })

  it('should have file input accepting .qasm files', (): void => {
    cy.get(selectors.composer.qasmFileInput).should('have.attr', 'accept', '.qasm')
  })

  it('should import QASM file', (): void => {
    importQasmFile('4mod5-v0_20.qasm', '4mod5-v0_20.qasm')
    cy.get(selectors.composer.canvas).should('be.visible')
  })

  it('should clear previous circuit when importing new QASM', (): void => {
    importQasmFile('4gt12-v0_86.qasm', '4gt12-v0_86.qasm')
    cy.get(selectors.composer.canvas).should('be.visible')
    cy.wait(1000)
    
    importQasmFile('4mod5-v0_20.qasm', '4mod5-v0_20.qasm')
    cy.get(selectors.composer.canvas).should('be.visible')
  })
})

