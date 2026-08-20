export function CategoryBadge({
  cat,
  isAuto,
  onAutoCategoryChange,
}: {
  cat: string
  isAuto: boolean
  onAutoCategoryChange?: ((cat: string) => void) | undefined
}) {
  if (isAuto)
    return (
      <span className="text-[9px] text-indigo-400 dark:text-indigo-300 font-medium tracking-wide leading-none">
        auto
      </span>
    )
  if (onAutoCategoryChange)
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onAutoCategoryChange(cat)
        }}
        className="text-[9px] text-gray-300 dark:text-gray-600 hover:text-indigo-400 dark:hover:text-indigo-300 leading-none transition-colors"
        data-tooltip={`Set "${cat}" as auto category`}
      >
        ○
      </button>
    )
  return <span className="text-[9px] leading-none">&nbsp;</span>
}
