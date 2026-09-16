/*
 * Builds the one-page PDF resumes from src/data/resume.ts, one per language.
 *
 *   npm run resume:pdf               all three
 *   npm run resume:pdf -- en         just one
 *   npm run resume:pdf -- --preview  also save a PNG of each into test-results/
 *
 * The layout follows Jake's Resume (github.com/jakegut/resume, MIT). Job bullets
 * are condensed here so that everything fits on a single page.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

import { resumeByLocale } from '../src/data/resume.ts'
import type { ExperienceItem, Locale, ResumeContent, SkillGroup } from '../src/types/resume.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

interface JobCopy {
  company?: string
  role?: string
  bullets: string[]
}

interface PdfCopy {
  summary: string
  headings: {
    summary: string
    experience: string
    projects: string
    skills: string
    education: string
    languages: string
  }
  present: string
  formerly: string
  demo: string
  institutionShort: Record<string, string>
  skillLines: { label: string; groups: number[] }[]
  jobs: Record<string, JobCopy>
}

const FRONTEND = 0
const STATE = 1
const BACKEND = 2
const DATABASES = 3
const TESTING = 4
const TOOLING = 5
const DEVOPS = 6
const CMS = 7
const GRAPHICS = 8
const ARCHITECTURE = 9

const copy: Record<Locale, PdfCopy> = {
  ru: {
    summary:
      'Full-stack веб-разработчик с основным стеком Vue, Nuxt, TypeScript и Node.js. Проектирую и реализую веб-приложения целиком, включая интерфейс, серверную часть, интеграции и инфраструктуру развертывания.',
    headings: {
      summary: 'О себе',
      experience: 'Опыт работы',
      projects: 'Пет-проекты',
      skills: 'Навыки',
      education: 'Образование',
      languages: 'Языки',
    },
    present: 'н. в.',
    formerly: 'ранее',
    demo: 'Демо',
    institutionShort: {
      'Государственный университет интеллектуальных технологий и связи (ГУИТС / ДУІТЗ)':
        'ГУИТС / ДУІТЗ',
    },
    skillLines: [
      { label: 'Frontend', groups: [FRONTEND, STATE] },
      { label: 'Backend и базы данных', groups: [BACKEND, DATABASES] },
      { label: 'Тестирование и DevOps', groups: [TESTING, DEVOPS, TOOLING] },
      { label: 'CMS', groups: [CMS] },
      { label: 'Веб-графика', groups: [GRAPHICS] },
      { label: 'Архитектура', groups: [ARCHITECTURE] },
    ],
    jobs: {
      cuit: {
        bullets: [
          'Разрабатываю веб-сервисы и информационные системы для Запорожской ОГА.',
          '<b>ZODA Memorial</b> — онлайн-мемориал с публичным каталогом, поиском, картой и CMS (Nuxt, Payload CMS, PostgreSQL).',
          '<b>Air Monitor Kyiv</b> — система локализованных оповещений о воздушных угрозах по районам и громадам (Python, aiogram, Telethon).',
        ],
      },
      belnet: {
        bullets: [
          'Разработал frontend новой модульной ERP-системы интернет-провайдера до alpha-версии: архитектура, общие компоненты, состояние, интеграция с REST и GraphQL API (React, Next.js, TypeScript).',
          'Довёл Telegram Mini App для монтажников от прототипа до рабочего интерфейса (Vue, Tailwind CSS).',
        ],
      },
      oiac: {
        role: 'Руководитель отдела разработки ПО (ранее — инженер ПО)',
        bullets: [
          'Через полгода повышен до руководителя; распределял задачи и контролировал работу двух сотрудников.',
          '<b>R&amp;D Hub Platform</b> — платформа хакатонов с админ-панелью и ролями (Vue 3, Express, PostgreSQL).',
          '<b>Интерактивная карта Одессы</b> — реализована за 4 дня (Vue 3, Leaflet, Express, PostgreSQL).',
          '<b>Система учёта сотрудников</b> — Telegram-бот учёта присутствия и статусов (Python, aiogram, PostgreSQL).',
          'Сопровождал 40+ WordPress-сайтов громад и областных структур.',
        ],
      },
      suitt: {
        company: 'ГУИТС / ДУІТЗ',
        bullets: [
          'Развернул университетскую платформу Moodle и администрировал её: роли и доступы, обновления, поддержка преподавателей и студентов. С 09.2024 — по совместительству.',
        ],
      },
    },
  },
  ua: {
    summary:
      'Full-stack веб-розробник з основним стеком Vue, Nuxt, TypeScript і Node.js. Проєктую та реалізую вебзастосунки повністю, включно з інтерфейсом, серверною частиною, інтеграціями та інфраструктурою розгортання.',
    headings: {
      summary: 'Про себе',
      experience: 'Досвід роботи',
      projects: 'Пет-проєкти',
      skills: 'Навички',
      education: 'Освіта',
      languages: 'Мови',
    },
    present: 'дотепер',
    formerly: 'раніше',
    demo: 'Демо',
    institutionShort: {
      'Державний університет інтелектуальних технологій і зв’язку (ДУІТЗ)': 'ДУІТЗ',
    },
    skillLines: [
      { label: 'Frontend', groups: [FRONTEND, STATE] },
      { label: 'Backend і бази даних', groups: [BACKEND, DATABASES] },
      { label: 'Тестування та DevOps', groups: [TESTING, DEVOPS, TOOLING] },
      { label: 'CMS', groups: [CMS] },
      { label: 'Вебграфіка', groups: [GRAPHICS] },
      { label: 'Архітектура', groups: [ARCHITECTURE] },
    ],
    jobs: {
      cuit: {
        bullets: [
          'Розробляю вебсервіси та інформаційні системи для Запорізької ОДА.',
          '<b>ZODA Memorial</b> — онлайн-меморіал із публічним каталогом, пошуком, мапою та CMS (Nuxt, Payload CMS).',
          '<b>Air Monitor Kyiv</b> — система локалізованих сповіщень про повітряні загрози за районами та громадами (Python, aiogram, Telethon).',
        ],
      },
      belnet: {
        bullets: [
          'Розробив frontend нової модульної ERP-системи інтернет-провайдера до alpha-версії: архітектура, спільні компоненти, стан, інтеграція з REST і GraphQL API (React, Next.js, TypeScript).',
          'Довів Telegram Mini App для монтажників від прототипу до робочого інтерфейсу (Vue, Tailwind CSS).',
        ],
      },
      oiac: {
        role: 'Керівник відділу розробки ПЗ (раніше — інженер ПЗ)',
        bullets: [
          'Через пів року підвищений до керівника; розподіляв завдання та контролював роботу двох працівників.',
          '<b>R&amp;D Hub Platform</b> — платформа хакатонів з адмін-панеллю та ролями (Vue 3, Express, PostgreSQL).',
          '<b>Інтерактивна карта Одеси</b> — реалізована за 4 дні (Vue 3, Leaflet, Express, PostgreSQL).',
          '<b>Система обліку працівників</b> — Telegram-бот обліку присутності та статусів (Python, aiogram, PostgreSQL).',
          'Супроводжував 40+ WordPress-сайтів громад та обласних структур.',
        ],
      },
      suitt: {
        company: 'ДУІТЗ',
        bullets: [
          'Розгорнув університетську платформу Moodle та адміністрував її: ролі й доступи, оновлення, підтримка викладачів і студентів. З 09.2024 — за сумісництвом.',
        ],
      },
    },
  },
  en: {
    summary:
      'Full-stack web developer whose core stack is Vue, Nuxt, TypeScript, and Node.js. I design and build web applications end to end, including the interface, the server side, integrations, and deployment infrastructure.',
    headings: {
      summary: 'Summary',
      experience: 'Experience',
      projects: 'Pet Projects',
      skills: 'Skills',
      education: 'Education',
      languages: 'Languages',
    },
    present: 'Present',
    formerly: 'formerly',
    demo: 'Demo',
    institutionShort: {
      'State University of Intelligent Technologies and Telecommunications (SUITT / ДУІТЗ)':
        'SUITT / ДУІТЗ',
    },
    skillLines: [
      { label: 'Frontend', groups: [FRONTEND, STATE] },
      { label: 'Backend & Databases', groups: [BACKEND, DATABASES] },
      { label: 'Testing & DevOps', groups: [TESTING, DEVOPS, TOOLING] },
      { label: 'CMS', groups: [CMS] },
      { label: 'Web Graphics', groups: [GRAPHICS] },
      { label: 'Architecture', groups: [ARCHITECTURE] },
    ],
    jobs: {
      cuit: {
        bullets: [
          'Develop web services and information systems for the Zaporizhzhia Regional State Administration.',
          '<b>ZODA Memorial</b> — online memorial with a public catalog, search, a map, and a CMS (Nuxt, Payload CMS, PostgreSQL).',
          '<b>Air Monitor Kyiv</b> — localized air-threat alert system by district and community (Python, aiogram, Telethon).',
        ],
      },
      belnet: {
        bullets: [
          'Built the frontend of the ISP’s new modular ERP system up to alpha: architecture, shared components, state, REST and GraphQL API integration (React, Next.js, TypeScript).',
          'Took a Telegram Mini App for field installers from prototype to a working interface (Vue, Tailwind CSS).',
        ],
      },
      oiac: {
        role: 'Head of Software Development (formerly Software Engineer)',
        bullets: [
          'Promoted to department head after six months; assigned tasks to and supervised two staff members.',
          '<b>R&amp;D Hub Platform</b> — hackathon platform with an admin panel and roles (Vue 3, Express, PostgreSQL).',
          '<b>Odesa Interactive Map</b> — built in 4 days (Vue 3, Leaflet, Express, PostgreSQL).',
          '<b>Employee Attendance System</b> — Telegram bot tracking attendance and statuses (Python, aiogram, PostgreSQL).',
          'Maintained 40+ WordPress sites of territorial communities and regional bodies.',
        ],
      },
      suitt: {
        company: 'SUITT / ДУІТЗ',
        role: 'First-Category Specialist, Center for Online Learning Technologies',
        bullets: [
          'Deployed the university’s Moodle platform and administered it: roles and access, updates, support for faculty and students. Part-time since 09.2024.',
        ],
      },
    },
  },
}

function escape(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function month(value: string) {
  const [year, mon] = value.split('-')
  return `${mon}.${year}`
}

function place(location: string) {
  return location.replace(' · ', ', ')
}

function link(url: string, text = url.replace(/^(https:\/\/|mailto:)/, '')) {
  return `<a href="${escape(url)}">${escape(text)}</a>`
}

function level(text: string) {
  return /^[ABC][12]$/.test(text) ? text : text.toLowerCase()
}

function firstSentence(text: string) {
  const end = text.indexOf('. ')
  return end === -1 ? text : text.slice(0, end + 1)
}

function fontFaces() {
  return ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext']
    .map((subset) => {
      const data = readFileSync(resolve(root, `src/assets/fonts/inter-${subset}.woff2`)).toString(
        'base64',
      )
      return `@font-face { font-family: 'Inter'; font-weight: 400 800; src: url(data:font/woff2;base64,${data}) format('woff2'); }`
    })
    .join('\n')
}

function renderHtml(locale: Locale, resume: ResumeContent, text: PdfCopy, fonts: string) {
  const period = (start: string, end: string | null) =>
    `${month(start)} — ${end === null ? text.present : month(end)}`

  function jobHtml(job: ExperienceItem) {
    const jobCopy = text.jobs[job.id]
    if (!jobCopy) throw new Error(`[${locale}] No PDF copy for job "${job.id}".`)

    const role =
      jobCopy.role ??
      (job.previousRole
        ? `${job.role} (${text.formerly} — ${job.previousRole.toLowerCase()})`
        : job.role)

    return `
    <div class="entry">
      <div class="row"><b>${escape(jobCopy.company ?? job.company)}</b><span>${escape(place(job.location))}</span></div>
      <div class="row sub"><i>${escape(role)}</i><i>${period(job.start, job.end)}</i></div>
      <ul>${jobCopy.bullets.map((bullet) => `<li>${bullet}</li>`).join('')}</ul>
    </div>`
  }

  function skillsHtml(groups: SkillGroup[]) {
    const used = new Set(text.skillLines.flatMap((line) => line.groups))
    const missed = groups.filter((_, index) => !used.has(index)).map((group) => group.name)
    if (missed.length > 0) {
      throw new Error(`[${locale}] Skill groups not placed in the PDF: ${missed.join(', ')}`)
    }

    return text.skillLines
      .map((line) => {
        const names = line.groups.flatMap((index) => {
          const group = groups[index]
          if (!group) throw new Error(`[${locale}] No skill group at position ${index}.`)
          return group.skills
            .filter((skill) => skill.level !== 'familiar')
            .map((skill) => skill.name)
        })
        const items = names.map((name) => `<span class="nowrap">${escape(name)}</span>`)
        return `<p><b>${escape(line.label)}:</b> ${items.join(', ')}</p>`
      })
      .join('')
  }

  function contactsHtml() {
    const parts = [escape(resume.profile.location)]
    for (const contact of resume.profile.contacts) {
      parts.push(link(contact.url))
    }
    return parts
      .map((part) => `<span class="nowrap">${part}</span>`)
      .join('<span class="sep">|</span>')
  }

  function educationHtml() {
    return resume.education
      .map((item) => {
        const institution = text.institutionShort[item.institution] ?? item.institution
        return `
      <div class="row edu"><span><b>${escape(item.honors ? `${item.qualification} ${item.honors}` : item.qualification)}</b> — ${escape(institution)}</span><i>${period(item.start, item.end)}</i></div>`
      })
      .join('')
  }

  function projectsHtml() {
    return resume.projects
      .map((project) => {
        const links = [
          project.githubUrl ? link(project.githubUrl, 'GitHub') : '',
          project.demoUrl ? link(project.demoUrl, text.demo) : '',
        ].filter(Boolean)
        return `
      <div class="entry">
        <div class="row"><span><b>${escape(project.name)}</b> <span class="sep">|</span> <i>${escape(project.stack.join(', '))}</i></span><span>${links.join(' · ')}</span></div>
        <p class="line">${escape(firstSentence(project.description))}</p>
      </div>`
      })
      .join('')
  }

  const languages = resume.languages
    .map((language) => `${escape(language.name)} — ${escape(level(language.level))}`)
    .join('; ')

  // `ua` is our route, not a language tag: Ukrainian is `uk`.
  const lang = locale === 'ua' ? 'uk' : locale

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<style>
${fonts}
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #fff; color: #000; }
body { font-family: 'Inter', Arial, sans-serif; font-size: 9.2pt; line-height: 1.32; }
.page { width: 210mm; padding: 11mm 13mm; }
a { color: #000; text-decoration: underline; text-underline-offset: 1.5px; }
header { text-align: center; margin-bottom: 7px; }
h1 { font-size: 22pt; font-weight: 700; letter-spacing: 0.02em; font-variant: small-caps; line-height: 1.1; }
.title { font-size: 10.5pt; margin-top: 1px; }
.contacts { margin-top: 3px; font-size: 8.8pt; }
.sep { margin: 0 4px; }
.nowrap { white-space: nowrap; }
.edu { margin-bottom: 2px; }
h2 { font-size: 11pt; font-weight: 600; font-variant: small-caps; letter-spacing: 0.03em;
     border-bottom: 0.8px solid #000; padding-bottom: 1px; margin: 8px 0 4px; }
.entry { margin-bottom: 4px; }
.row { display: flex; justify-content: space-between; gap: 12px; }
.row > :last-child { text-align: right; white-space: nowrap; }
.sub { font-size: 8.9pt; }
ul { margin: 1px 0 0 14px; }
li { margin-bottom: 1px; padding-left: 2px; }
li::marker { font-size: 7pt; }
.line { margin-top: 1px; }
.skills p { margin-bottom: 1.5px; }
</style>
</head>
<body>
<div class="page">
  <header>
    <h1>${escape(resume.profile.name)}</h1>
    <div class="title">${escape(resume.profile.title)}</div>
    <div class="contacts">${contactsHtml()}</div>
  </header>

  <h2>${escape(text.headings.summary)}</h2>
  <p>${escape(text.summary)}</p>

  <h2>${escape(text.headings.experience)}</h2>
  ${resume.experience.map(jobHtml).join('')}

  <h2>${escape(text.headings.projects)}</h2>
  ${projectsHtml()}

  <h2>${escape(text.headings.skills)}</h2>
  <div class="skills">${skillsHtml(resume.skills)}</div>

  <h2>${escape(text.headings.education)}</h2>
  ${educationHtml()}

  <h2>${escape(text.headings.languages)}</h2>
  <p>${languages}</p>
</div>
</body>
</html>`
}

const pageHeightPx = (297 / 25.4) * 96

const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
const targets = (requested.length > 0 ? requested : ['ru', 'ua', 'en']) as Locale[]
const preview = process.argv.includes('--preview')
const fonts = fontFaces()

const browser = await chromium.launch()
const failures: string[] = []
try {
  for (const locale of targets) {
    const resume = resumeByLocale[locale]
    if (!resume) throw new Error(`Unknown locale "${locale}".`)

    const page = await browser.newPage()
    await page.setContent(renderHtml(locale, resume, copy[locale], fonts), { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)

    const height = await page.evaluate(
      () => (document.querySelector('.page') as HTMLElement).getBoundingClientRect().height,
    )

    if (preview) {
      const shot = resolve(root, 'test-results', `resume-${locale}-preview.png`)
      await page.setViewportSize({ width: 794, height: Math.ceil(pageHeightPx) })
      await page.screenshot({ path: shot, fullPage: true })
      console.log(`Preview ${shot}`)
    }

    if (height > pageHeightPx) {
      failures.push(
        `[${locale}] ${Math.round(height)}px tall, A4 holds ${Math.floor(pageHeightPx)}px — trim the copy.`,
      )
      await page.close()
      continue
    }

    const output = resolve(root, 'src/assets/documents', resume.profile.resumePdf)
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
    writeFileSync(output, pdf)
    console.log(
      `[${locale}] Wrote ${output} (${Math.round(height)} / ${Math.floor(pageHeightPx)}px used)`,
    )
    await page.close()
  }
} finally {
  await browser.close()
}

if (failures.length > 0) throw new Error(failures.join('\n'))
