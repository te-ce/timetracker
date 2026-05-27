import { createRootRoute, createRoute, createRouter, createHashHistory } from '@tanstack/react-router'
import App from '../App'
import { DayView } from '../views/DayView'
import { MonthView } from '../views/MonthView'
import { MonthGridView } from '../views/MonthGridView'
import { SprintView } from '../views/SprintView'
import { SettingsView } from '../views/SettingsView'
import { toLocalIso } from '../domain/dateUtils'

const rootRoute = createRootRoute({
  component: App,
})

const monthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MonthView,
  validateSearch: (search: Record<string, unknown>) => {
    const now = new Date()
    return {
      year: Number(search.year) || now.getFullYear(),
      month: Number(search.month) || now.getMonth() + 1,
    }
  },
})

const dayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/day',
  component: DayView,
  validateSearch: (search: Record<string, unknown>) => ({
    date:
      typeof search.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search.date) ? search.date : toLocalIso(new Date()),
  }),
})

const gridRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/grid',
  component: MonthGridView,
  validateSearch: (search: Record<string, unknown>) => {
    const now = new Date()
    return {
      year: Number(search.year) || now.getFullYear(),
      month: Number(search.month) || now.getMonth() + 1,
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

const routeTree = rootRoute.addChildren([monthRoute, dayRoute, gridRoute, sprintRoute, settingsRoute])

const history = typeof window !== 'undefined' && window.location.protocol === 'file:'
  ? createHashHistory()
  : undefined

export const router = createRouter({ routeTree, history })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
