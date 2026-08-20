import type { ConfigRepository } from '../../infra/repositories/types'
import { DangerZoneSection } from './sections/DangerZoneSection'
import { DesktopAppSection } from './sections/DesktopAppSection'
import { GeneralSection } from './sections/GeneralSection'
import { ScheduleCategoriesSection } from './sections/ScheduleCategoriesSection'
import { SyncStorageSection } from './sections/SyncStorageSection'
import { TrashSection } from './sections/TrashSection'
import { WorkLocationSection } from './sections/WorkLocationSection'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export type SectionId =
  | 'general'
  | 'schedule-categories'
  | 'work-location'
  | 'sync-storage'
  | 'desktop-app'
  | 'trash'
  | 'danger-zone'

export interface SectionDef {
  id: SectionId
  label: string
  danger?: boolean
}

const ALL_SECTION_DEFS: SectionDef[] = [
  { id: 'general', label: 'General' },
  { id: 'schedule-categories', label: 'Schedule & Categories' },
  { id: 'work-location', label: 'Work Location & Tracking' },
  { id: 'sync-storage', label: 'Sync & Storage' },
  { id: 'desktop-app', label: 'Desktop App' },
  { id: 'trash', label: 'Trash' },
  { id: 'danger-zone', label: 'Danger Zone', danger: true },
]

export const SECTION_DEFS: SectionDef[] = ALL_SECTION_DEFS.filter((s) => isElectron || s.id !== 'desktop-app')

export function renderSection(id: SectionId, repository: ConfigRepository) {
  switch (id) {
    case 'general':
      return <GeneralSection repository={repository} />
    case 'schedule-categories':
      return <ScheduleCategoriesSection repository={repository} />
    case 'work-location':
      return <WorkLocationSection repository={repository} />
    case 'sync-storage':
      return <SyncStorageSection repository={repository} />
    case 'desktop-app':
      return <DesktopAppSection repository={repository} />
    case 'trash':
      return <TrashSection repository={repository} />
    case 'danger-zone':
      return <DangerZoneSection />
  }
}
