import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { WorkPeriod, MonthRepository } from '../../infra/repositories/types'
import { DayTimeline } from '../day/DayTimeline'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHoursCompact } from '../../shared/formatHours'
import { Tooltip } from '../../shared/Tooltip'
import { DaySummaryBody } from '../../shared/DaySummaryBody'
import type { DaySummaryData } from '../../shared/DaySummaryBody'

interface Props {
  date: string
  workedHours: number
  windows: WorkPeriod[]
  repository: MonthRepository
  autoCategory: string | null
  customCategories?: string[] | undefined
  categoryOrder?: string[] | undefined
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  daySummaryData?: DaySummaryData | undefined
  className?: string | undefined
  /** Day's target hours — draws a fill behind the number so days are comparable without reading. */
  targetHours?: number | undefined
}

/** Fill proportional to worked/target, capped so a big overtime day still reads as "over". */
function fillStyle(workedHours: number, targetHours: number | undefined): CSSProperties {
  if (!targetHours || workedHours <= 0) return {}
  const ratio = Math.min(1, workedHours / targetHours)
  const color = workedHours + 0.01 >= targetHours ? 'rgb(16 185 129 / 0.22)' : 'rgb(59 130 246 / 0.18)'
  const stop = (ratio * 100).toFixed(1)
  return { backgroundImage: `linear-gradient(to right, ${color} ${stop}%, transparent ${stop}%)` }
}

export function WorkedHoursCell({
  date,
  workedHours,
  windows,
  repository,
  autoCategory,
  customCategories,
  categoryOrder,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  daySummaryData,
  className = '',
  targetHours,
}: Props) {
  const [open, setOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const timeFormat = useTimeFormatStore((s) => s.format)

  const dateLabel = new Date(date + 'T12:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      if (e.target instanceof Node && document.querySelector('[role="dialog"]')?.contains(e.target)) return
      if (modalRef.current && e.target instanceof Node && !modalRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (!open) {
    const tooltipContent = daySummaryData ? (
      <DaySummaryBody {...daySummaryData} timeFormat={timeFormat} dark />
    ) : undefined
    return (
      <td
        className={`px-1.5 py-[3px] text-right text-[11px] tabular-nums cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/40 ${className}`}
        style={fillStyle(workedHours, targetHours)}
        data-testid="worked-hours"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        tabIndex={0}
      >
        <Tooltip content={tooltipContent}>
          <span className="block w-full text-right">
            {workedHours > 0 ? formatHoursCompact(workedHours, timeFormat) : ''}
          </span>
        </Tooltip>
      </td>
    )
  }

  return (
    <td className="px-2 py-1 text-right" data-testid="worked-hours">
      {createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/20" />
          <div
            ref={modalRef}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] w-full max-w-2xl rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 shadow-xl"
          >
            <div className="flex items-center justify-between border-b dark:border-gray-700 px-5 py-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                  Work periods
                </p>
                <p className="text-sm font-semibold">{dateLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl leading-none p-1 rounded"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto max-h-[70vh]">
              <DayTimeline
                showTotals={false}
                date={date}
                windows={windows}
                repository={repository}
                autoCategory={autoCategory}
                customCategories={customCategories}
                categoryOrder={categoryOrder}
                categoryDescriptions={categoryDescriptions}
                preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
              />
            </div>
          </div>
        </>,
        document.body,
      )}
    </td>
  )
}
