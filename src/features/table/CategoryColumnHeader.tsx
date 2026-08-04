import { Tooltip } from '../../shared/Tooltip'
import { colorForCategory } from './catColors'

export interface ColumnDragHandlers {
  onDragStart: (idx: number) => void
  onDragOver: (e: React.DragEvent, idx: number) => void
  onDrop: (idx: number) => void
  onDragEnd: () => void
}

export interface CategoryColumnHeaderProps {
  cat: string
  catIdx: number
  allCategories: string[]
  autoCategory: string
  editingCat: string | null
  editValue: string
  colDragOverIdx: number | null
  categoryDescriptions?: Record<string, string> | undefined
  onCategoryReorder?: ((order: string[]) => void) | undefined
  onCategoryRename?: ((oldName: string, newName: string) => void) | undefined
  onAutoCategoryChange?: ((category: string) => void) | undefined
  dragHandlers: ColumnDragHandlers
  onEditValueChange: (v: string) => void
  onCommitRename: (cat: string) => void
  onSetEditingCat: (cat: string | null) => void
}

function displayCategoryName(cat: string): string {
  return cat.replace(/^_/, '')
}

function CategoryBadge({
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

export function CategoryColumnHeader({
  cat,
  catIdx,
  allCategories,
  autoCategory,
  editingCat,
  editValue,
  colDragOverIdx,
  categoryDescriptions,
  onCategoryReorder,
  onCategoryRename,
  onAutoCategoryChange,
  dragHandlers,
  onEditValueChange,
  onCommitRename,
  onSetEditingCat,
}: CategoryColumnHeaderProps) {
  const isAuto = cat === autoCategory
  const description = categoryDescriptions?.[cat]
  const dragClass = onCategoryReorder ? 'cursor-grab active:cursor-grabbing' : ''
  const dragOverClass =
    colDragOverIdx === catIdx ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/40' : ''
  const color = colorForCategory(cat, allCategories)
  const nameClass = `block truncate text-[11px] ${color.text} ${onCategoryRename ? 'cursor-text' : ''}`
  const tooltipContent = (
    <div>
      <p className="font-semibold">{displayCategoryName(cat)}</p>
      {isAuto && <p className="mt-1 text-gray-300">auto category — absorbs remaining hours</p>}
      {description && <p className="mt-1 text-gray-300">{description}</p>}
      {onCategoryRename && <p className="mt-1.5 text-gray-400 text-[10px]">Double-click to rename</p>}
    </div>
  )
  return (
    <th
      draggable={editingCat !== cat && !!onCategoryReorder}
      onDragStart={(e) => {
        // Create a standalone ghost div to avoid the browser rendering the full table as the drag image
        const el = e.currentTarget
        const ghost = document.createElement('div')
        ghost.textContent = cat
        Object.assign(ghost.style, {
          position: 'fixed',
          top: '-9999px',
          width: `${el.offsetWidth}px`,
          padding: '4px',
          background: '#f9fafb',
          border: '1px solid #6366f1',
          borderRadius: '4px',
          fontSize: '0.75rem',
          textAlign: 'center',
        })
        document.body.appendChild(ghost)
        const dt: unknown = e.dataTransfer
        if (dt instanceof DataTransfer) {
          dt.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2)
        }
        setTimeout(() => document.body.removeChild(ghost), 0)
        dragHandlers.onDragStart(catIdx)
      }}
      onDragOver={(e) => dragHandlers.onDragOver(e, catIdx)}
      onDrop={() => dragHandlers.onDrop(catIdx)}
      onDragEnd={dragHandlers.onDragEnd}
      className={`px-1 py-1 text-right w-14 min-w-[3.5rem] max-w-[3.5rem] border-b dark:border-gray-700 select-none ${catIdx > 0 ? 'border-l border-dashed border-gray-300 dark:border-gray-600' : ''} ${dragClass} ${dragOverClass}`}
    >
      {editingCat === cat ? (
        <input
          ref={(el) => {
            el?.focus()
          }}
          type="text"
          aria-label={`Rename category ${cat}`}
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onBlur={() => onCommitRename(cat)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommitRename(cat)
            if (e.key === 'Escape') onSetEditingCat(null)
          }}
          className="w-full bg-transparent text-xs border-b border-indigo-400 dark:border-indigo-500 focus:outline-none text-left"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <Tooltip content={tooltipContent}>
          <span
            className={nameClass}
            onDoubleClick={() => {
              if (onCategoryRename) {
                onSetEditingCat(cat)
                onEditValueChange(cat)
              }
            }}
          >
            {displayCategoryName(cat)}
          </span>
        </Tooltip>
      )}
      <span aria-hidden="true" className="flex justify-end items-center h-[13px] mt-0.5">
        <CategoryBadge cat={cat} isAuto={isAuto} onAutoCategoryChange={onAutoCategoryChange} />
      </span>
    </th>
  )
}
