import { render, screen } from '@testing-library/react'
import { SettingsNav } from './SettingsNav'
import type { SectionDef } from './SettingsSections'

const sections: SectionDef[] = [
  { id: 'general', label: 'General' },
  { id: 'danger-zone', label: 'Danger Zone', danger: true },
]

describe('SettingsNav', () => {
  it('renders a link for every section', () => {
    render(<SettingsNav sections={sections} />)
    expect(screen.getByRole('link', { name: 'General' })).toHaveAttribute('href', '#general')
    expect(screen.getByRole('link', { name: 'Danger Zone' })).toHaveAttribute('href', '#danger-zone')
  })

  it('marks the active section with aria-current', () => {
    render(<SettingsNav sections={sections} active="danger-zone" />)
    expect(screen.getByRole('link', { name: 'Danger Zone' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: 'General' })).not.toHaveAttribute('aria-current')
  })
})
