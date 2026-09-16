import { describe, expect, it } from 'vitest'

import { resumeByLocale } from '../data/resume'
import { getMonthIndex } from '../components/resume/period'
import { contactKinds, locales, type Locale, type ResumeContent } from '../types/resume'

const all = locales.map((locale) => [locale, resumeByLocale[locale]] as const)
const reference = resumeByLocale.en

describe('the three locales describe the same person', () => {
  it('lists the same jobs in the same order', () => {
    all.forEach(([locale, resume]) => {
      expect(
        resume.experience.map((job) => job.id),
        locale,
      ).toEqual(reference.experience.map((job) => job.id))
    })
  })

  it('agrees on when every job started and ended', () => {
    reference.experience.forEach((job, index) => {
      all.forEach(([locale, resume]) => {
        const other = resume.experience[index]!

        expect([locale, job.id, other.start], 'start').toEqual([locale, job.id, job.start])
        expect([locale, job.id, other.end], 'end').toEqual([locale, job.id, job.end])
      })
    })
  })

  it('agrees on the stack of every job', () => {
    reference.experience.forEach((job, index) => {
      all.forEach(([locale, resume]) => {
        expect(resume.experience[index]!.stack, `${locale} ${job.id}`).toEqual(job.stack)
      })
    })
  })

  it('agrees on which jobs carry a promotion or a note', () => {
    reference.experience.forEach((job, index) => {
      all.forEach(([locale, resume]) => {
        const other = resume.experience[index]!

        expect(other.previousRole === undefined, `${locale} ${job.id} previousRole`).toBe(
          job.previousRole === undefined,
        )
        expect(other.roleNote === undefined, `${locale} ${job.id} roleNote`).toBe(
          job.roleNote === undefined,
        )
      })
    })
  })

  it('lists the same work projects with the same screenshots', () => {
    reference.experience.forEach((job, index) => {
      all.forEach(([locale, resume]) => {
        const other = resume.experience[index]!

        expect(
          other.projects.map((project) => project.id),
          `${locale} ${job.id}`,
        ).toEqual(job.projects.map((project) => project.id))

        job.projects.forEach((project, projectIndex) => {
          const twin = other.projects[projectIndex]!

          expect(twin.stack, `${locale} ${project.id} stack`).toEqual(project.stack)
          expect(
            twin.shots.map((shot) => shot.file),
            `${locale} ${project.id} shots`,
          ).toEqual(project.shots.map((shot) => shot.file))
        })
      })
    })
  })

  it('agrees on the pet projects, their links and their screenshots', () => {
    all.forEach(([locale, resume]) => {
      expect(
        resume.projects.map((project) => project.id),
        locale,
      ).toEqual(reference.projects.map((project) => project.id))

      reference.projects.forEach((project, index) => {
        const twin = resume.projects[index]!

        expect(twin.stack, `${locale} ${project.id}`).toEqual(project.stack)
        expect(twin.githubUrl, `${locale} ${project.id}`).toBe(project.githubUrl)
        expect(twin.demoUrl, `${locale} ${project.id}`).toBe(project.demoUrl)
        expect(
          twin.shots.map((shot) => shot.file),
          `${locale} ${project.id}`,
        ).toEqual(project.shots.map((shot) => shot.file))
      })
    })
  })

  it('keeps every job complete within its locale', () => {
    all.forEach(([locale, resume]) => {
      resume.experience.forEach((job) => {
        const where = `${locale} ${job.id}`

        expect(job.company.trim().length, `${where} company`).toBeGreaterThan(0)
        expect(job.role.trim().length, `${where} role`).toBeGreaterThan(0)
        expect(job.responsibilities.length, `${where} responsibilities`).toBeGreaterThan(0)
        expect(job.stack.length, `${where} stack`).toBeGreaterThan(0)

        job.projects.forEach((project) => {
          expect(project.description.trim().length, `${where}/${project.id}`).toBeGreaterThan(0)
          expect(project.stack.length, `${where}/${project.id} stack`).toBeGreaterThan(0)
        })
      })
    })
  })

  it('keeps every pet project complete within its locale', () => {
    all.forEach(([locale, resume]) => {
      resume.projects.forEach((project) => {
        expect(project.stack.length, `${locale} ${project.id} stack`).toBeGreaterThan(0)
        expect(project.shots.length, `${locale} ${project.id} shots`).toBeGreaterThan(0)

        for (const url of [project.githubUrl, project.demoUrl]) {
          if (url !== undefined) expect(url, `${locale} ${project.id} link`).toMatch(/^https:\/\//)
        }
      })
    })
  })

  it('points every language at the same contacts and the same pictures', () => {
    all.forEach(([locale, resume]) => {
      expect(
        resume.profile.contacts.map((contact) => [contact.kind, contact.url, contact.avatar]),
        locale,
      ).toEqual(
        reference.profile.contacts.map((contact) => [contact.kind, contact.url, contact.avatar]),
      )
    })
  })

  it('agrees on education dates and on the skill groups', () => {
    all.forEach(([locale, resume]) => {
      expect(
        resume.education.map((item) => [item.id, item.start, item.end]),
        locale,
      ).toEqual(reference.education.map((item) => [item.id, item.start, item.end]))
      expect(
        resume.skills.map((group) => group.skills),
        locale,
      ).toEqual(reference.skills.map((group) => group.skills))
    })
  })

  it('fills in every label in every language', () => {
    function checkStrings(where: string, value: unknown) {
      if (typeof value === 'string') {
        expect(value.trim().length, where).toBeGreaterThan(0)
        return
      }

      expect(typeof value, where).toBe('object')
      Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
        checkStrings(`${where}.${key}`, nested)
      })
    }

    all.forEach(([locale, resume]) => {
      checkStrings(`${locale}.ui`, resume.ui)
      checkStrings(`${locale}.sections`, resume.sections)
    })
  })

  it('says what every kind of contact does, in every language', () => {
    all.forEach(([locale, resume]) => {
      contactKinds.forEach((kind) => {
        expect(resume.ui.contactActions[kind]?.trim().length, `${locale}.${kind}`).toBeGreaterThan(
          0,
        )
      })
    })
  })

  it('says which locale it is', () => {
    all.forEach(([locale, resume]) => {
      expect(resume.locale).toBe(locale)
    })
  })
})

