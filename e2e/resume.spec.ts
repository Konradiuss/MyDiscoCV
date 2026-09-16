import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function open(page: Page, locale = 'en') {
  await page.goto(`/${locale}`)
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 25000 })
}

function luminance(colour: string) {
  const [r = 0, g = 0, b = 0] = colour.match(/[\d.]+/g)?.map(Number) ?? []
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

test('lays the sections out in order and numbers them by that order', async ({ page }) => {
  await open(page)

  await expect(page.locator('.resume-section h2')).toHaveText([
    'Work Experience',
    'Pet Projects',
    'Skills',
    'Education and Languages',
  ])
  await expect(page.locator('.section-kicker')).toHaveText(['01', '02', '03', '04'])
})

test('writes the period out from the dates, in the language being read', async ({ page }) => {
  await open(page)
  await expect(page.locator('.experience-card').first()).toContainText('April 2026')

  await open(page, 'ru')
  const russian = page.locator('.experience-card').first()
  await expect(russian).toContainText('апрел')
  await expect(russian).toContainText('настоящее время')

  await open(page, 'ua')
  await expect(page.locator('.experience-card').first()).toContainText('квіт')
})

test('shows the projects that belong to a job inside that job', async ({ page }) => {
  await open(page)

  const firstJob = page.locator('.experience-card').first()
  await expect(firstJob).toContainText('ZODA Memorial')
  await expect(firstJob).toContainText('Air Monitor Kyiv')
  await expect(firstJob.locator('.work-project')).toHaveCount(2)
})

test.describe('the screenshot viewer', () => {
  test('opens a screenshot, steps through it and closes on Escape', async ({ page }) => {
    await open(page)

    const thumb = page.getByRole('button', { name: /Open screenshot: A test employee’s profile/ })
    await thumb.scrollIntoViewIfNeeded()
    await thumb.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Employee Attendance System')
    await expect(dialog).toContainText('1 / 2')

    await page.keyboard.press('ArrowRight')
    await expect(dialog).toContainText('2 / 2')

    await page.keyboard.press('ArrowRight')
    await expect(dialog).toContainText('1 / 2')

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  })

  test('gives the focus back to the thumbnail it was opened from', async ({ page }) => {
    await open(page)

    const thumb = page.getByRole('button', { name: /Open screenshot: DiscoCV home screen/ })
    await thumb.scrollIntoViewIfNeeded()
    await thumb.focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(thumb).toBeFocused()
  })

  test('opens all six current DiscoCV screenshots', async ({ page }) => {
    await open(page)

    const thumb = page.getByRole('button', { name: /Open screenshot: DiscoCV home screen/ })
    await thumb.scrollIntoViewIfNeeded()
    await thumb.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('.screenshot-viewer__count')).toHaveText('1 / 6')
    await expect(page.getByRole('button', { name: 'Next screenshot' })).toBeVisible()
  })

  test('is not in the page while it is closed', async ({ page }) => {
    await open(page)

    await expect(page.locator('.screenshot-viewer')).toHaveCount(0)
  })
})

test.describe('the screenshot strip', () => {
  test('says how many pictures there are, without being hovered', async ({ page }) => {
    await open(page)

    const thumb = page.getByRole('button', { name: /A test employee’s profile/ })
    await thumb.scrollIntoViewIfNeeded()

    const bar = thumb.locator('.project-shots__bar')
    await expect(bar).toBeVisible()
    await expect(thumb.locator('.project-shots__count')).toHaveText('2')
    await expect(bar).toContainText('Open screenshot')
  })

  test('shows the current DiscoCV gallery count before opening it', async ({ page }) => {
    await open(page)

    const thumb = page.getByRole('button', { name: /DiscoCV home screen.*Screenshots: 6/ })
    await thumb.scrollIntoViewIfNeeded()

    await expect(thumb.locator('.project-shots__bar')).toBeVisible()
    await expect(thumb.locator('.project-shots__count')).toHaveText('6')
  })

  test('tells a screen reader the count as well', async ({ page }) => {
    await open(page, 'ru')

    await expect(
      page.getByRole('button', { name: /Интерфейс режима прямого наведения.*Снимков: 6/ }),
    ).toHaveCount(1)
  })
})

