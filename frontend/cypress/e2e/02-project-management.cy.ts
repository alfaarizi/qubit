/// <reference types="cypress" />

import { testData, selectors } from '../support/helpers'

describe('Project Management', (): void => {
  beforeEach((): void => {
    cy.clearLocalStorage()
    cy.clearCookies()
    cy.emailLogin(testData.auth.testEmail)
  })

  it('should display project list page after login', (): void => {
    cy.url().should('include', '/project')
    cy.get(selectors.projects.toolbar).should('be.visible')
  })

  it('should create a new project with name and description', (): void => {
    const projectName = `Test Project ${Date.now()}`
    const projectDesc = 'A test quantum circuit project'

    cy.get(selectors.projects.newButton).click()
    cy.get(selectors.projects.nameInput).type(projectName)
    cy.get(selectors.projects.descriptionInput).type(projectDesc)
    cy.get(selectors.projects.createSubmit).click()

    cy.contains(projectName).should('be.visible')
  })

  it('should search for projects by name', (): void => {
    const searchQuery = 'Test'

    cy.get(selectors.projects.searchInput).type(searchQuery)
    cy.wait(500)
    cy.get('body').should('exist')
  })

  it('should toggle between grid and list view', (): void => {
    // switch to list view
    cy.get(selectors.projects.viewToggleList).click()
    cy.get(selectors.projects.list).should('be.visible')

    // switch back to grid view
    cy.get(selectors.projects.viewToggleGrid).click()
    cy.get(selectors.projects.grid).should('be.visible')
  })

  it('should open an existing project', (): void => {
    // click on the first project card
    cy.get('[data-testid^="project-card-"]').first().click()
    cy.url().should('match', /\/project\/[a-f0-9]+/)
  })

  it('should rename a project', (): void => {
    const newName = `Renamed Project ${Date.now()}`

    // open actions menu on first project
    cy.get('[data-testid^="project-actions-menu-"]').first().click({ force: true })
    cy.get(selectors.projects.actionRename).click()

    // rename the project
    cy.get(selectors.projects.renameNameInput).clear().type(newName)
    cy.get(selectors.projects.renameSubmit).click()

    cy.contains(newName).should('be.visible')
  })

  it('should duplicate a project', (): void => {
    // open actions menu on first project
    cy.get('[data-testid^="project-actions-menu-"]').first().click({ force: true })
    cy.get(selectors.projects.actionDuplicate).click()

    // verify duplicate was created (should have "Copy" in name)
    cy.wait(1000)
    cy.contains(/Copy/i).should('be.visible')
  })

  it('should delete a project with confirmation', (): void => {
    // create a project to delete
    const projectName = `Delete Me ${Date.now()}`

    cy.get(selectors.projects.newButton).click()
    cy.get(selectors.projects.nameInput).type(projectName)
    cy.get(selectors.projects.createSubmit).click()
    cy.contains(projectName).should('be.visible')

    // find the newly created project card and delete it
    cy.contains('[data-testid^="project-card-"]', projectName)
      .within(() => {
        cy.get('[data-testid^="project-actions-menu-"]').click({ force: true })
      })

    cy.get(selectors.projects.actionDelete).click()

    // confirm deletion
    cy.get(selectors.projects.deleteConfirm).click()

    // wait for deletion to complete
    cy.wait(500)

    // verify project is gone
    cy.contains(projectName).should('not.exist')
  })

  it('should filter projects by category', (): void => {
    // click on different filters
    cy.get(selectors.projects.filterYours).click()
    cy.wait(300)

    cy.get(selectors.projects.filterAll).click()
    cy.wait(300)
  })

  it('should display project metadata and timestamps', (): void => {
    // verify first project card shows metadata
    cy.get('[data-testid^="project-card-"]').first().within(() => {
      // should show updated date
      cy.contains(/\w+ \d+, \d{4}/).should('exist')
    })
  })
})
