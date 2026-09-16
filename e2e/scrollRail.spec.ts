import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const rail = '.scroll-rail'
const thumb = '.scroll-rail__thumb'

const AFTER_IDLE = 1600

async function open(page: Page) {
  await page.goto('/en')
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 25000 })
  await expect(page.locator(thumb)).toHaveCount(1)
}

async function capsule(page: Page) {
  const box = await page.locator(thumb).boundingBox()
  const track = await page.locator(rail).boundingBox()

  if (!box || !track) throw new Error('the rail is not on the page')

  return { top: box.y - track.y, height: box.height, trackHeight: track.height }
}

function shown(page: Page) {
  return expect(page.locator(rail)).toHaveCSS('opacity', '1')
}

function hidden(page: Page) {
  return expect(page.locator(rail)).toHaveCSS('opacity', '0')
}

async function stepAway(page: Page) {
  await page.mouse.move(40, 400)
}

test('stays out of the way until it is wanted', async ({ page }) => {
  await open(page)
  await stepAway(page)

  await expect(async () => hidden(page)).toPass({ timeout: AFTER_IDLE })
})

test('comes up when the pointer reaches its edge', async ({ page }) => {
  await open(page)
  await stepAway(page)
  await expect(async () => hidden(page)).toPass({ timeout: AFTER_IDLE })

  const size = page.viewportSize()!
  await page.mouse.move(size.width - 6, size.height / 2)
  await shown(page)

  await stepAway(page)
  await hidden(page)
})

test('comes up while the page is moving and goes again when it stops', async ({ page }) => {
  await open(page)
  await stepAway(page)
  await expect(async () => hidden(page)).toPass({ timeout: AFTER_IDLE })

  await page.mouse.wheel(0, 600)
  await shown(page)

  await expect(async () => hidden(page)).toPass({ timeout: AFTER_IDLE })
})

test('draws the capsule where the page has got to', async ({ page }) => {
  await open(page)

  const top = await capsule(page)
  expect(top.top).toBe(0)
  expect(top.height).toBeLessThan(top.trackHeight / 2)

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect
    .poll(async () => {
      const end = await capsule(page)
      return Math.round(end.trackHeight - (end.top + end.height))
    })
    .toBeLessThanOrEqual(1)
})

test('drags the page along with the capsule', async ({ page }) => {
  await open(page)

  const start = await capsule(page)
  const box = (await page.locator(thumb).boundingBox())!

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + start.trackHeight / 2, { steps: 12 })

  const moved = await page.evaluate(() => window.scrollY)
  expect(moved).toBeGreaterThan(0)

  const travel = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  )
  expect(moved).toBeGreaterThan(travel * 0.35)
  expect(moved).toBeLessThan(travel * 0.65)

  await page.mouse.up()

  const after = await capsule(page)
  expect(after.top).toBeGreaterThan(start.trackHeight * 0.25)
})

test('takes the page to a press on the empty track', async ({ page }) => {
  await open(page)

  const track = (await page.locator(rail).boundingBox())!

  await page.mouse.move(track.x + track.width / 2, track.y + track.height * 0.8)
  await page.mouse.down()
  await page.mouse.up()

  const travel = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  )
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(travel * 0.6)
})

test('leaves the lift orb clickable beside it', async ({ page }) => {
  await open(page)

  await page.getByRole('button', { name: 'Scroll to bottom' }).click()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const travel = document.documentElement.scrollHeight - window.innerHeight
        return (travel - window.scrollY) / window.innerHeight
      }),
    )
    .toBeLessThan(0.01)
})

test('has no capsule to draw while the screenshot viewer is open', async ({ page }) => {
  await open(page)

  await page.locator('.project-shots__thumb').first().click()
  await expect(page.locator('.screenshot-viewer')).toBeVisible()

  await expect(page.locator(thumb)).toHaveCount(0)
  await hidden(page)
})
