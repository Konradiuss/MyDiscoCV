import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const orb = '.scroll-orb'

async function open(page: Page) {
  await page.goto('/en')
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 25000 })
}

function position(page: Page) {
  return page.evaluate(() => {
    const view = document.documentElement
    const travel = view.scrollHeight - window.innerHeight

    return {
      fromTop: window.scrollY / window.innerHeight,
      fromBottom: (travel - window.scrollY) / window.innerHeight,
    }
  })
}

test('offers the way down from the top of the page', async ({ page }) => {
  await open(page)

  await expect(page.getByRole('button', { name: 'Scroll to bottom' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Scroll to top' })).toHaveCount(0)
})

test('takes the page to the end and turns around', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Scroll to bottom' }).click()

  await expect.poll(async () => (await position(page)).fromBottom).toBeLessThan(0.01)
  await expect(page.getByRole('button', { name: 'Scroll to top' })).toBeVisible()
})

test('takes the page back to the top again', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.getByRole('button', { name: 'Scroll to top' }).click()

  await expect.poll(async () => (await position(page)).fromTop).toBeLessThan(0.01)
  await expect(page.getByRole('button', { name: 'Scroll to bottom' })).toBeVisible()
})

test('is not in the page at all through the middle', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    const travel = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo(0, travel / 2)
  })

  await expect(page.locator(orb)).toHaveCount(0)
})

test('arrives back a whole screen before the end', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    const travel = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo(0, travel - window.innerHeight)
  })
  await expect(page.locator(orb)).toHaveCount(0)

  await page.evaluate(() => {
    const travel = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo(0, travel - window.innerHeight * 0.4)
  })
  await expect(page.getByRole('button', { name: 'Scroll to top' })).toBeVisible()
})

test('carries its name in every language', async ({ page }) => {
  await page.goto('/ru')
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 25000 })

  await expect(page.getByRole('button', { name: 'Вниз страницы' })).toBeVisible()
})
