import { test, expect } from '@playwright/test'

/*
 * Rules about how blocks break onto a second row. All three cover the same
 * failure: a grid that wraps leaving one item stranded on its own, narrow, with
 * the rest of the row empty beside it.
 */

async function open(page: import('@playwright/test').Page, width: number, height = 900) {
  await page.setViewportSize({ width, height })
  await page.goto('/en')
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 })
}

/** How many of the four-project grid's cards share each row, top row first. */
function countProjectRows(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const grid = [...document.querySelectorAll('.work-project-grid')].find(
      (node) => node.children.length === 4,
    )
    if (!grid) return []

    const perTop = new Map<number, number>()
    for (const card of grid.children) {
      const top = Math.round(card.getBoundingClientRect().top)
      perTop.set(top, (perTop.get(top) ?? 0) + 1)
    }

    return [...perTop.values()]
  })
}

test('four projects break two by two, never three with one stranded', async ({ page }) => {
  // 1100px puts the card's grid at about 928px, which is wide enough for three
  // across and not for four — the width the rule exists for.
  await open(page, 1100)

  expect(await countProjectRows(page)).toEqual([2, 2])
})

test('four projects still sit in one row when there is room', async ({ page }) => {
  await open(page, 1440)

  expect(await countProjectRows(page)).toEqual([4])
})

test('the resume shares the second row on a tablet rather than sitting alone', async ({ page }) => {
  await open(page, 768)

  const social = page.locator('.hero-section__links .contact-avatar').first()
  const resume = page.locator('.contact-avatar--resume')
  const email = page.getByRole('link', { name: 'Send an email' })

  const [socialBox, resumeBox, emailBox] = await Promise.all([
    social.boundingBox(),
    resume.boundingBox(),
    email.boundingBox(),
  ])

  // Wider than a social tile, and level with the email beside it.
  expect(resumeBox!.width).toBeGreaterThan(socialBox!.width)
  expect(Math.round(resumeBox!.y)).toBe(Math.round(emailBox!.y))
})

test('the resume takes the whole row on a phone', async ({ page }) => {
  await open(page, 390, 844)

  const tiles = page.locator('.hero-section__links .contact-avatar')
  const [first, second, resume] = await Promise.all([
    tiles.nth(0).boundingBox(),
    tiles.nth(1).boundingBox(),
    page.locator('.contact-avatar--resume').boundingBox(),
  ])

  expect(Math.round(resume!.x)).toBe(Math.round(first!.x))
  expect(Math.round(resume!.x + resume!.width)).toBe(Math.round(second!.x + second!.width))
})

test('all five tiles stay in one row on a desktop', async ({ page }) => {
  await open(page, 1440)

  const tiles = page.locator('.hero-section__links .contact-avatar')
  const tops = await tiles.evaluateAll((nodes) =>
    nodes.map((node) => Math.round(node.getBoundingClientRect().top)),
  )

  expect(new Set(tops).size).toBe(1)
})

/*
 * 44x44 is the smallest target a fingertip hits without aiming. In one row the
 * four transport keys shared half the corner between them and came to 31.5px
 * wide at 320px, with their centres closer together than a single target.
 */
for (const width of [320, 390, 430, 520, 1440]) {
  test(`the music keys stay tappable at ${width}px`, async ({ page }) => {
    await open(page, width, 700)

    const sizes = await page.locator('.music-controls__keys .music-button').evaluateAll((keys) =>
      keys.map((key) => {
        const box = key.getBoundingClientRect()
        return { w: box.width, h: box.height, top: Math.round(box.top) }
      }),
    )

    expect(sizes).toHaveLength(4)
    for (const { w, h } of sizes) {
      expect(w).toBeGreaterThanOrEqual(44)
      expect(h).toBeGreaterThanOrEqual(44)
    }

    // Two by two on a phone, one row once there is width for it.
    const rows = new Set(sizes.map((size) => size.top)).size
    expect(rows).toBe(width <= 430 ? 2 : 1)
  })
}

/*
 * The readouts are drawn by what fits, not by a guess at the window. Each is a
 * fixed width — 58px for the volume, 66px for either clock — so the panel can
 * be asked its own width and answered honestly.
 */
const readouts = {
  clock: '.wall-clock',
  volume: '.volume-display',
  track: '.track-time',
} as const

async function visibleReadouts(page: import('@playwright/test').Page) {
  return page.evaluate((selectors: Record<string, string>) => {
    const shown: string[] = []
    for (const [name, selector] of Object.entries(selectors)) {
      const node = document.querySelector(selector)
      if (node && getComputedStyle(node).display !== 'none') shown.push(name)
    }
    return shown.sort()
  }, readouts)
}

for (const [width, expected] of [
  [320, ['track', 'volume']],
  [390, ['clock', 'track', 'volume']],
  [430, ['clock', 'track', 'volume']],
  [1440, ['clock', 'track', 'volume']],
] as const) {
  test(`the readout panel fills itself at ${width}px`, async ({ page }) => {
    await open(page, width, 800)

    expect(await visibleReadouts(page)).toEqual([...expected])

    // Whatever is shown has to stay inside the box that was measured for it.
    const overflow = await page.evaluate(() => {
      const panel = document.querySelector('.status-panel')!.getBoundingClientRect()
      return [...document.querySelectorAll('.status-panel > *')]
        .filter((node) => getComputedStyle(node).display !== 'none')
        .some((node) => {
          const box = node.getBoundingClientRect()
          return box.left < panel.left - 0.5 || box.right > panel.right + 0.5
        })
    })

    expect(overflow).toBe(false)
  })
}

test('the volume is never the reading that gets dropped', async ({ page }) => {
  await open(page, 320, 800)

  await expect(page.locator('.volume-display')).toBeVisible()
})
