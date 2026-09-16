import { test, expect } from '@playwright/test'

async function delaySceneChunk(page: import('@playwright/test').Page, ms: number) {
  await page.route('**/DiscoRoomBackground*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms))
    await route.continue()
  })
}

test('covers the page until the scene is ready, then removes itself', async ({ page }) => {
  await delaySceneChunk(page, 1500)
  await page.goto('/en')

  const overlay = page.locator('#loading-screen')
  await expect(overlay).toBeVisible()

  const shown = Number(await page.locator('.loading-screen__percent-value').innerText())
  expect(shown).toBeGreaterThanOrEqual(0)
  expect(shown).toBeLessThan(100)

  await expect(overlay).toHaveCount(0, { timeout: 25000 })
})

test('hands scrolling back after it leaves', async ({ page }) => {
  await page.goto('/en')
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 25000 })

  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden')

  await page.evaluate(() => window.scrollTo(0, 400))
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})

test('still leaves when motion is reduced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/en')

  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 25000 })
  await expect(page.locator('h1')).toHaveText('Babii Oleksandr')
})

test('leaves even when the scene chunk never arrives', async ({ page }) => {
  await page.route('**/DiscoRoomBackground*', (route) => route.abort())
  await page.goto('/en')

  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 })
  await expect(page.locator('h1')).toHaveText('Babii Oleksandr')
})
