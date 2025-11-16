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
 */
Cypress.Commands.add(
  'createProject',
  (name: string, description?: string): Cypress.Chainable<string> => {
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
 * navigate to circuit composer (requires authentication)
 */
Cypress.Commands.add('openComposer', (): void => {
  cy.visit('/project')
  cy.url().should('not.include', '/login')
  cy.get(selectors.composer.canvas).should('be.visible')
})
