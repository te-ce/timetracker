import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import App from '../App'
import { DayView } from '../views/DayView'
import { MonthView } from '../views/MonthView'
import { MonthGridView } from '../views/MonthGridView'
import { SprintView } from '../views/SprintView'
import { SettingsView } from '../views/SettingsView'

const rootRoute = createRootRoute({
  component: App,
})

const monthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MonthView,
})

const dayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/day',
  component: DayView,
})

const gridRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/grid',
  component: MonthGridView,
})

const sprintRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sprint',
  component: SprintView,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsView,
})

const routeTree = rootRoute.addChildren([
  monthRoute,
  dayRoute,
  gridRoute,
  sprintRoute,
  settingsRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
