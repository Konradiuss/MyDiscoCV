import { test, expect, type Locator } from '@playwright/test'

test.use({ viewport: { width: 320, height: 640 }, hasTouch: true })

async function box(locator: Locator) {
  const rect = await locator.boundingBox()
  expect(rect).not.toBeNull()
  return rect!
}

for (const locale of ['ua', 'ru', 'en']) {
  test(`fits a 320px screen in ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}`)
    await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 25000 })

    const pieces = page.locator(
      '.now-playing, .language-switcher, .music-controls__keys, .status-panel, h1, .scroll-orb',
    )
    for (const piece of await pieces.all()) {
      const rect = await box(piece)
      expect(rect.x).toBeGreaterThanOrEqual(0)
      expect(rect.x + rect.width).toBeLessThanOrEqual(320)
    }

    await expect(page.locator('.music-controls__keys .music-button').first()).toBeInViewport({
      ratio: 1,
    })

    const orb = await box(page.locator('.scroll-orb'))
    const name = await box(page.locator('h1'))
    const overlaps =
      orb.x < name.x + name.width &&
      name.x < orb.x + orb.width &&
      orb.y < name.y + name.height &&
      name.y < orb.y + orb.height
    expect(overlaps).toBe(false)

    const tiles = page.locator('.hero-section__links .contact-avatar')
    expect((await box(tiles.nth(0))).y).toBe((await box(tiles.nth(1))).y)
  })
}
