/// <reference types="cypress" />

import { testData, selectors } from '../support/helpers'

describe('Authentication', (): void => {
  beforeEach((): void => {
    // ensure clean state before each test
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should display login page elements', (): void => {
    cy.visit('/login')

    cy.get(selectors.auth.emailInput).should('be.visible')
    cy.get(selectors.auth.sendCodeButton).should('be.visible').and('contain', 'Continue with Email')
  })

  it('should send verification code when email is submitted', (): void => {
    cy.visit('/login')

    cy.get(selectors.auth.emailInput).type(testData.auth.testEmail)
    cy.get(selectors.auth.sendCodeButton).click()

    cy.contains('Check your email').should('be.visible')
    cy.get(selectors.auth.codeInputs).should('have.length', 5)
  })

  it('should successfully login with valid email and verification code', (): void => {
    cy.emailLogin(testData.auth.testEmail)
  })

  it('should successfully logout', (): void => {
    // setup: login via email
    cy.emailLogin(testData.auth.testEmail)

    // ensure we're on the project page and fully loaded
    cy.get(selectors.navigation.userMenu).should('be.visible')

    // logout
    cy.get(selectors.navigation.userMenu).click()
    cy.get(selectors.navigation.logoutButton).should('be.visible').click({ force: true })

    // verify redirect to login
    cy.url().should('include', '/login')
  })

  it('should redirect unauthenticated users to login page', (): void => {
    cy.visit('/project')

    cy.url().should('include', '/login')
  })
})
