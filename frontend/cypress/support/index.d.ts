/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * login using email verification code flow (tests full UI)
     * @param email - user email address
     * @param code - optional verification code (defaults to '12345')
     * @example cy.emailLogin('user@example.com', '12345')
     */
    emailLogin(email: string, code?: string): Chainable<void>

    /**
     * logout current user
     * @example cy.logout()
     */
    logout(): Chainable<void>

    /**
     * create a new project
     * @param name - project name
     * @param description - optional project description
     * @returns project ID
     * @example cy.createProject('My Circuit', 'A test circuit')
     */
    createProject(name: string, description?: string): Chainable<string>

    /**
     * navigate to login page and ensure user is logged out
     * @example cy.ensureLoggedOut()
     */
    ensureLoggedOut(): Chainable<void>

    /**
     * navigate to circuit composer and ensure authenticated
     * @example cy.openComposer()
     */
    openComposer(): Chainable<void>
  }
}
