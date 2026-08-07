import type { SectionDef } from './SettingsSections'

interface SettingsNavProps {
  sections: SectionDef[]
  active?: string | undefined
}

/** Sticky left-rail jump list; highlights whichever section is currently in view. */
export function SettingsNav({ sections, active }: SettingsNavProps) {
  return (
    <nav aria-label="Settings sections" className="sticky top-6 hidden h-fit w-48 shrink-0 flex-col gap-1 sm:flex">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          onClick={(event) => {
            event.preventDefault()
            document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          aria-current={active === section.id ? 'true' : undefined}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            active === section.id
              ? section.danger
                ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
              : section.danger
                ? 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
          }`}
        >
          {section.label}
        </a>
      ))}
    </nav>
  )
}
