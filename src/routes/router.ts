import { createRootRoute, createRoute, createRouter, createHashHistory } from '@tanstack/react-router'
import App from '../App'
import { DayView } from '../features/day/DayView'
import { MonthView } from '../features/month/MonthView'
import { TableView } from '../features/table/TableView'
import { SprintView } from '../features/sprint/SprintView'
import { SettingsView } from '../features/settings/SettingsView'
import { toLocalIso } from '../shared/dateUtils'
import { PrototypeRouteComponent, validatePrototypeSearch } from '../prototypes/design-language/PrototypeRoute'

const rootRoute = createRootRoute({
  component: App,
})

const dayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DayView,
  validateSearch: (search: Record<string, unknown>) => ({
    date:
      typeof search.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search.date) ? search.date : toLocalIso(new Date()),
  }),
})

const monthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/month',
  component: MonthView,
  validateSearch: (search: Record<string, unknown>) => {
    const now = new Date()
    return {
      year: Number(search.year) || now.getFullYear(),
      month: Number(search.month) || now.getMonth() + 1,
    }
  },
})

const tableRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/table',
  component: TableView,
  validateSearch: (search: Record<string, unknown>) => {
    const now = new Date()
    return {
      year: Number(search.year) || now.getFullYear(),
      month: Number(search.month) || now.getMonth() + 1,
      expanded: search.expanded === true || search.expanded === 'true',
      logDate:
        typeof search.logDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search.logDate) ? search.logDate : undefined,
    }
  },
})

const sprintRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sprint',
  component: SprintView,
  validateSearch: (search: Record<string, unknown>) => ({
    sprint: search.sprint != null ? Number(search.sprint) : undefined,
  }),
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsView,
})

const prototypeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/prototype',
  component: PrototypeRouteComponent,
  validateSearch: validatePrototypeSearch,
})

const routeTree = rootRoute.addChildren([dayRoute, monthRoute, tableRoute, sprintRoute, settingsRoute, prototypeRoute])

const history = typeof window !== 'undefined' && window.location.protocol === 'file:' ? createHashHistory() : undefined

export const router = createRouter({ routeTree, ...(history ? { history } : {}) })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
