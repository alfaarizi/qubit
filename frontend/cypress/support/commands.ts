/// <reference types="cypress" />

import { testData, selectors } from './helpers'

/**
 * login using email verification code flow (tests full UI)
 */
Cypress.Commands.add(
  'emailLogin',
  (email: string, code: string = testData.auth.verificationCode): void => {
    cy.visit('/login')
    cy.get(selectors.auth.emailInput).clear().type(email)
    cy.get(selectors.auth.sendCodeButton).click()

    cy.contains('Check your email').should('be.visible')

    const codeDigits = code.split('')
    codeDigits.forEach((digit: string, index: number) => {
      cy.get(`[data-testid="code-input-${index}"]`).type(digit)
    })

    cy.url().should('include', '/project', { timeout: 15000 })
  }
)

/**
 * logout current user via UI
 */
Cypress.Commands.add('logout', (): void => {
  cy.get(selectors.navigation.userMenu).click()
  cy.get(selectors.navigation.logoutButton).click({ force: true })
  cy.url().should('include', '/login')
})

/**
 * ensure user is logged out and clear all session data
 */
Cypress.Commands.add('ensureLoggedOut', (): void => {
  cy.clearLocalStorage()
  cy.clearCookies()
  cy.visit('/login')
})

/**
 * create a new project (requires user to be authenticated)
 * returns the project name for cleanup purposes
 */
Cypress.Commands.add(
  'createProject',
  (name: string, description?: string): Cypress.Chainable<string> => {
    cy.visit('/project')
    cy.url().should('not.include', '/login')
    cy.get(selectors.projects.newButton).click()
    cy.get(selectors.projects.nameInput).type(name)

    if (description) {
      cy.get(selectors.projects.descriptionInput).type(description)
    }

    cy.get(selectors.projects.createSubmit).click()
    cy.contains(name).should('be.visible')

    return cy.wrap(name)
  }
)

/**
 * delete a project by name (requires user to be authenticated)
 */
Cypress.Commands.add(
  'deleteProject',
  (projectName: string): void => {
    cy.visit('/project')
    cy.url().should('not.include', '/login')
    
    // wait for project page to load and project cards to be visible
    cy.get(selectors.projects.toolbar, { timeout: 10000 }).should('be.visible')
    cy.get(selectors.projects.cardAny, { timeout: 10000 }).should('exist')
    
    // find and delete the project
    cy.get('body').then(($body) => {
      const projectCard = $body.find(selectors.projects.cardAny).filter((_, el) => {
        return Cypress.$(el).text().includes(projectName)
      })
      
      if (projectCard.length > 0) {
        cy.wrap(projectCard.first()).within(() => {
          cy.get(selectors.projects.actionsMenuAny).click({ force: true })
        })
        cy.get(selectors.projects.actionDelete).click()
        cy.get(selectors.projects.deleteConfirm).click()
        cy.wait(500)
        // verify deletion
        cy.contains(selectors.projects.cardAny, projectName, { timeout: 5000 }).should('not.exist')
      }
    })
  }
)

/**
 * ensure project exists and is open, and ensure circuit tab exists
 * creates project if it doesn't exist, opens it, and creates circuit tab if needed
 */
Cypress.Commands.add(
  'ensureProjectAndCircuitTab',
  (projectName: string): void => {
    // check authentication and login if needed
    cy.visit('/')
    cy.window().then((win) => {
      const authStorage = win.localStorage.getItem('auth-storage')
      if (!authStorage) {
        cy.clearLocalStorage()
        cy.clearCookies()
        cy.emailLogin(testData.auth.testEmail)
      }
    })
    cy.url({ timeout: 10000 }).should('not.include', '/login')
    
    // visit project page
    cy.visit('/project')
    cy.url({ timeout: 10000 }).should('not.include', '/login')

    // create or open project
    cy.get('body').then(($body) => {
      const projectCard = $body.find(selectors.projects.cardAny).filter((_, el) => {
        return Cypress.$(el).text().includes(projectName)
      })
      if (projectCard.length === 0) {
        cy.get(selectors.projects.newButton).click()
        cy.get(selectors.projects.nameInput).type(projectName)
        cy.get(selectors.projects.createSubmit).click()
        cy.wait(500)
        cy.contains(selectors.projects.cardAny, projectName).click()
      } else {
        cy.wrap(projectCard.first()).click()
      }
    })
    cy.wait(1000)

    // wait for composer page to load
    cy.get(selectors.composer.addCircuitTabButton).should('be.visible')

    // create or select circuit tab
    cy.get('body').then(($body) => {
      const tabs = Cypress.$(selectors.composer.circuitTabAny)
      if (tabs.length > 0) {
        cy.get(selectors.composer.circuitTabAny, { timeout: 5000 }).first().click()
      } else {
        cy.get(selectors.composer.addCircuitTabButton).click()
        cy.get(selectors.composer.circuitTabAny, { timeout: 5000 }).should('exist')
      }
    })
    
    // wait for TabsContent to be active (ensures tab is rendered)
    cy.get(selectors.composer.circuitTabContentAny, { timeout: 10000 })
      .should('have.attr', 'data-state', 'active')
    // wait for toolbar (indicates content is rendered)
    cy.get(selectors.composer.toolbar, { timeout: 10000 }).should('be.visible')
    // wait for canvas to be visible
    cy.get(selectors.composer.canvas, { timeout: 10000 }).should('be.visible')
  }
)

/**
 * navigate to circuit composer (requires authentication)
 */
Cypress.Commands.add('openComposer', (): void => {
  cy.visit('/project')
  cy.url().should('not.include', '/login')
  cy.get(selectors.composer.canvas).should('be.visible')
})
