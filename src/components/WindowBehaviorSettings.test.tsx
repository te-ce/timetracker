import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WindowBehaviorSettings } from './WindowBehaviorSettings'
import { InMemoryConfigRepository } from '../repositories/in-memory/config-repository'
import { DEFAULT_APP_CONFIG as defaultAppConfig } from '../domain/appConfigDefaults'
import type { AppConfig } from '../repositories/types'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('WindowBehaviorSettings', () => {
  describe('startMinimized', () => {
    it('renders unchecked when startMinimized is false', async () => {
      const repo = new InMemoryConfigRepository({ ...defaultAppConfig, startMinimized: false })
      render(<WindowBehaviorSettings repository={repo} />, { wrapper })
      const toggle = await screen.findByRole('checkbox', { name: /start minimized/i })
      expect(toggle).not.toBeChecked()
    })

    it('renders checked when startMinimized is true', async () => {
      const repo = new InMemoryConfigRepository({ ...defaultAppConfig, startMinimized: true })
      render(<WindowBehaviorSettings repository={repo} />, { wrapper })
      const toggle = await screen.findByRole('checkbox', { name: /start minimized/i })
      expect(toggle).toBeChecked()
    })

    it('defaults to unchecked when startMinimized is undefined', async () => {
      const repo = new InMemoryConfigRepository()
      render(<WindowBehaviorSettings repository={repo} />, { wrapper })
      const toggle = await screen.findByRole('checkbox', { name: /start minimized/i })
      expect(toggle).not.toBeChecked()
    })

    it('saves startMinimized true when toggled on', async () => {
      const repo = new InMemoryConfigRepository()
      render(<WindowBehaviorSettings repository={repo} />, { wrapper })
      const toggle = await screen.findByRole('checkbox', { name: /start minimized/i })
      await userEvent.click(toggle)
      const saved = await repo.get()
      expect(saved.startMinimized).toBe(true)
    })

    it('saves startMinimized false when toggled off', async () => {
      const config: AppConfig = { ...defaultAppConfig, startMinimized: true }
      const repo = new InMemoryConfigRepository(config)
      render(<WindowBehaviorSettings repository={repo} />, { wrapper })
      const toggle = await screen.findByRole('checkbox', { name: /start minimized/i })
      await userEvent.click(toggle)
      const saved = await repo.get()
      expect(saved.startMinimized).toBe(false)
    })
  })

  describe('closeToTray', () => {
    it('renders checked when closeToTray is true', async () => {
      const repo = new InMemoryConfigRepository({ ...defaultAppConfig, closeToTray: true })
      render(<WindowBehaviorSettings repository={repo} />, { wrapper })
      const toggle = await screen.findByRole('checkbox', { name: /close to tray/i })
      expect(toggle).toBeChecked()
    })

    it('renders unchecked when closeToTray is false', async () => {
      const repo = new InMemoryConfigRepository({ ...defaultAppConfig, closeToTray: false })
      render(<WindowBehaviorSettings repository={repo} />, { wrapper })
      const toggle = await screen.findByRole('checkbox', { name: /close to tray/i })
      expect(toggle).not.toBeChecked()
    })

    it('defaults to checked when closeToTray is undefined', async () => {
      const repo = new InMemoryConfigRepository()
      render(<WindowBehaviorSettings repository={repo} />, { wrapper })
      const toggle = await screen.findByRole('checkbox', { name: /close to tray/i })
      expect(toggle).toBeChecked()
    })

    it('saves closeToTray false when toggled off', async () => {
      const repo = new InMemoryConfigRepository({ ...defaultAppConfig, closeToTray: true })
      render(<WindowBehaviorSettings repository={repo} />, { wrapper })
      const toggle = await screen.findByRole('checkbox', { name: /close to tray/i })
      await userEvent.click(toggle)
      const saved = await repo.get()
      expect(saved.closeToTray).toBe(false)
    })

    it('saves closeToTray true when toggled on', async () => {
      const repo = new InMemoryConfigRepository({ ...defaultAppConfig, closeToTray: false })
      render(<WindowBehaviorSettings repository={repo} />, { wrapper })
      const toggle = await screen.findByRole('checkbox', { name: /close to tray/i })
      await userEvent.click(toggle)
      const saved = await repo.get()
      expect(saved.closeToTray).toBe(true)
    })
  })
})
