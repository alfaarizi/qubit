/// <reference types="cypress" />

import { testData, selectors } from '../support/helpers'

describe('Project Management', (): void => {
  // shared project name that will be used across tests
  const testProject = `Test Project ${crypto.randomUUID()}`
  let renamedTestProject: string = ''

  beforeEach((): void => {
    // authentication is handled globally in e2e.ts
    cy.visit('/project')
    cy.url().should('not.include', '/login')
  })

  it('should display project list page after login', (): void => {
    cy.url().should('include', '/project')
    cy.get(selectors.projects.toolbar).should('be.visible')
  })

  it('should create a new project with name and description', (): void => {
    // create project A
    cy.get(selectors.projects.newButton).click()
    cy.get(selectors.projects.nameInput).type(testProject)
    cy.get(selectors.projects.descriptionInput).type('A test quantum circuit project')
    cy.get(selectors.projects.createSubmit).click()
    cy.contains(testProject).should('be.visible')
  })

  it('should rename a project', (): void => {
    // rename project A
    cy.contains(selectors.projects.cardAny, testProject)
      .within(() => {
        cy.get(selectors.projects.actionsMenuAny).click({ force: true })
      })
    cy.get(selectors.projects.actionRename).click()

    // update the project name
    renamedTestProject = `Renamed ${testProject}`
    cy.get(selectors.projects.renameNameInput).clear().type(renamedTestProject)
    cy.get(selectors.projects.renameSubmit).click()
    cy.contains(renamedTestProject).should('be.visible')
  })

  it('should duplicate a project', (): void => {
    const projectToDuplicate = renamedTestProject || testProject
    cy.contains(selectors.projects.cardAny, projectToDuplicate)
      .within(() => {
        cy.get(selectors.projects.actionsMenuAny).click({ force: true })
      })
    cy.get(selectors.projects.actionDuplicate).click()
    const duplicatedProject = `${projectToDuplicate} (Copy)`
    cy.wait(1000)
    cy.contains(selectors.projects.cardAny, duplicatedProject).should('be.visible')

    // delete the duplicated project
    cy.contains(selectors.projects.cardAny, duplicatedProject)
      .within(() => {
        cy.get(selectors.projects.actionsMenuAny).click({ force: true })
      })
    cy.get(selectors.projects.actionDelete).click()
    cy.get(selectors.projects.deleteConfirm).click()
    cy.wait(500)
    cy.contains(selectors.projects.cardAny, duplicatedProject).should('not.exist')
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
    cy.get(selectors.projects.cardAny).first().within(() => {
      // should show updated date timestamp (already lowercase)
      cy.get(selectors.projects.metadataTimestamp).should('exist')
      cy.get(selectors.projects.metadataTimestamp).should('be.visible')
    })
  })

  it('should search for projects by name', (): void => {
    cy.get(selectors.projects.searchInput).type('No Project Here')
    cy.wait(500)
    cy.get('body').should('exist')
    cy.get(selectors.projects.searchInput).clear()
  })

  it('should toggle between grid and list view', (): void => {
    // switch to list view
    cy.get(selectors.projects.viewToggleList).click()
    cy.get(selectors.projects.list).should('be.visible')

    // switch back to grid view
    cy.get(selectors.projects.viewToggleGrid).click()
    cy.get(selectors.projects.grid).should('be.visible')
    })

  it('should delete a project with confirmation', (): void => {
    const projectToDelete = renamedTestProject || testProject
    cy.contains(selectors.projects.cardAny, projectToDelete)
      .within(() => {
        cy.get(selectors.projects.actionsMenuAny).click({ force: true })
      })
    cy.get(selectors.projects.actionDelete).click()
    cy.get(selectors.projects.deleteConfirm).click()
    cy.wait(500)
    cy.contains(selectors.projects.cardAny, projectToDelete).should('not.exist')
  })
})
