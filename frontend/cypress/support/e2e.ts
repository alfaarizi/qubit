/// <reference types="cypress" />

import './commands'

/**
 * global test setup and teardown
 */
beforeEach((): void => {
  // clear auth state between tests to ensure clean slate
  cy.clearLocalStorage('auth-storage')
  cy.clearCookies()
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
