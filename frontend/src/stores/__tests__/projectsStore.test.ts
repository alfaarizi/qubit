import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectsStore } from '@/stores/projectsStore'
import type { Project } from '@/types/project'

describe('projectsStore', () => {
  beforeEach(() => {
    useProjectsStore.setState({
      projects: [],
      isLoaded: false,
      isLoading: false,
      error: null,
    })
  })
  describe('addProject', () => {
    it('should add a new project', () => {
      const now = Date.now()
      const project: Project = {
        id: '1',
        name: 'Test Project',
        description: 'Test',
        circuits: [],
        activeCircuitId: 'circuit-1',
        createdAt: now,
        updatedAt: now,
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
      const now = Date.now()
      const project: Project = {
        id: '1',
        name: 'Test Project',
        description: 'Test',
        circuits: [],
        activeCircuitId: 'circuit-1',
        createdAt: now,
        updatedAt: now,
      }
      useProjectsStore.setState({ projects: [project] })
      useProjectsStore.setState((state) => ({
        projects: state.projects.filter((p) => p.id !== '1'),
      }))
      expect(useProjectsStore.getState().projects).toHaveLength(0)
    })
  })
  describe('setLoading', () => {
    it('should set loading state', () => {
      useProjectsStore.setState({ isLoading: true })
      expect(useProjectsStore.getState().isLoading).toBe(true)
    })
  })
  describe('setError', () => {
    it('should set error message', () => {
      useProjectsStore.setState({ error: 'Test error' })
      expect(useProjectsStore.getState().error).toBe('Test error')
    })
  })
})

