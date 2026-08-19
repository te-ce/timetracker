import { useQuery } from '@tanstack/react-query'
import { AutoCategorySettings } from './AutoCategorySettings'
import { SettingToggle } from './SettingToggle'
import { AppDataFolderSettings } from './AppDataFolderSettings'
import { BundeslandSettings } from './BundeslandSettings'
import { WeeklyScheduleSettings } from './WeeklyScheduleSettings'
import { CategorySettings } from './CategorySettings'
import { CloudSyncSettings } from './CloudSyncSettings'
import { DefaultLocationSettings } from './DefaultLocationSettings'
import { HotkeySettings } from './HotkeySettings'
import { StartupViewSettings } from './StartupViewSettings'
import { WindowBehaviorSettings } from './WindowBehaviorSettings'
import { LocalExcelFolderSettings } from './LocalExcelFolderSettings'
import { LocalExcelSettings } from './LocalExcelSettings'
import { SharePointSettings } from './SharePointSettings'
import { SheetSelector } from './SheetSelector'
import { ClearDataSettings } from './ClearDataSettings'
import { TrashSettings } from './TrashSettings'
import { SettingSection } from './SettingSection'
import { isLocalFolderMode } from '../../infra/auth/bootstrapConfig'
import { QUERY_KEYS } from '../../shared/queryKeys'
import { useThemeStore } from '../../shared/themeStore'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import type { ConfigRepository } from '../../infra/repositories/types'

const localFolder = isLocalFolderMode()
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

function ThemeRow() {
  const { theme, toggleTheme } = useThemeStore()
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium dark:text-gray-100">Theme</span>
        <p className="text-xs text-gray-500 dark:text-gray-400">Switch between light and dark appearance.</p>
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        {theme === 'dark' ? 'Dark' : 'Light'}
      </button>
    </div>
  )
}

function TimeFormatRow() {
  const { format, toggleFormat } = useTimeFormatStore()
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium dark:text-gray-100">Time format</span>
        <p className="text-xs text-gray-500 dark:text-gray-400">Show hours as decimal (7.5) or HH:MM (7:30).</p>
      </div>
      <button
        type="button"
        onClick={toggleFormat}
        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium tabular-nums text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        {format === 'decimal' ? 'Decimal' : 'HH:MM'}
      </button>
    </div>
  )
}

function GeneralSection({ repository }: { repository: ConfigRepository }) {
  return (
    <SettingSection id="general" title="General" description="Appearance and everyday display preferences.">
      <ThemeRow />
      <TimeFormatRow />
      <StartupViewSettings repository={repository} />
      <SettingToggle
        repository={repository}
        label="Show worked hours in navigation"
        description="Display the remaining/overtime hours badge in the top navigation bar."
        isChecked={(c) => c.showWorkedHoursInNav !== false}
        applyChange={(c, checked) => ({ ...c, showWorkedHoursInNav: checked })}
      />
      <SettingToggle
        repository={repository}
        label="Show total hours worked today"
        description="When enabled, the header badge and taskbar display total hours worked today instead of time remaining. Useful if you prefer to track progress rather than countdown."
        isChecked={(c) => c.showTotalWorked === true}
        applyChange={(c, checked) => ({ ...c, showTotalWorked: checked })}
      />
    </SettingSection>
  )
}

function ScheduleCategoriesSection({ repository }: { repository: ConfigRepository }) {
  return (
    <SettingSection
      id="schedule-categories"
      title="Schedule & Categories"
      description="Weekly targets, public holidays, and how work is categorized."
    >
      <WeeklyScheduleSettings repository={repository} />
      <BundeslandSettings repository={repository} />
      <AutoCategorySettings repository={repository} />
      <CategorySettings repository={repository} />
      <SettingToggle
        repository={repository}
        label="Show category description as primary"
        description="When a category has a description, show it as the main text and the category name as a fallback wherever categories are displayed."
        isChecked={(c) => c.preferCategoryDescriptionAsPrimary === true}
        applyChange={(c, checked) => ({ ...c, preferCategoryDescriptionAsPrimary: checked })}
      />
    </SettingSection>
  )
}

