import { test, expect } from '@playwright/test'

const playing = { name: 'Pause music' }
const silent = { name: 'Play music' }
function corner(page: import('@playwright/test').Page) {
  return page.locator('.resume-page__chrome')
}

const nowPlaying = '.now-playing'
const nowPlayingActive = '.now-playing--playing'

async function readVolume(page: import('@playwright/test').Page) {
  const label = await page.locator('.volume-display').getAttribute('aria-label')
  return Number.parseInt(label?.replace(/\D+/g, '') ?? '', 10)
}

/* Nothing plays until it is asked to, so every test that needs music asks. */
async function openResume(page: import('@playwright/test').Page) {
  await page.goto('/en')
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 25000 })
  await corner(page).getByRole('button', silent).click()
  await expect(corner(page).getByRole('button', playing)).toBeVisible()
}

test('has the label in place the moment the loading screen goes', async ({ page }) => {
  await page.goto('/en')
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 25000 })

  await expect(page.locator('.now-playing__title')).toHaveText('Crab Apple')
})

test('the page keeps no scrollbar of its own', async ({ page }) => {
  await page.goto('/en')
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 25000 })

  const gutter = await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth)
  expect(gutter).toBe(0)

  await page.mouse.wheel(0, 600)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})

test('names the track in the corner once the room is open', async ({ page }) => {
  await openResume(page)

  await expect(corner(page).getByRole('button', playing)).toBeVisible()
  await expect(page.locator(nowPlayingActive)).toBeVisible()
  await expect(page.locator('.now-playing__title')).toHaveText('Crab Apple')
  await expect(page.locator('.now-playing__artist')).toHaveText('Idris Muhammad')
})

test('the toggle stops and resumes the music', async ({ page }) => {
  await openResume(page)
  await expect(corner(page).getByRole('button', playing)).toBeVisible()

  await corner(page).getByRole('button', playing).click()
  await expect(corner(page).getByRole('button', silent)).toBeVisible()
  await expect(page.locator(nowPlaying)).toBeVisible()
  await expect(page.locator(nowPlayingActive)).toHaveCount(0)

  await corner(page).getByRole('button', silent).click()
  await expect(corner(page).getByRole('button', playing)).toBeVisible()
  await expect(page.locator(nowPlayingActive)).toBeVisible()
})

test('nothing the visitor touches elsewhere ever starts the music', async ({ page }) => {
  await page.goto('/en')
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 25000 })

  await expect(corner(page).getByRole('button', silent)).toBeVisible()
  await expect(page.locator('.now-playing__title')).toHaveText('Crab Apple')

  // The three gestures the old first-gesture retry listened for. A letter key,
  // not Space, which would scroll the page out from under the assertions.
  await page.locator('h1').click()
  await page.keyboard.press('KeyA')
  await page.mouse.wheel(0, 400)

  // Proving an absence: there is no event to wait for, so give it a moment.
  await page.waitForTimeout(500)

  await expect(corner(page).getByRole('button', silent)).toBeVisible()
  await expect(page.locator(nowPlayingActive)).toHaveCount(0)
})

test('sets the element to loop, so a track that ends comes round again', async ({ page }) => {
  await page.addInitScript(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'loop')!
    const seen: boolean[] = []
    Object.defineProperty(window, '__loopSettings', { get: () => seen })
    Object.defineProperty(HTMLMediaElement.prototype, 'loop', {
      ...descriptor,
      set(this: HTMLMediaElement, value: boolean) {
        seen.push(value)
        descriptor.set!.call(this, value)
      },
    })
  })

  await openResume(page)
  await expect(corner(page).getByRole('button', playing)).toBeVisible()

  const settings = await page.evaluate(
    () => (window as unknown as Record<string, boolean[]>).__loopSettings,
  )
  expect(settings).toContain(true)
  expect(settings).not.toContain(false)
})

test('keeps playing across a change of language', async ({ page }) => {
  await openResume(page)
  await expect(corner(page).getByRole('button', playing)).toBeVisible()

  await page.getByRole('link', { name: 'RU Русский' }).click()

  await expect(page.locator('h1')).toHaveText('Бабий Александр')
  await expect(page.getByRole('button', { name: 'Выключить музыку' })).toBeVisible()
})

