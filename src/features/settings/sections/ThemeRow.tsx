import { useThemeStore } from '../../../shared/themeStore'

export function ThemeRow() {
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
