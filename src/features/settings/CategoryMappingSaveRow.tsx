export interface CategoryMappingSaveRowProps {
  isDirty: boolean
  isPending: boolean
  isError: boolean
  isSaved: boolean
  onSave: () => void
}

export function CategoryMappingSaveRow({ isDirty, isPending, isError, isSaved, onSave }: CategoryMappingSaveRowProps) {
  return (
    <>
      {isDirty && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="rounded bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 disabled:opacity-50"
          >
            Save mapping
          </button>
          {isError && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              Failed to save.
            </p>
          )}
        </div>
      )}
      {isSaved && !isDirty && <span className="text-xs text-green-700 dark:text-emerald-400">✓ Mapping saved</span>}
    </>
  )
}
