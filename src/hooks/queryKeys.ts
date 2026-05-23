export const QUERY_KEYS = {
  config: ['config'] as const,

  workWindowsByDate: (date: string) => ['workWindows', date] as const,
  workWindowsByDateCell: (date: string) => ['workWindows', date, 'cell'] as const,
  workWindowsByMonth: (year: number, month: number) => ['workWindows', year, month] as const,
  workWindowsByMonthTagged: (year: number, month: number, tag: string) =>
    ['workWindows', year, month, tag] as const,
  workWindowsAll: ['workWindows'] as const,

  timeEntriesByDate: (date: string) => ['timeEntries', date] as const,
  timeEntriesByMonth: (year: number, month: number) => ['timeEntries', year, month] as const,
  timeEntriesByMonthTagged: (year: number, month: number, tag: string) =>
    ['timeEntries', year, month, tag] as const,
  timeEntriesSprint: (index: number, startDate: string, lengthDays: number) =>
    ['timeEntries', 'sprint', index, startDate, lengthDays] as const,
  timeEntriesAll: ['timeEntries'] as const,

  workLocationByDate: (date: string) => ['workLocation', date] as const,
  workLocationAll: ['workLocation'] as const,
  workLocationsByMonth: (year: number, month: number) => ['workLocations', year, month] as const,
  workLocationsAll: ['workLocations'] as const,

  autoCategoryOverrideByDate: (date: string) => ['autoCategoryOverride', date] as const,

  dayConfirmationByDate: (date: string) => ['dayConfirmation', date] as const,
  dayConfirmationAll: ['dayConfirmation'] as const,
  dayConfirmationsByMonth: (year: number, month: number) => ['dayConfirmations', year, month] as const,
  dayConfirmationsAll: ['dayConfirmations'] as const,

  dayTypeOverrideByDate: (date: string) => ['dayTypeOverride', date] as const,
  dayTypeOverrideAll: ['dayTypeOverride'] as const,
  dayTypeOverridesByMonth: (year: number, month: number) => ['dayTypeOverrides', year, month] as const,
  dayTypeOverridesByMonthTagged: (year: number, month: number, tag: string) =>
    ['dayTypeOverrides', year, month, tag] as const,
  dayTypeOverridesAll: ['dayTypeOverrides'] as const,

  activeTracking: ['activeTracking'] as const,

  holidays: (state: string, year: number) => ['holidays', state, year] as const,

  sprintExportByIndex: (index: number) => ['sprintExport', index] as const,
}