test('hands out the PDF resume for the language being read', async ({ page }) => {
  await open(page, 'ru')

  const button = page.locator('.contact-avatar--resume')
  await expect(button).toHaveText(/Скачать резюме \(PDF\)/)
  await expect(button).toHaveAttribute('href', /resume-ru(\.\w+)?\.pdf$/)
  await expect(button).toHaveAttribute('download', /^Бабий-Александр-resume-ru\.pdf$/)
})

test('shows the profile owner time in their named time zone', async ({ page }) => {
  await open(page, 'ru')

  const timeZone = page.locator('.hero-section__timezone')
  await expect(timeZone).toContainText('Europe/Kyiv')
  await expect(timeZone.locator('time')).toHaveText(/^\d{2}:\d{2}$/)
})

test('shows the filled skill matrix and its levels', async ({ page }) => {
  await open(page, 'ru')

  const panel = page.locator('.skills-panel')
  await panel.scrollIntoViewIfNeeded()
  await expect(panel.locator('.skill-row')).toHaveCount(10)
  await expect(panel.getByRole('heading', { name: 'DevOps и инфраструктура' })).toBeVisible()
  await expect(panel.getByRole('listitem', { name: 'Vue.js, Основной' })).toHaveClass(
    /skill-chip--core/,
  )
  await expect(panel.getByRole('listitem', { name: 'Docker, Основной' })).toHaveClass(
    /skill-chip--core/,
  )
  await expect(panel.getByRole('listitem', { name: 'Strapi, Базовый' })).toHaveClass(
    /skill-chip--familiar/,
  )
  await expect(panel.getByText('Docker Compose', { exact: true })).toHaveCount(0)
  await expect(panel.getByRole('listitem', { name: 'GraphQL, Базовый' })).toHaveClass(
    /skill-chip--familiar/,
  )
  await expect(panel.locator('.skills-legend li')).toHaveText(['Основной', 'Уверенный', 'Базовый'])

  await open(page, 'ua')
  await expect(page.locator('.skills-legend li')).toHaveText(['Основний', 'Впевнений', 'Базовий'])

  await open(page, 'en')
  await expect(page.locator('.skills-legend li')).toHaveText(['Core', 'Proficient', 'Familiar'])
})

test('shows the filled Russian work experience', async ({ page }) => {
  await open(page, 'ru')

  const jobs = page.locator('.experience-card')
  await expect(jobs).toHaveCount(4)
  await expect(jobs.locator('.experience-card__company')).toHaveText([
    'ЦУИТ / ЦУІТ',
    'БЕЛНЕТ',
    'ОІАЦ',
    'Государственный университет интеллектуальных технологий и связи (ГУИТС / ДУІТЗ)',
  ])
  await expect(page.locator('.experience-timeline__bead--current')).toHaveCount(1)

  await expect(jobs.nth(0).locator('.experience-card__role-note')).toHaveCount(0)
  await expect(jobs.nth(3).locator('.experience-card__role-note')).toContainText(
    'по совместительству',
  )
  await expect(
    jobs
      .nth(3)
      .getByRole('button', { name: /Главная страница университетской Moodle.*Снимков: 4/ }),
  ).toBeVisible()

  await expect(jobs.nth(0).locator('.work-project h4')).toHaveText([
    'ZODA Memorial',
    'Air Monitor Kyiv',
  ])
  await expect(
    jobs.nth(0).getByRole('button', { name: /Главная страница онлайн-мемориала.*Снимков: 5/ }),
  ).toBeVisible()
  await expect(
    jobs.nth(0).getByRole('button', { name: /Уведомление о непосредственной угрозе.*Снимков: 4/ }),
  ).toBeVisible()
  await expect(
    jobs.nth(1).getByRole('button', { name: /Модуль лидов ERP-системы.*Снимков: 4/ }),
  ).toBeVisible()
  await expect(
    jobs.nth(1).getByRole('button', { name: /Форма создания абонента.*Снимков: 3/ }),
  ).toBeVisible()

  const oiac = jobs.nth(2)
  await expect(oiac.locator('h3')).toHaveText(
    'Руководитель отдела разработки программного обеспечения',
  )
  await expect(oiac.locator('.experience-card__promotion')).toContainText(
    'Повышение с должности: Инженер программного обеспечения',
  )
  await expect(page.locator('.experience-card__promotion')).toHaveCount(1)
  for (const [lead, count] of [
    ['Главная страница R&D Hub', 13],
    ['Интерактивная карта Одессы проекта', 6],
    ['Личный кабинет тестового сотрудника', 2],
    ['Генератор паролей в режиме', 2],
  ] as const) {
    await expect(
      oiac.getByRole('button', { name: new RegExp(`${lead}.*Снимков: ${count}`) }),
    ).toBeVisible()
  }
  await expect(oiac.locator('.work-project h4')).toHaveText([
    'R&D Hub Platform',
    'Интерактивная карта Одессы',
    'Система учёта сотрудников',
    'Генератор паролей',
  ])
})

