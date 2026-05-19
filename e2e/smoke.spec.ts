import { expect, test } from '@playwright/test'

test('loads the placeholder heading', async ({ page }) => {
  await page.goto('http://localhost:5173')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
