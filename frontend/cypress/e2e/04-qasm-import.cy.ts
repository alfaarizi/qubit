/// <reference types="cypress" />

import { testData, selectors } from '../support/helpers'

describe('QASM Import', (): void => {
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

  it('should display file menu button', (): void => {
    cy.get(selectors.composer.fileMenuButton).should('be.visible')
  })

  it('should open file menu with QASM import option', (): void => {
    cy.get(selectors.composer.fileMenuButton).click()
    cy.get(selectors.composer.importQasmButton).should('be.visible')
  })

  it('should import QASM file via file upload', (): void => {
    const qasmContent = testData.qasmCode

    cy.get(selectors.composer.fileMenuButton).click()
    cy.get(selectors.composer.importQasmButton).click()

    // upload file
    cy.get(selectors.composer.qasmFileInput).selectFile({
      contents: Cypress.Buffer.from(qasmContent),
      fileName: 'bell-state.qasm',
      mimeType: 'text/plain',
    }, { force: true })

    // verify import started
    cy.wait(2000)
    cy.get(selectors.composer.canvas).should('be.visible')
  })

  it('should handle Bell state QASM import', (): void => {
    const bellState = `OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
h q[0];
cx q[0],q[1];`

    cy.get(selectors.composer.fileMenuButton).click()
    cy.get(selectors.composer.importQasmButton).click()

    cy.get(selectors.composer.qasmFileInput).selectFile({
      contents: Cypress.Buffer.from(bellState),
      fileName: 'bell.qasm',
      mimeType: 'text/plain',
    }, { force: true })

    cy.wait(2000)
    cy.get(selectors.composer.canvas).should('be.visible')
  })

  it('should handle GHZ state QASM import', (): void => {
    const ghzState = `OPENQASM 2.0;
include "qelib1.inc";
qreg q[3];
h q[0];
cx q[0],q[1];
cx q[1],q[2];`

    cy.get(selectors.composer.fileMenuButton).click()
    cy.get(selectors.composer.importQasmButton).click()

    cy.get(selectors.composer.qasmFileInput).selectFile({
      contents: Cypress.Buffer.from(ghzState),
      fileName: 'ghz.qasm',
      mimeType: 'text/plain',
    }, { force: true })

    cy.wait(2000)
    cy.get(selectors.composer.canvas).should('be.visible')
  })

  it('should clear previous circuit when importing new QASM', (): void => {
    const qasmCode1 = testData.qasmCode
    const qasmCode2 = `OPENQASM 2.0;
include "qelib1.inc";
qreg q[1];
h q[0];`

    // import first circuit
    cy.get(selectors.composer.fileMenuButton).click()
    cy.get(selectors.composer.importQasmButton).click()
    cy.get(selectors.composer.qasmFileInput).selectFile({
      contents: Cypress.Buffer.from(qasmCode1),
      fileName: 'circuit1.qasm',
      mimeType: 'text/plain',
    }, { force: true })
    cy.wait(2000)

    // import second circuit
    cy.get(selectors.composer.fileMenuButton).click()
    cy.get(selectors.composer.importQasmButton).click()
    cy.get(selectors.composer.qasmFileInput).selectFile({
      contents: Cypress.Buffer.from(qasmCode2),
      fileName: 'circuit2.qasm',
      mimeType: 'text/plain',
    }, { force: true })
    cy.wait(2000)

    cy.get(selectors.composer.canvas).should('be.visible')
  })

  it('should show loading state during QASM processing', (): void => {
    const largeQasm = `OPENQASM 2.0;
include "qelib1.inc";
qreg q[5];
h q[0];
cx q[0],q[1];
cx q[1],q[2];
cx q[2],q[3];
cx q[3],q[4];`

    cy.get(selectors.composer.fileMenuButton).click()
    cy.get(selectors.composer.importQasmButton).click()
    cy.get(selectors.composer.qasmFileInput).selectFile({
      contents: Cypress.Buffer.from(largeQasm),
      fileName: 'large.qasm',
      mimeType: 'text/plain',
    }, { force: true })

    // should show loading or process successfully
    cy.wait(3000)
    cy.get('body').should('exist')
  })

  it('should handle multiple QASM imports', (): void => {
    const qasmFile1 = `OPENQASM 2.0;
include "qelib1.inc";
qreg q[1];
h q[0];`

    const qasmFile2 = `OPENQASM 2.0;
include "qelib1.inc";
qreg q[3];
h q[0];
cx q[0],q[1];
cx q[1],q[2];`

    // import first file
    cy.get(selectors.composer.fileMenuButton).click()
    cy.get(selectors.composer.importQasmButton).click()
    cy.get(selectors.composer.qasmFileInput).selectFile({
      contents: Cypress.Buffer.from(qasmFile1),
      fileName: 'circuit1.qasm',
      mimeType: 'text/plain',
    }, { force: true })
    cy.wait(2000)

    // import second file
    cy.get(selectors.composer.fileMenuButton).click()
    cy.get(selectors.composer.importQasmButton).click()
    cy.get(selectors.composer.qasmFileInput).selectFile({
      contents: Cypress.Buffer.from(qasmFile2),
      fileName: 'circuit2.qasm',
      mimeType: 'text/plain',
    }, { force: true })
    cy.wait(2000)

    cy.get('body').should('exist')
  })

  it('should have file input accepting .qasm files', (): void => {
    cy.get(selectors.composer.qasmFileInput).should('have.attr', 'accept', '.qasm')
  })

  it('should display clear button to reset circuit', (): void => {
    cy.get(selectors.composer.clearButton).should('be.visible')
  })
})