function WorkLocationSection({ repository }: { repository: ConfigRepository }) {
  const { data: config } = useQuery({ queryKey: QUERY_KEYS.config, queryFn: () => repository.get() })
  const showOfficeStats = config?.officeStats !== false
  return (
    <SettingSection
      id="work-location"
      title="Work Location & Tracking"
      description="Office vs. remote tracking and how remaining time is calculated."
    >
      <SettingToggle
        repository={repository}
        label="Show office stats"
        description="Display office vs. remote statistics in the header, overtime bar, and table view. Also shows the work location toggle."
        isChecked={(c) => c.officeStats !== false}
        applyChange={(c, checked) => ({ ...c, officeStats: checked })}
      />
      {showOfficeStats && <DefaultLocationSettings repository={repository} />}
      <SettingToggle
        repository={repository}
        label="Show countdown to planned stop"
        description="When a planned stop time is set on the current work period, show the remaining time until that stop in the badge and tab title. Disable to always show remaining time until the daily target is reached."
        isChecked={(c) => c.remainingTimeReference !== 'target-hours'}
        applyChange={(c, checked) => ({
          ...c,
          remainingTimeReference: checked ? 'planned-stop' : 'target-hours',
        })}
      />
      <SettingToggle
        repository={repository}
        label="Show remaining until today's target only"
        description="When enabled, the remaining time in the badge, overtime bar, and taskbar shows how much time is left until today's target hours are met — without subtracting prior overtime carry-over. Disable to show the time left until your cumulative overtime balance reaches zero."
        isChecked={(c) => c.remainingTimeMode === 'until-daily-target'}
        applyChange={(c, checked) => ({
          ...c,
          remainingTimeMode: checked ? 'until-daily-target' : 'until-zero-overtime',
        })}
      />
    </SettingSection>
  )
}

function SyncStorageSection({ repository }: { repository: ConfigRepository }) {
  return (
    <SettingSection id="sync-storage" title="Sync & Storage" description="Where your data is stored and synced from.">
      {!localFolder && <CloudSyncSettings />}
      {localFolder ? (
        <>
          <AppDataFolderSettings />
          <LocalExcelFolderSettings />
          <LocalExcelSettings repository={repository} />
        </>
      ) : (
        <>
          <SharePointSettings repository={repository} />
          <SheetSelector repository={repository} />
        </>
      )}
      <SettingToggle
        repository={repository}
        label="Archive sprint to separate sheet"
        description="After exporting, also write the sprint data to a new sheet named after the sprint dates."
        isChecked={(c) => c.archiveSprintSheet === true}
        applyChange={(c, checked) => ({ ...c, archiveSprintSheet: checked })}
      />
    </SettingSection>
  )
}

function DesktopAppSection({ repository }: { repository: ConfigRepository }) {
  return (
    <SettingSection
      id="desktop-app"
      title="Desktop App"
      description="Window, tray, and shortcut behavior (Electron only)."
    >
      <SettingToggle
        repository={repository}
        label="Launch at login"
        description="Start Timetracker automatically when you log in."
        isChecked={(c) => c.launchAtLogin ?? false}
        applyChange={(c, checked) => ({ ...c, launchAtLogin: checked })}
        onAfterSave={(checked) => window.electronAPI?.autolaunch.set(checked)}
      />
      <WindowBehaviorSettings repository={repository} />
      <SettingToggle
        repository={repository}
        label="Show remaining hours in tray icon"
        description="Display the remaining/overtime badge next to the tray icon. Toggle from the tray menu or the presenting-mode hotkey."
        isChecked={(c) => c.showWorkedHoursInTray !== false}
        applyChange={(c, checked) => ({ ...c, showWorkedHoursInTray: checked })}
      />
      <SettingToggle
        repository={repository}
        label="Show detailed breakdown in tray menu"
        description="Display the hours breakdown in the tray icon's dropdown menu and tooltip."
        isChecked={(c) => c.showWorkedHoursInTrayBreakdown !== false}
        applyChange={(c, checked) => ({ ...c, showWorkedHoursInTrayBreakdown: checked })}
      />
      <HotkeySettings repository={repository} />
    </SettingSection>
  )
}

function TrashSection({ repository }: { repository: ConfigRepository }) {
  return (
    <SettingSection
      id="trash"
      title="Trash"
      description="Deleted months, days, and local-data backups, kept for a configurable period before permanent removal."
    >
      <TrashSettings repository={repository} />
    </SettingSection>
  )
}

function DangerZoneSection() {
  return (
    <SettingSection id="danger-zone" title="Danger Zone" description="Actions that reset your local app data." danger>
      <ClearDataSettings />
    </SettingSection>
  )
}

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
