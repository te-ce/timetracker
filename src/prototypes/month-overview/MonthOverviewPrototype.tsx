// PROTOTYPE — throwaway month-overview exploration mounted on the real /month route
// (?variant=A|B|C; ?variant=now is the shipped view). Three variants of "get an overview of
// the month and the data in it". Delete this directory once a direction is folded into
// MonthView; see NOTES.md.
import { buildPrototypeModel, type MonthViewData } from './monthPrototypeModel'
import { MonthVariantSwitcher, type MonthVariantKey } from './MonthVariantSwitcher'
import { VariantA } from './VariantA'
import { VariantB } from './VariantB'
import { VariantC } from './VariantC'

interface Props {
  variant: Exclude<MonthVariantKey, 'now'>
  view: MonthViewData
  onSelectDate: (date: string) => void
  onMonthChange: (year: number, month: number) => void
}

export function MonthOverviewPrototype({ variant, view, onSelectDate, onMonthChange }: Props) {
  const model = buildPrototypeModel(view)
  const props = { model, onSelectDate, onMonthChange }

  return (
    <div>
      {variant === 'A' && <VariantA {...props} />}
      {variant === 'B' && <VariantB {...props} />}
      {variant === 'C' && <VariantC {...props} />}
      <div className="h-16" />
      <MonthVariantSwitcher current={variant} year={model.year} month={model.month} />
    </div>
  )
}
