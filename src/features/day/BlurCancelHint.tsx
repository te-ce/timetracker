/** The warning shown when a dirty editor is about to be dismissed by a click outside. */
export function BlurCancelHint() {
  return (
    <span className="absolute bottom-full left-0 mb-0.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-700 rounded px-2 py-0.5 whitespace-nowrap z-20 pointer-events-none shadow-sm select-none">
      Click outside again to cancel
    </span>
  )
}
