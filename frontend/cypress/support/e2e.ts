/// <reference types="cypress" />

import './commands'
import { testData } from './helpers'

/**
 * global test setup and teardown
 */
beforeEach((): void => {
  cy.session(
    'authenticated-user',
    () => {
      cy.clearLocalStorage()
      cy.clearCookies()
      cy.emailLogin(testData.auth.testEmail)
    },
    {
      validate: () => {
        cy.window({ log: false }).then((win) => {
          expect(win.localStorage.getItem('auth-storage')).to.not.be.null
        })
      },
    }
  )
  // always navigate to home page after session restore to avoid about:blank
  cy.visit('/', { failOnStatusCode: false, log: false })
})

// optional: add error handling for uncaught exceptions
Cypress.on('uncaught:exception', (err: Error) => {
  // ignore ResizeObserver errors (common in component tests)
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  // allow other errors to fail the test
  return true
})
