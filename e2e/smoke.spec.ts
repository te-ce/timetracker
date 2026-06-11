import { expect, test } from '@playwright/test'

test('loads the placeholder heading', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
