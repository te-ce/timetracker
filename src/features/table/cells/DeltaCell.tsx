import { formatHoursCompact } from '../../../shared/formatHours'
import type { TimeFormat } from '../../../shared/timeFormatStore'
import { overtimeTextClass } from '../monthTableRow'

export function DeltaCell({ rowDelta, timeFormat }: { rowDelta: number | null; timeFormat: TimeFormat }) {
  return (
    <td className="px-1.5 py-[3px] w-12 text-right text-[11px] tabular-nums">
      {rowDelta !== null && (
        <span className={overtimeTextClass(rowDelta)}>
          {rowDelta > 0 ? '+' : ''}
          {formatHoursCompact(rowDelta, timeFormat)}
        </span>
      )}
    </td>
  )
}
