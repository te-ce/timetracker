export interface CategoryColumnHeaderProps {
  cat: string
  catIdx: number
  autoCategory: string
  editingCat: string | null
  editValue: string
  colDragOverIdx: number | null
  categoryDescriptions?: Record<string, string>
  onCategoryReorder?: (order: string[]) => void
  onCategoryRename?: (oldName: string, newName: string) => void
  onAutoCategoryChange?: (category: string) => void
  onDragStart: (idx: number) => void
  onDragOver: (e: React.DragEvent, idx: number) => void
  onDrop: (idx: number, allCats: string[]) => void
  onDragEnd: () => void
  allCategories: string[]
  onEditValueChange: (v: string) => void
  onCommitRename: (cat: string) => void
  onSetEditingCat: (cat: string | null) => void
}

function CategoryBadge({ cat, isAuto, onAutoCategoryChange }: { cat: string; isAuto: boolean; onAutoCategoryChange?: (cat: string) => void }) {
  if (isAuto) return <span className="text-[9px] text-indigo-400 dark:text-indigo-300 font-medium tracking-wide leading-none">auto</span>
  if (onAutoCategoryChange) return (
    <button
      onClick={(e) => { e.stopPropagation(); onAutoCategoryChange(cat) }}
      className="text-[9px] text-gray-300 dark:text-gray-600 hover:text-indigo-400 dark:hover:text-indigo-300 leading-none transition-colors"
      title={`Set "${cat}" as auto category`}
    >○</button>
  )
  return <span className="text-[9px] leading-none">&nbsp;</span>
}

function buildColTitle(cat: string, autoCategory: string, categoryDescriptions?: Record<string, string>, onCategoryRename?: (o: string, n: string) => void): string {
  if (cat === autoCategory) return [`${cat} — auto category (absorbs remaining hours)`, categoryDescriptions?.[cat]].filter(Boolean).join('\n\n')
  return [categoryDescriptions?.[cat], onCategoryRename ? 'Double-click to rename' : undefined].filter(Boolean).join('\n\n') || cat
}

export function CategoryColumnHeader({ cat, catIdx, autoCategory, editingCat, editValue, colDragOverIdx, categoryDescriptions, onCategoryReorder, onCategoryRename, onAutoCategoryChange, onDragStart, onDragOver, onDrop, onDragEnd, allCategories, onEditValueChange, onCommitRename, onSetEditingCat }: CategoryColumnHeaderProps) {
  const isAuto = cat === autoCategory
  const dragClass = onCategoryReorder ? 'cursor-grab active:cursor-grabbing' : ''
  const dragOverClass = colDragOverIdx === catIdx ? 'bg-indigo-50 dark:bg-indigo-900/40' : ''
  const nameClass = `block truncate text-xs ${onCategoryRename ? 'cursor-text' : ''}`
  return (
    <th
      draggable={editingCat !== cat && !!onCategoryReorder}
      onDragStart={() => onDragStart(catIdx)}
      onDragOver={(e) => onDragOver(e, catIdx)}
      onDrop={() => onDrop(catIdx, allCategories)}
      onDragEnd={onDragEnd}
      className={`px-1 py-1.5 text-right w-16 min-w-[4rem] max-w-[4rem] border-b dark:border-gray-700 select-none ${dragClass} ${dragOverClass}`}
      role="columnheader"
      title={buildColTitle(cat, autoCategory, categoryDescriptions, onCategoryRename)}
    >
      {editingCat === cat ? (
        <input
          ref={(el) => { el?.focus() }}
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
        <span className={nameClass} onDoubleClick={() => { if (onCategoryRename) { onSetEditingCat(cat); onEditValueChange(cat) } }}>
          {cat}
        </span>
      )}
      <span aria-hidden="true" className="flex justify-center items-center h-[13px] mt-0.5">
        <CategoryBadge cat={cat} isAuto={isAuto} onAutoCategoryChange={onAutoCategoryChange} />
      </span>
    </th>
  )
}
