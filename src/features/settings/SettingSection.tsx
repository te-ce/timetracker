import type { ReactNode } from 'react'

interface SettingSectionProps {
  id: string
  title: string
  description?: string
  danger?: boolean
  children: ReactNode
}

/** Card wrapper for a group of related settings, used by every section in SettingsView. */
export function SettingSection({ id, title, description, danger, children }: SettingSectionProps) {
  return (
    <section
      id={id}
      className={`flex flex-col gap-5 rounded-xl border p-5 ${
        danger
          ? 'border-red-300 bg-red-50/40 dark:border-red-700 dark:bg-red-950/20'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/40'
      }`}
    >
      <div className="flex flex-col gap-1">
        <h3 className={`text-sm font-semibold ${danger ? 'text-red-700 dark:text-red-400' : 'dark:text-gray-100'}`}>
          {title}
        </h3>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  )
}
