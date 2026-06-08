# e2e/

Playwright end-to-end tests. Run against the full app (Vite dev server + MSW for API mocking). Cover critical user flows, feature interactions, and smoke-level availability.

## Contents

| File                 | Covers                                                              |
| -------------------- | ------------------------------------------------------------------- |
| `smoke.spec.ts`      | App loads, main route renders                                       |
| `features.spec.ts`   | Individual feature behaviors (tracking, settings, categories, etc.) |
| `user-flows.spec.ts` | End-to-end user journeys across multiple views                      |

## Running

One-time browser setup:

```bash
npx playwright install --with-deps chromium
```

Run all E2E tests:

```bash
npm run e2e
```

Tests run against `http://localhost:5173`. The dev server must be running, or use `webServer` config in `playwright.config.ts` (already configured).