test('shows the filled Russian education and language records', async ({ page }) => {
  await open(page, 'ru')

  const background = page.getByRole('heading', { name: 'Образование и языки' })
  await background.scrollIntoViewIfNeeded()
  const grid = page.locator('.education-language-grid')
  const educationBox = await page.locator('.education-card').boundingBox()
  const languagesBox = await page.locator('.languages-card').boundingBox()

  expect(educationBox).not.toBeNull()
  expect(languagesBox).not.toBeNull()
  expect(educationBox!.width / languagesBox!.width).toBeGreaterThan(1.5)
  expect(educationBox!.width / languagesBox!.width).toBeLessThan(1.7)
  expect(Math.abs(educationBox!.height - languagesBox!.height)).toBeLessThan(2)
  await expect(grid).toHaveCSS('align-items', 'stretch')
  const master = page.locator('.education-item').filter({ hasText: 'магистр' })
  await expect(master.locator('.record-list__title')).toHaveText(
    '121 — Инженерия программного обеспечения, магистр с отличием',
  )
  await expect(master.locator('.education-item__honors')).toHaveCSS('color', 'rgb(255, 210, 122)')
  await expect(page.getByText('Колледж «Сервер»')).toBeVisible()
  const languageRows = page.locator('.language-row')
  await expect(languageRows).toHaveCount(4)
  await expect(languageRows.first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(languageRows.first()).toHaveCSS('border-left-width', '0px')
  await expect(languageRows.nth(1)).toHaveCSS('border-top-width', '1px')
  await expect(page.locator('.language-code')).toHaveText(['UA', 'RU', 'EN', 'DE'])
  await expect(page.locator('.language-row__level')).toHaveCount(4)
  await expect(page.locator('.record-list li').filter({ hasText: 'Английский' })).toContainText(
    'C1',
  )
  await expect(page.locator('.record-list li').filter({ hasText: 'Немецкий' })).toContainText('A1')
})

test('shows the filled Russian pet projects and only their available links', async ({ page }) => {
  await open(page, 'ru')

  const projects = page.locator('.project-card')
  await expect(projects).toHaveCount(2)

  const artillery = projects.filter({ hasText: 'Artillery Spotter Calculator' })
  await expect(artillery).toContainText('Три режима расчёта')
  await expect(
    artillery.getByRole('link', { name: 'GitHub — Artillery Spotter Calculator' }),
  ).toHaveAttribute('href', 'https://github.com/Konradiuss/artillery-calculator-stable')
  await expect(
    artillery.getByRole('link', { name: 'Demo — Artillery Spotter Calculator' }),
  ).toHaveAttribute('href', 'https://konradiuss.github.io/artillery-calculator-stable')
  const artilleryGallery = artillery.getByRole('button', {
    name: /Интерфейс режима прямого наведения/,
  })
  await expect(artilleryGallery).toBeVisible()
  await expect(artilleryGallery).toHaveAccessibleName(/6/)

  const disco = projects.filter({ hasText: 'DiscoCV' })
  await expect(disco).toContainText('Интерактивная 3D-сцена на Three.js')
  await expect(disco.getByRole('link')).toHaveCount(0)
  await expect(disco.getByRole('button', { name: /Главный экран DiscoCV/ })).toBeVisible()

  const gridBox = await page.locator('.project-grid').boundingBox()
  const artilleryBox = await artillery.boundingBox()
  const discoBox = await disco.boundingBox()
  expect(gridBox).not.toBeNull()
  expect(artilleryBox).not.toBeNull()
  expect(discoBox).not.toBeNull()
  expect(Math.abs(artilleryBox!.width - gridBox!.width)).toBeLessThan(2)
  expect(Math.abs(discoBox!.width - gridBox!.width)).toBeLessThan(2)
  expect(discoBox!.y).toBeGreaterThan(artilleryBox!.y + artilleryBox!.height)

  const captions = [
    'Интерфейс режима прямого наведения с вводом дистанции, азимута, типа артиллерии и параметров ветра.',
    'Результат расчёта прямого наведения с визуализацией направления стрельбы и положения цели.',
    'История произведённых расчётов и справочник по влиянию силы ветра на разные типы артиллерии.',
    'Режим триангуляции для вычисления необходимых поправок по координатам цели и точки попадания.',
    'Режим групповой стрельбы с интерактивным размещением нескольких артиллерийских орудий на координатной сетке.',
    'Рассчитанные поправки для группы орудий вместе с историей предыдущих групповых расчётов.',
  ]

  await artilleryGallery.click()
  const dialog = page.getByRole('dialog', { name: 'Artillery Spotter Calculator' })
  await expect(dialog).toBeVisible()

  for (const [index, caption] of captions.entries()) {
    await expect(dialog.locator('figcaption')).toHaveText(caption)
    await expect(dialog.locator('.screenshot-viewer__count')).toHaveText(`${index + 1} / 6`)
    if (index < captions.length - 1) await page.keyboard.press('ArrowRight')
  }
})

test('links to the four channels, the resume, and nowhere else', async ({ page }) => {
  await open(page)

  const links = page.locator('.hero-section__links')
  await expect(links.getByRole('link')).toHaveCount(5)

  for (const name of [
    'Open GitHub',
    'Message on Telegram',
    'Message on WhatsApp',
    'Send an email',
    'Download resume (PDF)',
  ]) {
    await expect(links.getByRole('link', { name, exact: true })).toHaveCount(1)
  }

  await expect(page.getByRole('link', { name: /LinkedIn/ })).toHaveCount(0)
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(1)
})

test('does not repeat the hero at the foot of the page', async ({ page }) => {
  await open(page)

  await expect(page.locator('.contact-avatar')).toHaveCount(5)
  await expect(page.locator('.hero-section__links .contact-avatar')).toHaveCount(5)
  await expect(page.locator('.contact-avatar--resume')).toHaveCount(1)
})

test('draws the resume in Inter rather than in whatever was lying around', async ({ page }) => {
  await open(page)
  await page.evaluate(() => document.fonts.ready)

  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((face) => face.family === 'Inter' && face.status === 'loaded'),
  )
  expect(loaded.length).toBeGreaterThan(0)

  const used = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
  expect(used).toContain('Inter')
})