test('the volume buttons move the reading one per cent at a time', async ({ page }) => {
  await openResume(page)

  const display = page.locator('.volume-display')
  const opening = await readVolume(page)

  await corner(page).getByRole('button', { name: 'Volume down' }).click()
  await expect(display).toHaveAttribute('aria-label', `Volume ${opening - 1}%`)

  await corner(page).getByRole('button', { name: 'Volume up' }).click()
  await corner(page).getByRole('button', { name: 'Volume up' }).click()
  await expect(display).toHaveAttribute('aria-label', `Volume ${opening + 1}%`)
})

test('the reading survives a change of language', async ({ page }) => {
  await openResume(page)

  const opening = await readVolume(page)
  await corner(page).getByRole('button', { name: 'Volume down' }).click()
  await page.getByRole('link', { name: 'RU Русский' }).click()

  await expect(page.locator('.volume-display')).toHaveAttribute(
    'aria-label',
    `Громкость ${opening - 1}%`,
  )
})

test('going back to the start turns the music back on', async ({ page }) => {
  await openResume(page)
  await expect(corner(page).getByRole('button', playing)).toBeVisible()

  await corner(page).getByRole('button', playing).click()
  await expect(corner(page).getByRole('button', silent)).toBeVisible()

  await page.getByRole('button', { name: 'Restart track' }).click()
  await expect(corner(page).getByRole('button', playing)).toBeVisible()
  await expect(page.locator(nowPlayingActive)).toBeVisible()
})

test('the track label keeps its width whatever is playing', async ({ page }) => {
  await openResume(page)

  const field = page.locator('.now-playing__text')
  const short = (await field.boundingBox())!.width

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(page.locator('.record-sleeve-picker__target').first()).toBeVisible()
  await page.getByRole('button', { name: 'Garoad — Welcome to VA-11 HALL-A' }).click()
  await expect(page.locator('.now-playing__title')).toHaveText('Welcome to VA-11 HALL-A')

  expect((await field.boundingBox())!.width).toBe(short)
})

test('the corner keeps one seam through both of its rows', async ({ page }) => {
  await openResume(page)

  const edges = await page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect()
    const track = box('.now-playing')
    const langs = box('.language-switcher')
    const keys = box('.music-controls__keys')
    const panel = box('.status-panel')

    return {
      rightEdges: track.right - keys.right,
      leftEdges: langs.left - panel.left,
      topGap: langs.left - track.right,
      bottomGap: panel.left - keys.right,
    }
  })

  expect(Math.abs(edges.rightEdges), 'the track and the keys end together').toBeLessThan(0.6)
  expect(Math.abs(edges.leftEdges), 'the languages and the panel start together').toBeLessThan(0.6)
  expect(Math.abs(edges.topGap - edges.bottomGap), 'one gap, not two').toBeLessThan(0.6)
})

const deckKeys = '.deck-controls__target'

async function openFloor(page: import('@playwright/test').Page) {
  await openResume(page)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(page.locator(deckKeys).first()).toBeVisible()
}

test('the deck has no controls until the floor is in view', async ({ page }) => {
  await openResume(page)

  await expect(page.locator(deckKeys)).toHaveCount(0)
})

test('pausing at the deck pauses in the corner', async ({ page }) => {
  await openFloor(page)
  await expect(corner(page).getByRole('button', playing)).toBeVisible()

  await page.locator(deckKeys).first().click()

  await expect(corner(page).getByRole('button', silent)).toBeVisible()
  await expect(page.locator(nowPlayingActive)).toHaveCount(0)
  await expect(page.locator(deckKeys).first()).toHaveAttribute('aria-label', 'Play music')
})

test('going back to the start at the deck turns the music on', async ({ page }) => {
  await openFloor(page)

  await corner(page).getByRole('button', playing).click()
  await expect(corner(page).getByRole('button', silent)).toBeVisible()

  await page.locator(deckKeys).nth(1).click()

  await expect(corner(page).getByRole('button', playing)).toBeVisible()
})

test('the wheel on the deck moves the reading in the corner', async ({ page }) => {
  await openFloor(page)

  const wheel = page.locator('.deck-controls__wheel')
  const opening = await readVolume(page)

  await wheel.focus()
  await page.keyboard.press('ArrowUp')
  await expect(page.locator('.volume-display')).toHaveAttribute(
    'aria-label',
    `Volume ${opening + 1}%`,
  )

  await page.keyboard.press('End')
  await expect(page.locator('.volume-display')).toHaveAttribute('aria-label', 'Volume 100%')
  await expect(wheel).toHaveAttribute('aria-valuenow', '100')

  await page.keyboard.press('Home')
  await expect(page.locator('.volume-display')).toHaveAttribute('aria-label', 'Volume 0%')
})
