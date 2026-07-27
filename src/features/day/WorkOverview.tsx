import type { WorkPeriod, MonthRepository } from '../../infra/repositories/types'
import { UNCATEGORIZED_CATEGORY } from '../../infra/repositories/types'
import { mergeAdjacentInto } from './workPeriodMerge'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { findOpenPeriod } from '../../shared/worktime'
import { getAllCategories } from '../../shared/categories'
import { PeriodCard } from './PeriodCard'
import { AddPeriodForm } from './AddPeriodForm'
import { useNow } from './workPeriodShared'

interface Props {
  date: string
  windows: WorkPeriod[]
  repository: MonthRepository
  autoCategory: string | null
  customCategories?: string[] | undefined
  categoryOrder?: string[] | undefined
  categoryDescriptions?: Record<string, string> | undefined | undefined
  initialCategory?: string | undefined
}

export function WorkOverview({
  date,
  windows,
  repository,
  autoCategory,
  customCategories = [],
  categoryOrder,
  categoryDescriptions,
  initialCategory,
}: Props) {
  const mutations = useWorkPeriodMutations(repository)
  const sorted = windows.toSorted((a, b) => a.start.localeCompare(b.start))
  const openPeriod = findOpenPeriod(windows) ?? null
  const categories = getAllCategories(customCategories, categoryOrder)
  const defaultCategory = initialCategory ?? autoCategory ?? UNCATEGORIZED_CATEGORY
  const nowTime = useNow()

  function handleAdd(incoming: WorkPeriod) {
    const { merged, absorbed } = mergeAdjacentInto(windows, incoming)
    mutations.saveWithAbsorbed.mutate({ date, window: merged, absorbed })
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">No periods recorded yet</p>
      ) : (
        sorted.map((w) => (
          <PeriodCard
            key={w.id}
            w={w}
            date={date}
            categories={categories}
            mutations={mutations}
            categoryDescriptions={categoryDescriptions}
            nowTime={nowTime}
          />
        ))
      )}
      <AddPeriodForm
        openPeriod={openPeriod}
        defaultCategory={defaultCategory}
        categories={categories}
        categoryDescriptions={categoryDescriptions}
        onAdd={handleAdd}
      />
    </div>
  )
}
