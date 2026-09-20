import { test, expect, type Page } from '@playwright/test'

/*
 * A phone turned on its side. The window is wider than the 720px the phone
 * rules watch for, so every one of them stands down — while the height, which
 * is what the room and this dialog actually spend, is gone.
 */
const LANDSCAPE = [
  { label: 'a phone on its side', width: 844, height: 390 },
  { label: 'a larger phone on its side', width: 932, height: 430 },
  { label: 'a small phone on its side', width: 667, height: 375 },
] as const

async function open(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
  await page.goto('/en')
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 })
}

for (const { label, width, height } of LANDSCAPE) {
  test(`draws a ball worth grabbing on ${label}`, async ({ page }) => {
    await open(page, width, height)

    const hit = await page.locator('.disco-ball-hit-area').boundingBox()
    expect(hit).not.toBeNull()

    /*
     * The old box was a fixed 280px square, which in a 390px-tall window covered
     * four fifths of the screen — and it carries `touch-action: none`, so that
     * was four fifths with nowhere to start a scroll from.
     */
    expect(hit!.height).toBeLessThan(height * 0.6)

    // Big enough to be the point of the page, and wholly on screen.
    expect(hit!.height).toBeGreaterThan(150)
    expect(hit!.y).toBeGreaterThanOrEqual(0)
    expect(hit!.y + hit!.height).toBeLessThanOrEqual(height)
  })

  test(`keeps the screenshot arrows on screen on ${label}`, async ({ page }) => {
    await open(page, width, height)

    const thumb = page.getByRole('button', { name: /Open screenshot: DiscoCV home screen/ })
    await thumb.scrollIntoViewIfNeeded()
    await thumb.click()

    await expect(page.getByRole('dialog')).toBeVisible()

    for (const name of ['Previous screenshot', 'Next screenshot', 'Close screenshot']) {
      await expect(page.getByRole('button', { name })).toBeInViewport({ ratio: 1 })
    }

    await expect(page.locator('.screenshot-viewer__count')).toBeInViewport({ ratio: 1 })
  })
}

test('leaves the corner controls in their one-row desktop arrangement', async ({ page }) => {
  await open(page, 844, 390)

  /*
   * Two by two was for a narrow screen, where width is what is scarce. Lying
   * down it is height that is scarce, so the single row is the right one.
   */
  const tops = await page
    .locator('.music-controls__keys .music-button')
    .evaluateAll((keys) => keys.map((key) => Math.round(key.getBoundingClientRect().top)))

  expect(tops).toHaveLength(4)
  expect(new Set(tops).size).toBe(1)

  for (const piece of await page.locator('.status-panel, .language-switcher, .now-playing').all()) {
    const box = (await piece.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(844)
    expect(box.y).toBeGreaterThanOrEqual(0)
  }
})
