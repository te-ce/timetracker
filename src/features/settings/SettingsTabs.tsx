import { useState } from 'react'

export type SettingsTabId = 'schedule' | 'work' | 'storage' | 'app' | 'data'

interface Tab {
  id: SettingsTabId
  label: string
  danger?: boolean
}

const TABS: Tab[] = [
  { id: 'schedule', label: 'Schedule' },
  { id: 'work', label: 'Work' },
  { id: 'storage', label: 'Sync & Storage' },
  { id: 'app', label: 'App' },
  { id: 'data', label: 'Data', danger: true },
]

interface SettingsTabsProps {
  children: (activeTab: SettingsTabId) => React.ReactNode
}

export function SettingsTabs({ children }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('schedule')

  return (
    <>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex" role="tablist" aria-label="Settings sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? tab.danger
                    ? 'border-red-500 text-red-600 dark:border-red-400 dark:text-red-400'
                    : 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
                  : tab.danger
                    ? 'border-transparent text-red-500 hover:bg-gray-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-gray-800 dark:hover:text-red-300'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" className="mt-8 flex flex-col gap-8">
        {children(activeTab)}
      </div>
    </>
  )
}