test.describe('the contact tiles', () => {
  test('shows a picture, a mark and a promise on each tile', async ({ page }) => {
    await open(page)

    const tiles = page.locator('.hero-section__links .contact-avatar')
    await expect(tiles).toHaveCount(5)

    for (const [index, promise] of [
      'Open GitHub',
      'Message on Telegram',
      'Message on WhatsApp',
    ].entries()) {
      const tile = tiles.nth(index)

      await expect(tile).toHaveText(promise)
      await expect(tile.locator('.contact-avatar__badge .contact-mark')).toHaveCount(1)
      await expect(tile.locator('img')).toBeVisible()
    }
  })

  test('draws the address with its mark instead of a face', async ({ page }) => {
    await open(page)

    await expect(page.locator('.contact-avatar--markonly')).toHaveCount(2)
    const email = page.locator('.contact-avatar--markonly[href^="mailto:"]')
    await expect(email).toHaveCount(1)
    await expect(email).toHaveText('Send an email')
    await expect(email.locator('img')).toHaveCount(0)
    await expect(email.locator('.contact-avatar__badge .contact-mark')).toBeVisible()
  })

  test('actually cuts each mark out of its drawing', async ({ page }) => {
    await open(page)

    const marks = await page.evaluate(() =>
      [...document.querySelectorAll('.hero-section__links .contact-mark')].map((el) => ({
        kind: (el as HTMLElement).dataset.kind ?? '',
        image: getComputedStyle(el).maskImage,
      })),
    )

    expect(marks.map((mark) => mark.kind)).toEqual([
      'github',
      'telegram',
      'whatsapp',
      'email',
      'cv',
    ])
    marks.forEach((mark) => expect(mark.image, mark.kind).not.toBe('none'))
    expect(new Set(marks.map((mark) => mark.image)).size).toBe(marks.length)

    const stack = await page.evaluate(() => {
      const mark = document.querySelector('.project-shots__mark')
      return mark ? getComputedStyle(mark).maskImage : 'nothing there'
    })

    expect(stack).not.toBe('nothing there')
    expect(stack).not.toBe('none')
    expect(
      marks.some((mark) => mark.image === stack),
      'a service mark in its place',
    ).toBe(false)
  })

  test('sends each tile to its own destination', async ({ page }) => {
    await open(page)

    const links = page.locator('.hero-section__links')
    await expect(links.getByRole('link', { name: 'Open GitHub' })).toHaveAttribute(
      'href',
      /github\.com/,
    )
    await expect(links.getByRole('link', { name: 'Message on Telegram' })).toHaveAttribute(
      'href',
      /t\.me/,
    )
    await expect(links.getByRole('link', { name: 'Message on WhatsApp' })).toHaveAttribute(
      'href',
      /wa\.me/,
    )
    await expect(links.getByRole('link', { name: 'Send an email' })).toHaveAttribute(
      'href',
      /^mailto:/,
    )
  })

  test('loads every avatar picture', async ({ page }) => {
    await open(page)

    const broken = await page.evaluate(() =>
      [...document.querySelectorAll('.contact-avatar img')]
        .filter((img) => !(img as HTMLImageElement).naturalWidth)
        .map((img) => (img as HTMLImageElement).src),
    )

    expect(broken).toEqual([])
  })

  test('says the same thing in every language', async ({ page }) => {
    for (const [locale, promise] of [
      ['ru', 'Написать в Telegram'],
      ['ua', 'Написати в Telegram'],
    ]) {
      await open(page, locale)
      await expect(page.getByRole('link', { name: promise, exact: true })).toHaveCount(1)
    }
  })
})

