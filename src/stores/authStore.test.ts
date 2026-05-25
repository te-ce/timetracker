import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: false })
  })

  it('initialises as not authenticated', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('setIsAuthenticated updates the flag', () => {
    useAuthStore.getState().setIsAuthenticated(true)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })
})
