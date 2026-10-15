import { act, render } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'

const SIBLING_PATHS = ['/', '/month', '/table']

interface RenderRouteOptions {
  path: string
  search?: Record<string, string | number>
  wrapper?: ComponentType<{ children: ReactNode }>
}

/** Renders `component` as the route at `path` of a real in-memory router, so navigation actually happens. */
export async function renderRoute(
  Component: ComponentType,
  { path, search = {}, wrapper: Wrapper }: RenderRouteOptions,
) {
  const rootRoute = createRootRoute()
  const route = createRoute({ getParentRoute: () => rootRoute, path, component: () => <Component /> })
  const siblings = SIBLING_PATHS.filter((p) => p !== path).map((p) =>
    createRoute({ getParentRoute: () => rootRoute, path: p, component: () => null }),
  )
  const query = new URLSearchParams(Object.entries(search).map(([k, v]) => [k, String(v)])).toString()
  const router = createRouter({
    routeTree: rootRoute.addChildren([route, ...siblings]),
    history: createMemoryHistory({ initialEntries: [query ? `${path}?${query}` : path] }),
  })
  await router.load()
  const tree = <RouterProvider router={router} />
  const result = await act(async () => render(Wrapper ? <Wrapper>{tree}</Wrapper> : tree))
  return { router, ...result }
}
