import { displayCategoryName } from './categoryColumnLabels'
export function CategoryTooltipContent({
  cat,
  isAuto,
  description,
  preferDescription,
  renamable,
}: {
  cat: string
  isAuto: boolean
  description: string | undefined
  preferDescription: boolean
  renamable: boolean
}) {
  const name = displayCategoryName(cat)
  const primary = preferDescription && description ? description : name
  const secondary = preferDescription && description ? name : description
  return (
    <div>
      <p className="font-semibold">{primary}</p>
      {isAuto && <p className="mt-1 text-gray-300">auto category — absorbs remaining hours</p>}
      {secondary && <p className="mt-1 text-gray-300">{secondary}</p>}
      {renamable && <p className="mt-1.5 text-gray-400 text-[10px]">Double-click to rename</p>}
    </div>
  )
}
