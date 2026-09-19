import { test, expect } from '@playwright/test'

const sleeves = '.record-sleeve-picker__target'

async function openFloor(page: import('@playwright/test').Page) {
  await page.goto('/en')
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 25000 })
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(page.locator(sleeves).first()).toBeVisible()
}

test('lays one sleeve on the floor for every track', async ({ page }) => {
  await openFloor(page)

  await expect(page.locator(sleeves)).toHaveCount(3)
  await expect(page.getByRole('button', { name: 'Idris Muhammad — Crab Apple' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Choose a track' })).toBeVisible()
})

test('keeps the sleeves out of reach until the floor is in view', async ({ page }) => {
  await page.goto('/en')
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 25000 })

  await expect(page.locator(sleeves)).toHaveCount(0)
})

test('switches the track when a sleeve is clicked', async ({ page }) => {
  await openFloor(page)
  await expect(page.locator('.now-playing__title')).toHaveText('Crab Apple')

  await page.getByRole('button', { name: 'Billy Garner Band — Brand New Girl' }).click()

  await expect(page.locator('.now-playing__title')).toHaveText('Brand New Girl')
  await expect(page.locator('.now-playing--playing')).toBeVisible()
})

test('marks the sleeve that is playing', async ({ page }) => {
  await openFloor(page)

  const crabApple = page.getByRole('button', { name: 'Idris Muhammad — Crab Apple' })
  const va11halla = page.getByRole('button', { name: 'Garoad — Welcome to VA-11 HALL-A' })

  await expect(crabApple).toHaveAttribute('aria-pressed', 'true')
  await expect(va11halla).toHaveAttribute('aria-pressed', 'false')

  await va11halla.click()

  await expect(va11halla).toHaveAttribute('aria-pressed', 'true')
  await expect(crabApple).toHaveAttribute('aria-pressed', 'false')
})

test('answers the keyboard as well as the pointer', async ({ page }) => {
  await openFloor(page)

  const va11halla = page.getByRole('button', { name: 'Garoad — Welcome to VA-11 HALL-A' })
  await va11halla.focus()
  await page.keyboard.press('Enter')

  await expect(page.locator('.now-playing__title')).toHaveText('Welcome to VA-11 HALL-A')
})

test('plays a picked sleeve even after the music was switched off', async ({ page }) => {
  await openFloor(page)
  const corner = page.locator('.resume-page__chrome')

  // Switched off means switched off by hand, which takes playing first: the
  // room now opens silent, and silent is not the same state as refused.
  await corner.getByRole('button', { name: 'Play music' }).click()
  await expect(corner.getByRole('button', { name: 'Pause music' })).toBeVisible()

  await corner.getByRole('button', { name: 'Pause music' }).click()
  await expect(corner.getByRole('button', { name: 'Play music' })).toBeVisible()

  await page.getByRole('button', { name: 'Billy Garner Band — Brand New Girl' }).click()

  await expect(corner.getByRole('button', { name: 'Pause music' })).toBeVisible()
  await expect(page.locator('.now-playing__title')).toHaveText('Brand New Girl')
})
