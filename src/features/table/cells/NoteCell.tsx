import type { NotePopoverState } from '../../day/NotePopoverPanel'

export function NoteCell({
  date,
  note,
  onNoteChange,
  onOpenNotePopover,
}: {
  date: string
  note: string | undefined
  onNoteChange?: ((date: string, note: string) => void) | undefined
  onOpenNotePopover: (state: NotePopoverState) => void
}) {
  return (
    <td className="min-w-[6rem] px-1.5 py-[3px] text-[10px] text-gray-500 dark:text-gray-400">
      {onNoteChange ? (
        <button
          type="button"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            onOpenNotePopover({
              date,
              value: note ?? '',
              top: rect.bottom + 6,
              left: rect.left - 220,
            })
          }}
          className="block w-full truncate text-left hover:underline"
          aria-label={`Note for ${date}`}
          data-tooltip={note ?? 'Add note'}
        >
          {note || ' '}
        </button>
      ) : (
        <span className="block truncate" title={note ?? ''}>
          {note}
        </span>
      )}
    </td>
  )
}
