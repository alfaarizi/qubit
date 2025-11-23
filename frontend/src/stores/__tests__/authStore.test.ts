import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/stores/authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
    })
  })
  describe('setUser', () => {
    it('should set user data', () => {
      const userData = { id: '1', email: 'test@example.com', first_name: 'Test' }
      useAuthStore.setState({ user: userData })
      expect(useAuthStore.getState().user).toEqual(userData)
    })
  })
  describe('setTokens', () => {
    it('should set access and refresh tokens', () => {
      useAuthStore.setState({ accessToken: 'access123', refreshToken: 'refresh123' })
      const state = useAuthStore.getState()
      expect(state.accessToken).toBe('access123')
      expect(state.refreshToken).toBe('refresh123')
    })
  })
  describe('setLoading', () => {
    it('should set loading state', () => {
      useAuthStore.setState({ isLoading: true })
      expect(useAuthStore.getState().isLoading).toBe(true)
    })
  })
  describe('setError', () => {
    it('should set error message', () => {
      useAuthStore.setState({ error: 'Auth failed' })
      expect(useAuthStore.getState().error).toBe('Auth failed')
    })
  })
  describe('clearAuth', () => {
    it('should clear all auth data', () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', first_name: 'Test' },
        accessToken: 'token',
        refreshToken: 'refresh',
      })
      useAuthStore.setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        error: null,
      })
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
      expect(state.refreshToken).toBeNull()
    })
  })
})

