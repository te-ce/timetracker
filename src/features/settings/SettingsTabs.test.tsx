import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsTabs } from './SettingsTabs'

describe('SettingsTabs', () => {
  it('renders all five tab buttons', () => {
    render(<SettingsTabs>{() => null}</SettingsTabs>)
    expect(screen.getByRole('tab', { name: 'Schedule' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Work' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Sync & Storage' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'App' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Data' })).toBeInTheDocument()
  })

  it('activates the Schedule tab by default', () => {
    render(<SettingsTabs>{(tab) => <div>{tab}</div>}</SettingsTabs>)
    expect(screen.getByRole('tab', { name: 'Schedule' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('schedule')).toBeInTheDocument()
  })

  it('switches to clicked tab and passes new id to render prop', async () => {
    render(<SettingsTabs>{(tab) => <div>{tab}</div>}</SettingsTabs>)
    await userEvent.click(screen.getByRole('tab', { name: 'Work' }))
    expect(screen.getByRole('tab', { name: 'Work' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Schedule' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText('work')).toBeInTheDocument()
  })

  it('passes correct id for each tab on click', async () => {
    const ids: string[] = []
    render(
      <SettingsTabs>
        {(tab) => {
          ids.push(tab)
          return <div>{tab}</div>
        }}
      </SettingsTabs>,
    )
    for (const name of ['Sync & Storage', 'App', 'Data']) {
      await userEvent.click(screen.getByRole('tab', { name }))
    }
    expect(ids).toContain('storage')
    expect(ids).toContain('app')
    expect(ids).toContain('data')
  })
})
