export const locales = ['ua', 'ru', 'en'] as const

export type Locale = (typeof locales)[number]

export interface LocaleOption {
  code: Locale
  label: string
  shortLabel: string
}

export const contactKinds = ['github', 'telegram', 'whatsapp', 'email'] as const

export type ContactKind = (typeof contactKinds)[number]

export interface ContactLink {
  kind: ContactKind
  label: string
  url: string
  /** Profile picture file in `src/assets/avatars/`; omitted for the email tile. */
  avatar?: string
}

export interface ProjectShot {
  file: string
  alt: string
}

export interface ProfileContent {
  name: string
  title: string
  location: string
  timezone: string
  summary: string
  availability: string
  contacts: ContactLink[]
  /** File in `src/assets/documents/`. One per locale. */
  resumePdf: string
}

export interface SectionLabels {
  experience: string
  projects: string
  skills: string
  background: string
}

export interface UiLabels {
  nowPlaying: string
  playMusic: string
  pauseMusic: string
  chooseTrack: string
  restartTrack: string
  turntable: string
  volume: string
  volumeUp: string
  volumeDown: string
  localTime: string
  trackTime: string
  scrollToBottom: string
  scrollToTop: string
  downloadPdf: string
  present: string
  technologyStack: string
  contactLinks: string
  contactActions: Record<ContactKind, string>
  promotedFrom: string
  workProjects: string
  openScreenshot: string
  screenshots: string
  closeScreenshot: string
  previousScreenshot: string
  nextScreenshot: string
  education: string
  languages: string
  skillLevels: string
  skillLevelNames: Record<SkillLevel, string>
}

export interface WorkProject {
  id: string
  name: string
  description: string
  stack: string[]
  shots: ProjectShot[]
}

export interface ExperienceItem {
  id: string
  company: string
  role: string
  previousRole?: string
  roleNote?: string
  /** `'YYYY-MM'`; `end: null` while the job is current. */
  start: string
  end: string | null
  location: string
  description: string
  responsibilities: string[]
  achievements: string[]
  stack: string[]
  projects: WorkProject[]
}

export interface ProjectItem {
  id: string
  name: string
  description: string
  highlights: string[]
  stack: string[]
  githubUrl?: string
  demoUrl?: string
  shots: ProjectShot[]
}

export type SkillLevel = 'core' | 'proficient' | 'familiar'

export interface SkillItem {
  name: string
  level: SkillLevel
}

export interface SkillGroup {
  name: string
  skills: SkillItem[]
}

export interface EducationItem {
  id: string
  institution: string
  qualification: string
  honors?: string
  start: string
  end: string | null
}

export interface SpokenLanguage {
  code: string
  name: string
  level: string
}

export interface ResumeContent {
  locale: Locale
  sections: SectionLabels
  ui: UiLabels
  profile: ProfileContent
  experience: ExperienceItem[]
  projects: ProjectItem[]
  skills: SkillGroup[]
  education: EducationItem[]
  languages: SpokenLanguage[]
}