test('names the download for what it is in every language', async ({ page }) => {
  for (const [locale, text] of [
    ['en', 'Download resume (PDF)'],
    ['ru', 'Скачать резюме (PDF)'],
    ['ua', 'Завантажити резюме (PDF)'],
  ]) {
    await open(page, locale)
    await expect(page.locator('.contact-avatar--resume')).toHaveText(text)
  }
})

test.describe('the career rail', () => {
  test('is drawn as a single line, not a piece per row', async ({ page }) => {
    await open(page)

    const drawn = await page.evaluate(() => {
      const list = document.querySelector('.experience-timeline') as HTMLElement
      const rails = [...document.querySelectorAll('.experience-timeline__rail')]

      return {
        rows: rails.length,
        line: getComputedStyle(list, '::before').backgroundImage,
        railPieces: rails.filter((rail) => getComputedStyle(rail, '::before').content !== 'none')
          .length,
      }
    })

    expect(drawn.rows).toBeGreaterThan(1)
    expect(drawn.line).toContain('gradient')
    expect(drawn.railPieces).toBe(0)
  })

  test('starts and stops on the beads', async ({ page }) => {
    await open(page)

    const measure = () =>
      page.evaluate(() => {
        const list = document.querySelector('.experience-timeline') as HTMLElement
        const beads = [...document.querySelectorAll('.experience-timeline__bead')]
        const box = list.getBoundingClientRect()
        const line = getComputedStyle(list, '::before')

        const centre = (bead: Element) => {
          const rect = bead.getBoundingClientRect()
          return rect.top + rect.height / 2 - box.top
        }

        return {
          head: parseFloat(line.top),
          tail: box.height - parseFloat(line.bottom),
          firstBead: centre(beads[0]!),
          lastBead: centre(beads[beads.length - 1]!),
        }
      })

    await expect.poll(async () => Math.round((await measure()).head)).toBeGreaterThan(0)

    const rail = await measure()
    expect(Math.abs(rail.head - rail.firstBead)).toBeLessThan(1.5)
    expect(Math.abs(rail.tail - rail.lastBead)).toBeLessThan(1.5)
  })

  test('colours the beads along the gradient it draws', async ({ page }) => {
    await open(page)

    const colours = await page.evaluate(() =>
      [...document.querySelectorAll('.experience-timeline__bead')].map(
        (bead) => getComputedStyle(bead).backgroundColor,
      ),
    )

    expect(colours.length).toBeGreaterThan(1)
    expect(new Set(colours).size).toBe(colours.length)

    const ends = await page.evaluate(() => {
      const probe = document.createElement('span')
      probe.style.backgroundColor = 'color-mix(in oklab, var(--accent), var(--pink) 100%)'
      document.body.append(probe)
      const pink = getComputedStyle(probe).backgroundColor
      probe.remove()
      return pink
    })

    expect(colours[colours.length - 1]).toBe(ends)
  })

  test('marks the current job on the rail and nothing else', async ({ page }) => {
    await open(page)

    await expect(page.locator('.experience-timeline__bead--current')).toHaveCount(1)
    await expect(page.locator('.experience-timeline__row')).toHaveCount(4)
  })

  test('runs a light along the line, and none for anybody who asked for none', async ({ page }) => {
    await open(page)

    const shimmer = () =>
      page.evaluate(() => {
        const list = document.querySelector('.experience-timeline') as HTMLElement
        const light = getComputedStyle(list, '::after')
        return { name: light.animationName, shown: light.display }
      })

    expect((await shimmer()).name).toBe('rail-shimmer')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(async () => (await shimmer()).shown).toBe('none')
  })

  test('lights each bead as the light reaches it', async ({ page }) => {
    await open(page)

    const timing = await page.evaluate(() => {
      const list = document.querySelector('.experience-timeline') as HTMLElement
      const beads = [...document.querySelectorAll('.experience-timeline__bead')]
      const box = list.getBoundingClientRect()
      const styles = getComputedStyle(list)
      const line = getComputedStyle(list, '::before')

      const band = parseFloat(styles.getPropertyValue('--rail-band'))
      const cycle = parseFloat(styles.getPropertyValue('--rail-cycle')) * 1000
      const rest = parseFloat(styles.getPropertyValue('--rail-rest')) * 1000
      const head = parseFloat(line.top)
      const height = box.height - head - parseFloat(line.bottom)

      const driven = document
        .getAnimations()
        .filter((a) =>
          ['rail-shimmer', 'bead-flare', 'bead-ring', 'year-flare'].includes(
            (a as CSSAnimation).animationName,
          ),
        )
      driven.forEach((a) => a.pause())

      const room = parseFloat(getComputedStyle(list, '::after').height) - band
      const streakTop = () => {
        const value = getComputedStyle(list, '::after').backgroundPosition
        const down = value.slice(value.indexOf(' ') + 1)
        const share = /(-?[\d.]+)%/.exec(down)
        const fixed = /([+-]?\s*[\d.]+)px/.exec(down)
        return (
          (share ? (parseFloat(share[1]!) / 100) * room : 0) +
          (fixed ? parseFloat(fixed[1]!.replace(/\s/g, '')) : 0)
        )
      }

      const depths = beads.map((bead) => {
        const rect = bead.getBoundingClientRect()
        return rect.top + rect.height / 2 - box.top - head
      })

      const steps = 128
      const brightest = depths.map(() => ({ at: 0, opacity: -1, ring: '' }))
      const dimmest = depths.map(() => ({ at: 0, opacity: Infinity, ring: '' }))
      const overhead = depths.map(() => ({ at: 0, gap: Infinity }))
      const flaring = depths.map(() => 0)
      let empty = 0
      let first = 0
      let last = 0

      for (let step = 0; step < steps; step += 1) {
        const at = step / steps
        driven.forEach((a) => {
          a.currentTime = at * cycle
        })
        void document.body.offsetHeight

        const top = streakTop()
        if (step === 0) first = top
        last = top
        if (top >= height || top + band <= 0) empty += 1

        beads.forEach((bead, index) => {
          const opacity = Number(getComputedStyle(bead, '::after').opacity)
          const ring = getComputedStyle(bead).borderTopColor
          if (opacity > brightest[index]!.opacity) brightest[index] = { at, opacity, ring }
          if (opacity < dimmest[index]!.opacity) dimmest[index] = { at, opacity, ring }
          if (opacity > 0.15) flaring[index] += 1

          const gap = Math.abs(top + band / 2 - depths[index]!)
          if (gap < overhead[index]!.gap) overhead[index] = { at, gap }
        })
      }

      driven.forEach((a) => a.play())

      return {
        count: beads.length,
        cycle,
        rest,
        brightest,
        dimmest,
        overhead,
        pause: (empty / steps) * cycle,
        crossing: band / (((last - first) * steps) / (steps - 1) / cycle || 1),
        flare: flaring.map((frames) => (frames / steps) * cycle),
      }
    })

    expect(timing.count).toBeGreaterThan(1)

    timing.brightest.forEach((peak, index) => {
      const light = timing.overhead[index]!
      expect(peak.opacity, `bead ${index} peaks`).toBeGreaterThan(0.8)
      expect(Math.abs(peak.at - light.at) * timing.cycle, `bead ${index} drift`).toBeLessThan(60)
    })

    timing.brightest.forEach((peak, index) => {
      expect(luminance(peak.ring), `bead ${index} ring lit`).toBeGreaterThan(0.7)
      expect(luminance(timing.dimmest[index]!.ring), `bead ${index} ring at rest`).toBeLessThan(0.1)
    })

    expect(timing.pause, 'the line rests between passes').toBeGreaterThan(timing.rest * 0.9)
    expect(timing.pause, 'and does not rest all day').toBeLessThan(timing.rest * 1.2)

    timing.flare.forEach((window, index) => {
      expect(window / timing.crossing, `bead ${index} flare against the light`).toBeGreaterThan(0.7)
      expect(window / timing.crossing, `bead ${index} flare against the light`).toBeLessThan(1.35)
    })
  })
})

test('leaves the download off the paper', async ({ page }) => {
  await open(page)
  await page.emulateMedia({ media: 'print' })

  await expect(page.locator('.contact-avatar--resume')).toBeHidden()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          [...document.querySelectorAll('.contact-avatar')].filter(
            (el) => getComputedStyle(el).display !== 'none',
          ).length,
      ),
    )
    .toBe(4)
})
