import { formatHours } from '../../shared/formatHours'
import { categoryDisplay } from '../day/categoryLabel'

interface Props {
  hoursPerCategory: Record<string, number>
  allCategories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
}

export function SprintReportPanel({
  hoursPerCategory,
  allCategories,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
}: Props) {
  const total = allCategories.reduce((sum, cat) => sum + (hoursPerCategory[cat] ?? 0), 0)
  const maxHours = Math.max(...allCategories.map((c) => hoursPerCategory[c] ?? 0), 1)

  return (
    <section aria-label="Sprint report" className="overflow-hidden rounded-lg border dark:border-gray-700">
      <table className="w-full text-sm">
        <tbody>
          {allCategories.map((category, i) => {
            const hours = hoursPerCategory[category] ?? 0
            const { primary, secondary } = categoryDisplay(
              category,
              categoryDescriptions ?? {},
              preferCategoryDescriptionAsPrimary ?? false,
            )
            return (
              <tr
                key={category}
                className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/60'}
              >
                <td className="px-3 py-1.5 font-medium">
                  {primary}
                  {secondary && (
                    <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">{secondary}</span>
                  )}
                </td>
                <td className="w-32 px-3 py-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-indigo-400 dark:bg-indigo-500"
                      style={{ width: `${(hours / maxHours) * 100}%` }}
                    />
                  </div>
                </td>
                <td
                  className={`w-24 px-3 py-1.5 text-right font-mono ${hours === 0 ? 'text-gray-300 dark:text-gray-600' : ''}`}
                >
                  {formatHours(hours, 'decimal')}
                </td>
                <td className="w-20 px-3 py-1.5 text-right font-mono text-xs text-gray-400 dark:text-gray-500">
                  {formatHours(hours, 'hhmm')}
                </td>
              </tr>
            )
          })}
          <tr className="bg-indigo-50 font-semibold dark:bg-indigo-900/40">
            <td className="px-3 py-2">Total</td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right font-mono">{formatHours(total, 'decimal')}</td>
            <td className="px-3 py-2 text-right font-mono text-xs text-gray-500 dark:text-gray-400">
              {formatHours(total, 'hhmm')}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}
