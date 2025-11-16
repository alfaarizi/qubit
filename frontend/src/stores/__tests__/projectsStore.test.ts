import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectsStore } from '@/stores/projectsStore'
import type { Project } from '@/types/project'

describe('projectsStore', () => {
  beforeEach(() => {
    useProjectsStore.setState({
      projects: [],
      currentProjectId: null,
      isLoading: false,
      error: null,
    })
  })
  describe('addProject', () => {
    it('should add a new project', () => {
      const project: Project = {
        id: '1',
        name: 'Test Project',
        description: 'Test',
        circuits: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      useProjectsStore.setState((state) => ({
        projects: [...state.projects, project],
      }))
      expect(useProjectsStore.getState().projects).toHaveLength(1)
      expect(useProjectsStore.getState().projects[0].name).toBe('Test Project')
    })
  })
  describe('removeProject', () => {
    it('should remove a project by id', () => {
      const project: Project = {
        id: '1',
        name: 'Test Project',
        description: 'Test',
        circuits: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      useProjectsStore.setState({ projects: [project] })
      useProjectsStore.setState((state) => ({
        projects: state.projects.filter((p) => p.id !== '1'),
      }))
      expect(useProjectsStore.getState().projects).toHaveLength(0)
    })
  })
  describe('setCurrentProject', () => {
    it('should set current project id', () => {
      useProjectsStore.setState({ currentProjectId: 'project-1' })
      expect(useProjectsStore.getState().currentProjectId).toBe('project-1')
    })
  })
  describe('setLoading', () => {
    it('should set loading state', () => {
      useProjectsStore.setState({ isLoading: true })
      expect(useProjectsStore.getState().isLoading).toBe(true)
    })
  })
})

