import { useState } from 'react'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { Tooltip } from '../../shared/Tooltip'
import { StartSubtaskForm } from './StartSubtaskForm'
import { SubtaskForm } from './SubtaskForm'

interface PeriodCardFooterProps {
  canStartLiveSubtask: boolean
  periodId: string
  date: string
  categories: string[]
  defaultCategory: string
  mutations: ReturnType<typeof useWorkPeriodMutations>
  categoryDescriptions?: Record<string, string> | undefined
}

export function PeriodCardFooter({
  canStartLiveSubtask,
  periodId,
  date,
  categories,
  defaultCategory,
  mutations,
  categoryDescriptions,
}: PeriodCardFooterProps) {
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [startingSubtask, setStartingSubtask] = useState(false)

  return (
    <div className="min-h-[2rem] flex items-center">
      {startingSubtask ? (
        <StartSubtaskForm
          categories={categories}
          defaultCategory={defaultCategory}
          categoryDescriptions={categoryDescriptions}
          onStart={(subtask) => {
            mutations.startLiveSubtask.mutate({ date, periodId, subtask })
            setStartingSubtask(false)
          }}
          onCancel={() => setStartingSubtask(false)}
        />
      ) : addingSubtask ? (
        <SubtaskForm
          categories={categories}
          categoryDescriptions={categoryDescriptions}
          onAdd={(subtask) => {
            mutations.addSubtask.mutate({ date, periodId, subtask })
            setAddingSubtask(false)
          }}
          onCancel={() => setAddingSubtask(false)}
        />
      ) : (
        <div className="flex items-center gap-3 w-full justify-end">
          {canStartLiveSubtask && (
            <Tooltip content="Start live tracking for a subtask within this period">
              <button
                type="button"
                onClick={() => setStartingSubtask(true)}
                className="text-sm text-green-600 dark:text-green-500 hover:text-green-800 dark:hover:text-green-300 font-medium"
              >
                ▶ Start tracking subtask
              </button>
            </Tooltip>
          )}
          <Tooltip content="Log a completed subtask for this period">
            <button
              type="button"
              onClick={() => setAddingSubtask(true)}
              className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              + Log subtask
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  )
}