describe('the data is well formed', () => {
  function everyId(resume: ResumeContent) {
    return [
      ...resume.experience.map((job) => `job:${job.id}`),
      ...resume.experience.flatMap((job) =>
        job.projects.map((project) => `job:${job.id}/${project.id}`),
      ),
      ...resume.projects.map((project) => `project:${project.id}`),
      ...resume.education.map((item) => `education:${item.id}`),
    ]
  }

  it('gives everything an id of its own', () => {
    all.forEach(([locale, resume]) => {
      const ids = everyId(resume)

      expect(new Set(ids).size, locale).toBe(ids.length)
    })
  })

  it('writes every date as a month it can parse', () => {
    const dates: [Locale, string, string][] = []

    all.forEach(([locale, resume]) => {
      resume.experience.forEach((job) => {
        dates.push([locale, `${job.id}.start`, job.start])
        if (job.end !== null) dates.push([locale, `${job.id}.end`, job.end])
      })
      resume.education.forEach((item) => {
        dates.push([locale, `${item.id}.start`, item.start])
        if (item.end !== null) dates.push([locale, `${item.id}.end`, item.end])
      })
    })

    dates.forEach(([locale, where, value]) => {
      expect(getMonthIndex(value), `${locale} ${where} = ${value}`).not.toBeNaN()
    })
  })

  it('never ends a job before it began', () => {
    all.forEach(([locale, resume]) => {
      resume.experience.forEach((job) => {
        if (job.end === null) return

        expect(getMonthIndex(job.end), `${locale} ${job.id}`).toBeGreaterThanOrEqual(
          getMonthIndex(job.start),
        )
      })
    })
  })

  it('gives every screenshot a caption in the language it is shown in', () => {
    all.forEach(([locale, resume]) => {
      const shots = [
        ...resume.experience.flatMap((job) => job.projects.flatMap((project) => project.shots)),
        ...resume.projects.flatMap((project) => project.shots),
      ]

      expect(shots.length).toBeGreaterThan(0)
      shots.forEach((shot) => {
        expect(shot.alt.trim().length, `${locale} ${shot.file}`).toBeGreaterThan(0)
      })
    })
  })

  it('gives every contact either a picture or its own mark', () => {
    all.forEach(([locale, resume]) => {
      resume.profile.contacts.forEach((contact) => {
        if (contact.avatar === undefined) return

        expect(contact.avatar.trim().length, `${locale} ${contact.label}`).toBeGreaterThan(0)
      })
    })
  })

  it('only names services it knows how to draw', () => {
    all.forEach(([locale, resume]) => {
      resume.profile.contacts.forEach((contact) => {
        expect(contactKinds, `${locale} ${contact.label}`).toContain(contact.kind)
      })
    })
  })
})
