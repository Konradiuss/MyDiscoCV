import type { ContactLink, Locale, LocaleOption, ResumeContent, SkillItem } from '@/types/resume'

export const defaultLocale: Locale = 'en'

export const localeOptions: LocaleOption[] = [
  { code: 'ua', label: 'Українська', shortLabel: 'UA' },
  { code: 'ru', label: 'Русский', shortLabel: 'RU' },
  { code: 'en', label: 'English', shortLabel: 'EN' },
]

export function isLocale(value: string | undefined): value is Locale {
  return value === 'ua' || value === 'ru' || value === 'en'
}

/*
 * Each locale is written out in full. __tests__/resumeData.spec.ts checks that the
 * parts which must match across languages (dates, stacks, links, screenshots) agree.
 */

/*
 * `avatar` names a file in src/assets/avatars/. The email tile has none and shows
 * its mark instead.
 */
const contacts: ContactLink[] = [
  {
    kind: 'github',
    label: 'Konradiuss',
    url: 'https://github.com/Konradiuss',
    avatar: 'konradiuss-github.jpg',
  },
  {
    kind: 'telegram',
    label: 'Alexander Konrad',
    url: 'https://t.me/Alexander_Konrad',
    avatar: 'alexander-konrad-telegram.jpg',
  },
  {
    kind: 'whatsapp',
    label: 'Alexander Konrad',
    url: 'https://wa.me/380963443808',
    avatar: 'alexander-konrad-whatsapp.jpg',
  },
  {
    kind: 'email',
    label: 'regularguy835@gmail.com',
    url: 'mailto:regularguy835@gmail.com',
  },
]

const skillGroups = {
  frontend: [
    { name: 'Vue.js', level: 'core' },
    { name: 'Nuxt', level: 'core' },
    { name: 'TypeScript', level: 'core' },
    { name: 'JavaScript', level: 'core' },
    { name: 'HTML', level: 'core' },
    { name: 'CSS', level: 'core' },
    { name: 'Tailwind CSS', level: 'proficient' },
    { name: 'React', level: 'proficient' },
    { name: 'Next.js', level: 'proficient' },
    { name: 'SCSS / Sass', level: 'proficient' },
    { name: 'Vue Router', level: 'proficient' },
    { name: 'Vue I18n', level: 'proficient' },
    { name: 'VeeValidate', level: 'proficient' },
    { name: 'Yup', level: 'proficient' },
    { name: 'Chart.js', level: 'proficient' },
  ],
  state: [
    { name: 'Pinia', level: 'core' },
    { name: 'REST API', level: 'core' },
    { name: 'TanStack Query', level: 'proficient' },
    { name: 'VueUse', level: 'proficient' },
    { name: 'Axios / Fetch API', level: 'proficient' },
    { name: 'WebSocket / Socket.IO', level: 'proficient' },
    { name: 'Zustand', level: 'proficient' },
    { name: 'GraphQL', level: 'familiar' },
  ],
  backend: [
    { name: 'Node.js', level: 'core' },
    { name: 'Nuxt Server / Nitro', level: 'proficient' },
    { name: 'Express.js', level: 'proficient' },
    { name: 'Python', level: 'proficient' },
    { name: 'aiogram / Telethon', level: 'proficient' },
    { name: 'Django / Django REST Framework', level: 'familiar' },
    { name: 'PHP', level: 'familiar' },
    { name: 'Laravel', level: 'familiar' },
    { name: 'Java', level: 'familiar' },
  ],
  databases: [
    { name: 'PostgreSQL', level: 'core' },
    { name: 'SQLite', level: 'proficient' },
    { name: 'Redis', level: 'proficient' },
    { name: 'Prisma', level: 'proficient' },
    { name: 'Sequelize', level: 'proficient' },
    { name: 'SQLAlchemy / Alembic', level: 'proficient' },
    { name: 'MongoDB / Mongoose', level: 'familiar' },
  ],
  testing: [
    { name: 'Vitest', level: 'core' },
    { name: 'Playwright', level: 'proficient' },
    { name: 'pytest', level: 'proficient' },
    { name: 'Vue Test Utils', level: 'proficient' },
    { name: 'Pest / PHPUnit', level: 'familiar' },
  ],
  tooling: [
    { name: 'Git', level: 'core' },
    { name: 'GitHub', level: 'core' },
    { name: 'npm', level: 'core' },
    { name: 'pnpm', level: 'proficient' },
    { name: 'Vite', level: 'proficient' },
    { name: 'ESLint', level: 'proficient' },
    { name: 'Prettier', level: 'proficient' },
    { name: 'Turborepo', level: 'proficient' },
    { name: 'GitHub Pages', level: 'familiar' },
  ],
  devops: [
    { name: 'Docker', level: 'core' },
    { name: 'Caddy', level: 'proficient' },
    { name: 'Linux', level: 'proficient' },
    { name: 'CI/CD', level: 'proficient' },
    { name: 'GitLab CI', level: 'proficient' },
    { name: 'GitHub Actions', level: 'proficient' },
    { name: 'Cloudflare Tunnel', level: 'proficient' },
  ],
  cms: [
    { name: 'Directus', level: 'proficient' },
    { name: 'Payload CMS', level: 'proficient' },
    { name: 'Strapi', level: 'familiar' },
  ],
  graphics: [
    { name: 'Three.js', level: 'proficient' },
    { name: 'PixiJS', level: 'familiar' },
    { name: 'GSAP', level: 'familiar' },
  ],
  architecture: [
    { name: 'Client–Server', level: 'core' },
    { name: 'Monorepo', level: 'proficient' },
    { name: 'Microfrontends', level: 'proficient' },
    { name: 'Headless CMS', level: 'proficient' },
  ],
} satisfies Record<string, SkillItem[]>

export const resumeByLocale: Record<Locale, ResumeContent> = {
  ua: {
    locale: 'ua',
    sections: {
      experience: 'Досвід роботи',
      projects: 'Пет-проєкти',
      skills: 'Навички',
      background: 'Освіта та мови',
    },
    ui: {
      nowPlaying: 'Зараз грає',
      playMusic: 'Увімкнути музику',
      pauseMusic: 'Вимкнути музику',
      chooseTrack: 'Вибрати трек',
      restartTrack: 'Спочатку',
      turntable: 'Програвач',
      volume: 'Гучність',
      volumeUp: 'Гучніше',
      volumeDown: 'Тихіше',
      localTime: 'Ваш час',
      trackTime: 'Час треку',
      scrollToBottom: 'Вниз сторінки',
      scrollToTop: 'Вгору сторінки',
      downloadPdf: 'Завантажити резюме (PDF)',
      present: 'дотепер',
      technologyStack: 'Технології',
      contactLinks: 'Посилання',
      contactActions: {
        github: 'Відкрити GitHub',
        telegram: 'Написати в Telegram',
        whatsapp: 'Написати у WhatsApp',
        email: 'Написати на пошту',
      },
      promotedFrom: 'Підвищення з посади',
      workProjects: 'Проєкти',
      openScreenshot: 'Відкрити знімок',
      screenshots: 'Знімків',
      closeScreenshot: 'Закрити знімок',
      previousScreenshot: 'Попередній знімок',
      nextScreenshot: 'Наступний знімок',
      education: 'Освіта',
      languages: 'Мови',
      skillLevels: 'Рівні володіння',
      skillLevelNames: {
        core: 'Основний',
        proficient: 'Впевнений',
        familiar: 'Базовий',
      },
    },
    profile: {
      name: 'Бабій Олександр',
      title: 'Full-stack веб-розробник',
      location: 'Одеса, Україна',
      timezone: 'Europe/Kyiv',
      summary:
        'Full-stack веб-розробник з основним стеком Vue, Nuxt, TypeScript і Node.js. Проєктую та реалізую вебзастосунки повністю, включно з інтерфейсом, серверною частиною, інтеграціями та інфраструктурою розгортання. У вільний час експериментую з ігровими модифікаціями та вебпроєктами, пов’язаними з відеоіграми.',
      availability: 'Відкритий до віддаленої роботи',
      contacts,
      resumePdf: 'resume-ua.pdf',
    },
    experience: [
      {
        id: 'cuit',
        company: 'ЦУІТ',
        role: 'Full-stack Developer',
        start: '2026-04',
        end: null,
        location: 'Запоріжжя, Україна · віддалено',
        description:
          'Розробляю вебсервіси, вебсайти та інформаційні системи для проєктів Запорізької обласної державної адміністрації. Працюю над проєктами, де часто виступаю в ролі як розробника, так і адміністратора. Розробляю інтерфейси, серверну частину, бази даних та інтеграції із зовнішніми сервісами. Паралельно займаюся підтримкою наявних систем та інфраструктури.',
        responsibilities: [
          'Розробляю вебсайти, внутрішні сервіси та спеціалізовані вебзастосунки.',
          'Проєктую frontend- і backend-частини застосунків, моделі даних та інтеграції.',
          'Налаштовую бази даних, контейнеризацію та середовище для розгортання проєктів.',
          'Підтримую та доопрацьовую системи в разі зміни вимог замовника.',
          'Готую проєкти до передачі та розміщення в інфраструктурі замовника.',
        ],
        achievements: [
          'Частину розроблених проєктів поки не представлено в портфоліо: вони очікують погодження публікації з боку замовника.',
          'Розробив ZODA Memorial — повноцінний онлайн-меморіал із публічною частиною, CMS, пошуком та адміністративними інструментами.',
        ],
        stack: [
          'Vue',
          'Nuxt',
          'TypeScript',
          'Node.js',
          'Python',
          'PostgreSQL',
          'Prisma',
          'Directus',
          'Payload CMS',
          'Redis / Valkey',
          'Docker',
          'Caddy',
          'Vitest',
          'Playwright',
        ],
        projects: [
          {
            id: 'zoda-memorial',
            name: 'ZODA Memorial',
            description:
              'Онлайн-меморіал із публічним каталогом, пошуком, мапою, системою подання матеріалів та адміністративною CMS для керування контентом. Проєкт розроблено та передано замовнику.',
            stack: [
              'Nuxt',
              'Vue',
              'TypeScript',
              'Payload CMS',
              'PostgreSQL',
              'Redis / Valkey',
              'Docker',
              'Caddy',
              'Vitest',
              'Playwright',
            ],
            shots: [
              {
                file: 'zoda-memorial-01.jpg',
                alt: 'Головна сторінка онлайн-меморіалу «Меморіал Честі» з описом Книги пам’яті та швидким переходом до пошуку.',
              },
              {
                file: 'zoda-memorial-02.jpg',
                alt: 'Сторінка профілю Захисника на демонстраційних даних: біографія, нагороди, фотогалерея та QR-код профілю.',
              },
              {
                file: 'zoda-memorial-03.jpg',
                alt: 'Інтерактивна мапа місць поховання Запорізької області з кластерами міток і фільтром за районом.',
              },
              {
                file: 'zoda-memorial-04.jpg',
                alt: 'Каталог місць поховання за районами та громадами з картками Героїв вибраного місця на демонстраційних даних.',
              },
              {
                file: 'zoda-memorial-05.jpg',
                alt: 'Адміністративна панель Payload CMS з розділами меморіалу, довідників, змісту сайту та адміністрування.',
              },
            ],
          },
          {
            id: 'air-monitor-kyiv',
            name: 'Air Monitor Kyiv',
            description:
              'Система збору, аналізу та локалізованої доставки сповіщень про повітряні загрози для Київської області та міста Києва. Визначає уражені райони та громади, формує на основі цієї інформації звіти.',
            stack: [
              'Python',
              'aiogram',
              'Telethon',
              'aiohttp',
              'SQLite',
              'aiosqlite',
              'Shapely',
              'Pillow',
              'Docker',
              'Pytest',
            ],
            shots: [
              {
                file: 'air-monitor-kyiv-01.png',
                alt: 'Сповіщення про безпосередню загрозу з локальною мапою Київської області, ураженими районами й громадами та діагностикою джерела.',
              },
              {
                file: 'air-monitor-kyiv-02.png',
                alt: 'Сповіщення про загрозу для міста Києва з оглядовою мапою області та детальною мапою громад Бучанського району.',
              },
              {
                file: 'air-monitor-kyiv-03.png',
                alt: 'Вітальне повідомлення Telegram-бота з описом джерел, політики зберігання даних і меню команд.',
              },
              {
                file: 'air-monitor-kyiv-04.png',
                alt: 'Вибір районів Київської області та міста Києва для підписки на сповіщення.',
              },
            ],
          },
        ],
      },
      {
        id: 'belnet',
        company: 'БЕЛНЕТ',
        role: 'Frontend Developer',
        start: '2025-05',
        end: '2026-03',
        location: 'Одеса, Україна · гібрид',
        description:
          'Працював над внутрішніми цифровими продуктами інтернет-провайдера. Основним проєктом стала нова ERP-система підприємства; паралельно розробив frontend Telegram Mini App для монтажників на місцях.',
        responsibilities: [
          'Розробляв frontend нової внутрішньої ERP-системи разом із backend-розробником.',
          'Проєктував інтерфейси, структуру застосунку та керування станом.',
          'Інтегрував frontend з API та серверною частиною системи.',
          'Розробляв спільні компоненти та архітектуру кількох функціональних модулів.',
          'Створив frontend Telegram Mini App для внутрішніх завдань компанії.',
        ],
        achievements: [
          'Розробив frontend нової ERP-системи підприємства до стану alpha-версії.',
          'Довів окремий Telegram Mini App від прототипу до завершеного робочого інтерфейсу.',
        ],
        stack: [
          'React',
          'Next.js',
          'TypeScript',
          'Tailwind CSS',
          'Zustand',
          'REST API',
          'GraphQL',
          'Turborepo',
          'pnpm',
          'Docker',
          'GitLab CI',
        ],
        projects: [
          {
            id: 'belnet-erp',
            name: 'Внутрішня ERP-система',
            description:
              'Модульна система для автоматизації внутрішніх процесів інтернет-провайдера. Відповідав за frontend і розробив його до повноцінної alpha-версії.',
            stack: [
              'React',
              'Next.js',
              'TypeScript',
              'Tailwind CSS',
              'Zustand',
              'REST API',
              'GraphQL',
              'Turborepo',
            ],
            shots: [
              {
                file: 'belnet-erp-01.jpg',
                alt: 'Модуль лідів ERP-системи: зведені показники за статусами та таблиця заявок із джерелом, кампанією, статусом і відповідальним менеджером.',
              },
              {
                file: 'belnet-erp-02.jpg',
                alt: 'Модуль персоналу: таблиця працівників із посадою, групою доступу, статусом, двофакторною автентифікацією та останньою активністю.',
              },
              {
                file: 'belnet-erp-03.jpg',
                alt: 'Екран входу до робочого простору ERP-системи через пошту й пароль або через Google.',
              },
              {
                file: 'belnet-erp-04.jpg',
                alt: 'Таблиця лідів із системними полями та вкладками відкритих модулів у верхній панелі інтерфейсу.',
              },
            ],
          },
          {
            id: 'belnet-telegram-mini-app',
            name: 'Telegram Mini App',
            description:
              'Frontend мінізастосунку Telegram для працівників інтернет-провайдера та взаємодії з внутрішніми сервісами компанії.',
            stack: ['Vue', 'JavaScript', 'Tailwind CSS', 'REST API'],
            shots: [
              {
                file: 'belnet-telegram-mini-app-01.png',
                alt: 'Форма створення абонента в Telegram Mini App: дані клієнта, адреса підключення та вибір послуг.',
              },
              {
                file: 'belnet-telegram-mini-app-02.png',
                alt: 'Мобільна версія форми створення абонента з перевіркою пароля та номера телефону.',
              },
              {
                file: 'belnet-telegram-mini-app-03.png',
                alt: 'Мобільна версія форми: нотатка, необов’язкові дані роутера та кнопка створення користувача.',
              },
            ],
          },
        ],
      },
      {
        id: 'oiac',
        company: 'ОІАЦ',
        role: 'Керівник відділу розробки програмного забезпечення',
        previousRole: 'Інженер програмного забезпечення',
        start: '2024-09',
        end: '2025-05',
        location: 'Одеса, Україна · офіс',
        description:
          'Розробляв вебсервіси та внутрішні інформаційні системи для Одеської обласної державної адміністрації та пов’язаних із нею структур. Паралельно займався технічною підтримкою наявної інфраструктури вебсайтів.',
        responsibilities: [
          'Розробляв нові вебсайти, внутрішні сервіси та full-stack вебзастосунки.',
          'Підтримував, оновлював і виправляв понад 40 наявних WordPress-сайтів територіальних громад, підрозділів та інших обласних структур.',
          'Після підвищення розподіляв завдання та контролював роботу двох інших працівників відділу розробки.',
          'Працював із внутрішнім документообігом і звітністю, зокрема із системою АСКОД.',
        ],
        achievements: [
          'Приблизно через пів року після початку роботи отримав підвищення з інженера програмного забезпечення до керівника відділу розробки ПЗ.',
          'Поєднував розробку нових інформаційних систем із технічним супроводом близько 40 наявних вебсайтів.',
        ],
        stack: [
          'Vue 3',
          'JavaScript',
          'Node.js',
          'Express.js',
          'Python',
          'Pinia',
          'Vuex',
          'PostgreSQL',
          'Sequelize',
          'REST API',
          'Tailwind CSS',
          'Leaflet',
          'WordPress',
        ],
        projects: [
          {
            id: 'rd-hub-platform',
            name: 'R&D Hub Platform',
            description:
              'Платформа для організації хакатонів та їх інформаційного супроводу. Містить користувацьку частину, адміністративну панель, систему ролей, сповіщення та засоби автентифікації.',
            stack: [
              'Vue 3',
              'Pinia',
              'Vue Router',
              'PrimeVue',
              'Tailwind CSS',
              'Node.js',
              'Express.js',
              'PostgreSQL',
              'Sequelize',
              'JWT',
            ],
            shots: [
              {
                file: 'rd-hub-platform-01.png',
                alt: 'Головна сторінка R&D Hub з описом платформи та добіркою актуальних фестів.',
              },
              {
                file: 'rd-hub-platform-02.png',
                alt: 'Каталог новин із пошуком, фільтром за фестом і картками публікацій.',
              },
              {
                file: 'rd-hub-platform-03.png',
                alt: 'Сторінка окремої новини про відкриття лабораторії інновацій.',
              },
              {
                file: 'rd-hub-platform-04.png',
                alt: 'Каталог фестів із фільтрами за статусом, ключовими словами та датами проведення.',
              },
              {
                file: 'rd-hub-platform-05.png',
                alt: 'Сторінка активного фесту з датами, місцем, кількістю учасників і кнопками реєстрації та створення команди.',
              },
              {
                file: 'rd-hub-platform-06.png',
                alt: 'Діалог реєстрації на фест із вибором індивідуальної участі або вступу до команди за кодом.',
              },
              {
                file: 'rd-hub-platform-07.png',
                alt: 'Блок переможців завершеного фесту з командами та коментарями журі.',
              },
              {
                file: 'rd-hub-platform-08.png',
                alt: 'Статистика адміністративної панелі: користувачі, фести, реєстрації, команди та переможці.',
              },
              {
                file: 'rd-hub-platform-09.png',
                alt: 'Керування фестами: таблиця з датами проведення, дедлайном реєстрації, статусом і діями.',
              },
              {
                file: 'rd-hub-platform-10.png',
                alt: 'Керування учасниками фесту: командні учасники, позначки переможців, статуси заявок і дії.',
              },
              {
                file: 'rd-hub-platform-11.png',
                alt: 'Керування користувачами: таблиця з контактами, університетом, спеціалізацією та роллю на демонстраційних даних.',
              },
              {
                file: 'rd-hub-platform-12.png',
                alt: 'Керування новинами: таблиця публікацій з автором, прив’язкою до фесту та статусом публікації.',
              },
              {
                file: 'rd-hub-platform-13.png',
                alt: 'Керування командами: таблиця команд із фестом, лідером, кількістю учасників і статусом.',
              },
            ],
          },
          {
            id: 'odesa-interactive-map',
            name: 'Інтерактивна карта Одеси',
            description:
              'Проєкт, реалізований у найкоротші терміни — за 4 дні. Інтерактивна та анімована мапа міста зі статтями й фотографіями, прив’язаними до географічних точок.',
            stack: [
              'Vue 3',
              'Pinia',
              'Leaflet',
              'Tailwind CSS',
              'Node.js',
              'Express.js',
              'PostgreSQL',
              'Sequelize',
              'JWT',
            ],
            shots: [
              {
                file: 'odesa-interactive-map-01.png',
                alt: 'Інтерактивна мапа Одеси проєкту «Рух без бар’єрів» із тематичними мітками об’єктів.',
              },
              {
                file: 'odesa-interactive-map-02.png',
                alt: 'Вибрана мітка на мапі та бічна панель зі статтею про Будинок учених, фотографією та описом.',
              },
              {
                file: 'odesa-interactive-map-03.png',
                alt: 'Каталог статей із сортуванням, категоріями та відкритою панеллю перегляду матеріалу.',
              },
              {
                file: 'odesa-interactive-map-04.png',
                alt: 'Адміністративна панель: таблиця статей із датою створення та діями редагування й видалення.',
              },
              {
                file: 'odesa-interactive-map-05.png',
                alt: 'Редактор статті з назвою, категорією, кольором типу, візуальним редактором тексту та завантаженням зображення.',
              },
              {
                file: 'odesa-interactive-map-06.png',
                alt: 'Налаштування мітки статті: вибір точки на мапі, координати, іконка, кольори та підпис маркера.',
              },
            ],
          },
          {
            id: 'attendance-bot',
            name: 'Система обліку працівників',
            description:
              'Telegram-бот для внутрішнього обліку присутності та статусів працівників, ведення довідкової інформації та формування даних для кадрової роботи.',
            stack: ['Python', 'aiogram', 'PostgreSQL', 'asyncpg', 'SQLAlchemy', 'APScheduler'],
            shots: [
              {
                file: 'attendance-bot-01.png',
                alt: 'Особистий кабінет тестового працівника в Telegram-боті: контакти, статус, нагадування та відмітка про прихід, з меню дій.',
              },
              {
                file: 'attendance-bot-02.png',
                alt: 'Реєстрація працівника в боті з перевіркою формату ПІБ, телефону й дати народження та налаштуванням початку робочого дня.',
              },
            ],
          },
          {
            id: 'password-generator',
            name: 'Генератор паролів',
            description:
              'Внутрішній вебінструмент для генерації варіантів паролів з авторизацією, збереженням стану та додатковими інструментами транслітерації.',
            stack: ['Vue 3', 'Vuex', 'JavaScript', 'Node.js', 'Express.js'],
            shots: [
              {
                file: 'password-generator-01.png',
                alt: 'Генератор паролів у режимі «слово + роздільник + префікс» зі списком варіантів в українській та англійській розкладці й таблицею транслітерації.',
              },
              {
                file: 'password-generator-02.png',
                alt: 'Генерація складних паролів із розширеним префіксом із цифр, символів і літер двох алфавітів.',
              },
            ],
          },
        ],
      },
      {
        id: 'suitt',
        company: 'Державний університет інтелектуальних технологій і зв’язку (ДУІТЗ)',
        role: 'Фахівець I категорії ННЦ технологій онлайн-освіти',
        roleNote: 'З вересня 2024 року — за сумісництвом',
        start: '2022-09',
        end: '2026-06',
        location: 'Одеса, Україна · гібрид',
        description:
          'Відповідав за розгортання та технічний супровід університетської системи дистанційного навчання Moodle. Після первинного запуску основним завданням стало адміністрування платформи та технічна підтримка викладачів і студентів.',
        responsibilities: [
          'Розгорнув Moodle на сервері та виконав первинне налаштування платформи.',
          'Адміністрував систему, облікові записи, ролі та права доступу.',
          'Оновлював і технічно підтримував Moodle під час експлуатації.',
          'Надавав технічну підтримку викладачам і студентам.',
          'Допомагав із підготовкою звітності, бланків та інших службових матеріалів.',
          'За потреби займався пошуком і збором інформації для внутрішніх завдань.',
        ],
        achievements: [
          'Самостійно розгорнув і налаштував університетську Moodle-платформу, після чого супроводжував її впродовж кількох років.',
          'Після переходу на іншу основну роботу продовжив підтримувати систему за сумісництвом до червня 2026 року.',
        ],
        stack: ['Moodle', 'Linux'],
        projects: [
          {
            id: 'suitt-moodle',
            name: 'Система дистанційного навчання Moodle',
            description: 'Університетська платформа дистанційного навчання студентів.',
            stack: ['Moodle', 'Linux'],
            shots: [
              {
                file: 'moodle-01.png',
                alt: 'Головна сторінка університетської Moodle з пошуком курсів і каталогом освітньо-професійних програм за рівнями вищої освіти.',
              },
              {
                file: 'moodle-02.png',
                alt: 'Панель адміністрування Moodle з розділами аналітики, компетентностей, відзнак, H5P та ліцензій.',
              },
              {
                file: 'moodle-03.png',
                alt: 'Сторінка навчального курсу із силабусом, літературою та списком лекцій із позначками про виконання.',
              },
              {
                file: 'moodle-04.png',
                alt: 'Вікно додавання діяльності або ресурсу до курсу: тести, завдання, форуми, H5P, SCORM та інші елементи.',
              },
            ],
          },
        ],
      },
    ],
    projects: [
      {
        id: 'artillery-spotter-calculator',
        name: 'Artillery Spotter Calculator',
        description:
          'Вебкалькулятор для гравців Foxhole, що спрощує розрахунок дистанції, азимута та поправок для артилерійської стрільби. Підтримує кілька сценаріїв наведення та враховує параметри вітру й різні типи артилерії.',
        highlights: [
          'Три режими розрахунку: пряме наведення, тріангуляція та групова стрільба',
          'Візуалізація позицій, напрямків і розрахунків за допомогою SVG',
          'Багатомовний інтерфейс, історія розрахунків і підтримка кількох типів артилерії',
        ],
        stack: ['React', 'JavaScript', 'Tailwind CSS', 'SVG', 'LocalStorage'],
        githubUrl: 'https://github.com/Konradiuss/artillery-calculator-stable',
        demoUrl: 'https://konradiuss.github.io/artillery-calculator-stable',
        shots: [
          {
            file: 'happy-shells-01.png',
            alt: 'Інтерфейс режиму прямого наведення з введенням дистанції, азимута, типу артилерії та параметрів вітру.',
          },
          {
            file: 'happy-shells-02.png',
            alt: 'Результат розрахунку прямого наведення з візуалізацією напрямку стрільби та положення цілі.',
          },
          {
            file: 'happy-shells-03.png',
            alt: 'Історія виконаних розрахунків і довідник щодо впливу сили вітру на різні типи артилерії.',
          },
          {
            file: 'happy-shells-04.png',
            alt: 'Режим тріангуляції для обчислення потрібних поправок за координатами цілі та точки влучання.',
          },
          {
            file: 'happy-shells-05.png',
            alt: 'Режим групової стрільби з інтерактивним розміщенням кількох артилерійських гармат на координатній сітці.',
          },
          {
            file: 'happy-shells-06.png',
            alt: 'Розраховані поправки для групи гармат разом з історією попередніх групових розрахунків.',
          },
        ],
      },
      {
        id: 'disco-cv',
        name: 'DiscoCV',
        description:
          'Інтерактивний сайт-портфоліо в естетиці диско, що поєднує резюме з повноцінною 3D-сценою та інтерактивними елементами. Проєкт створено як експеримент із нестандартною подачею професійного профілю та складними браузерними інтерфейсами.',
        highlights: [
          'Інтерактивна 3D-сцена на Three.js з диско-кулею, відображеннями, освітленням і анімаціями',
          'Вбудований музичний плеєр із керуванням відтворенням, гучністю та візуальною реакцією сцени на звук',
          'Багатомовний інтерфейс, адаптивна верстка та автоматизоване тестування з Vitest і Playwright',
        ],
        stack: ['Vue 3', 'TypeScript', 'Three.js', 'Vite', 'Vue Router', 'Vitest', 'Playwright'],
        shots: [
          {
            file: 'disco-cv-01.png',
            alt: 'Головний екран DiscoCV з інтерактивною 3D-диско-сценою, профілем розробника, музичним плеєром і перемикачем мов.',
          },
          {
            file: 'disco-cv-02.png',
            alt: 'Хронологія досвіду роботи DiscoCV з посадами, компаніями, періодами та описами обов’язків.',
          },
          {
            file: 'disco-cv-03.png',
            alt: 'Картки робочих проєктів у DiscoCV зі стеком технологій та галереями скріншотів.',
          },
          {
            file: 'disco-cv-04.png',
            alt: 'Розділ пет-проєктів DiscoCV з описами, ключовими можливостями та технологічним стеком.',
          },
          {
            file: 'disco-cv-05.png',
            alt: 'Матриця технічних навичок DiscoCV, згрупована за напрямами та рівнями володіння.',
          },
          {
            file: 'disco-cv-06.png',
            alt: 'Розділ освіти й мов DiscoCV у нижній частині інтерактивного резюме.',
          },
        ],
      },
    ],
    skills: [
      { name: 'Frontend', skills: skillGroups.frontend },
      { name: 'Стан і дані', skills: skillGroups.state },
      { name: 'Backend', skills: skillGroups.backend },
      { name: 'Бази даних та ORM', skills: skillGroups.databases },
      { name: 'Тестування', skills: skillGroups.testing },
      { name: 'Інструменти', skills: skillGroups.tooling },
      { name: 'DevOps та інфраструктура', skills: skillGroups.devops },
      { name: 'CMS', skills: skillGroups.cms },
      { name: 'Вебграфіка', skills: skillGroups.graphics },
      { name: 'Архітектура', skills: skillGroups.architecture },
    ],
    education: [
      {
        id: 'server-college',
        institution: 'Коледж «Сервер»',
        qualification: '121 — Інженерія програмного забезпечення, молодший спеціаліст',
        start: '2018-09',
        end: '2022-06',
      },
      {
        id: 'suitt-bachelor',
        institution: 'Державний університет інтелектуальних технологій і зв’язку (ДУІТЗ)',
        qualification: '121 — Інженерія програмного забезпечення, бакалавр',
        start: '2022-09',
        end: '2024-06',
      },
      {
        id: 'suitt-master',
        institution: 'Державний університет інтелектуальних технологій і зв’язку (ДУІТЗ)',
        qualification: '121 — Інженерія програмного забезпечення, магістр',
        honors: 'з відзнакою',
        start: '2024-09',
        end: '2025-12',
      },
    ],
    languages: [
      { code: 'UA', name: 'Українська', level: 'Рідна' },
      { code: 'RU', name: 'Російська', level: 'Рідна' },
      { code: 'EN', name: 'Англійська', level: 'C1' },
      { code: 'DE', name: 'Німецька', level: 'A1' },
    ],
  },
  ru: {
    locale: 'ru',
    sections: {
      experience: 'Опыт работы',
      projects: 'Пет-проекты',
      skills: 'Навыки',
      background: 'Образование и языки',
    },
    ui: {
      nowPlaying: 'Сейчас играет',
      playMusic: 'Включить музыку',
      pauseMusic: 'Выключить музыку',
      chooseTrack: 'Выбрать трек',
      restartTrack: 'В начало',
      turntable: 'Проигрыватель',
      volume: 'Громкость',
      volumeUp: 'Громче',
      volumeDown: 'Тише',
      localTime: 'Ваше время',
      trackTime: 'Время трека',
      scrollToBottom: 'Вниз страницы',
      scrollToTop: 'Наверх страницы',
      downloadPdf: 'Скачать резюме (PDF)',
      present: 'настоящее время',
      technologyStack: 'Технологии',
      contactLinks: 'Ссылки',
      contactActions: {
        github: 'Открыть GitHub',
        telegram: 'Написать в Telegram',
        whatsapp: 'Написать в WhatsApp',
        email: 'Написать на почту',
      },
      promotedFrom: 'Повышение с должности',
      workProjects: 'Проекты',
      openScreenshot: 'Открыть скриншот',
      screenshots: 'Снимков',
      closeScreenshot: 'Закрыть скриншот',
      previousScreenshot: 'Предыдущий скриншот',
      nextScreenshot: 'Следующий скриншот',
      education: 'Образование',
      languages: 'Языки',
      skillLevels: 'Уровни владения',
      skillLevelNames: {
        core: 'Основной',
        proficient: 'Уверенный',
        familiar: 'Базовый',
      },
    },
    profile: {
      name: 'Бабий Александр',
      title: 'Full-stack веб-разработчик',
      location: 'Одесса, Украина',
      timezone: 'Europe/Kyiv',
      summary:
        'Full-stack веб-разработчик с основным стеком Vue, Nuxt, TypeScript и Node.js. Проектирую и реализую веб-приложения целиком, включая интерфейс, серверную часть, интеграции и инфраструктуру развертывания. В свободное время экспериментирую с игровыми модификациями и веб-проектами, связанными с видеоиграми.',
      availability: 'Открыт к удалённой работе',
      contacts,
      resumePdf: 'resume-ru.pdf',
    },
    experience: [
      {
        id: 'cuit',
        company: 'ЦУИТ / ЦУІТ',
        role: 'Full-stack Developer',
        start: '2026-04',
        end: null,
        location: 'Запорожье, Украина · удалённо',
        description:
          'Разрабатываю веб-сервисы, веб-сайты и информационные системы для проектов Запорожской областной государственной администрации. Работаю над проектами где часто выступаю в роли как разработчика так и администратора. Разрабатываю интерфейсы, серверную часть, базы данных и интеграции с внешними сервисами. Параллельно занимаюсь поддержкой существующих систем и инфраструктуры.',
        responsibilities: [
          'Разрабатываю веб-сайты, внутренние сервисы и специализированные веб-приложения.',
          'Проектирую frontend и backend-части приложений, модели данных и интеграции.',
          'Настраиваю базы данных, контейнеризацию и окружение для развертывания проектов.',
          'Поддерживаю и дорабатываю системы при изменении требований заказчика.',
          'Подготавливаю проекты к передаче и размещению в инфраструктуре заказчика.',
        ],
        achievements: [
          'Часть разработанных проектов пока не представлена в портфолио: они ожидают согласования публикации со стороны заказчика.',
          'Разработал ZODA Memorial — полноценный онлайн-мемориал с публичной частью, CMS, поиском и административными инструментами.',
        ],
        stack: [
          'Vue',
          'Nuxt',
          'TypeScript',
          'Node.js',
          'Python',
          'PostgreSQL',
          'Prisma',
          'Directus',
          'Payload CMS',
          'Redis / Valkey',
          'Docker',
          'Caddy',
          'Vitest',
          'Playwright',
        ],
        projects: [
          {
            id: 'zoda-memorial',
            name: 'ZODA Memorial',
            description:
              'Онлайн-мемориал с публичным каталогом, поиском, картой, системой подачи материалов и административной CMS для управления контентом. Проект разработан и передан заказчику.',
            stack: [
              'Nuxt',
              'Vue',
              'TypeScript',
              'Payload CMS',
              'PostgreSQL',
              'Redis / Valkey',
              'Docker',
              'Caddy',
              'Vitest',
              'Playwright',
            ],
            shots: [
              {
                file: 'zoda-memorial-01.jpg',
                alt: 'Главная страница онлайн-мемориала «Меморіал Честі» с описанием Книги памяти и быстрым переходом к поиску.',
              },
              {
                file: 'zoda-memorial-02.jpg',
                alt: 'Страница профиля Защитника на демонстрационных данных: биография, награды, фотогалерея и QR-код профиля.',
              },
              {
                file: 'zoda-memorial-03.jpg',
                alt: 'Интерактивная карта мест захоронения Запорожской области с кластерами меток и фильтром по району.',
              },
              {
                file: 'zoda-memorial-04.jpg',
                alt: 'Каталог мест захоронения по районам и громадам с карточками Героев выбранного места на демонстрационных данных.',
              },
              {
                file: 'zoda-memorial-05.jpg',
                alt: 'Административная панель Payload CMS с разделами мемориала, справочников, содержимого сайта и администрирования.',
              },
            ],
          },
          {
            id: 'air-monitor-kyiv',
            name: 'Air Monitor Kyiv',
            description:
              'Система сбора, анализа и локализованной доставки уведомлений о воздушных угрозах для Киевской области и города Киева. Определяет затронутые районы и громады, формирует на основе этой информации отчеты.',
            stack: [
              'Python',
              'aiogram',
              'Telethon',
              'aiohttp',
              'SQLite',
              'aiosqlite',
              'Shapely',
              'Pillow',
              'Docker',
              'Pytest',
            ],
            shots: [
              {
                file: 'air-monitor-kyiv-01.png',
                alt: 'Уведомление о непосредственной угрозе с локальной картой Киевской области, затронутыми районами и громадами и диагностикой источника.',
              },
              {
                file: 'air-monitor-kyiv-02.png',
                alt: 'Уведомление об угрозе для города Киева с обзорной картой области и детальной картой громад Бучанского района.',
              },
              {
                file: 'air-monitor-kyiv-03.png',
                alt: 'Приветственное сообщение Telegram-бота с описанием источников, политики хранения данных и меню команд.',
              },
              {
                file: 'air-monitor-kyiv-04.png',
                alt: 'Выбор районов Киевской области и города Киева для подписки на оповещения.',
              },
            ],
          },
        ],
      },
      {
        id: 'belnet',
        company: 'БЕЛНЕТ',
        role: 'Frontend Developer',
        start: '2025-05',
        end: '2026-03',
        location: 'Одесса, Украина · гибрид',
        description:
          'Работал над внутренними цифровыми продуктами интернет-провайдера. Основным проектом стала новая ERP-система предприятия; параллельно разработал frontend Telegram Mini App для монтажников на местах.',
        responsibilities: [
          'Разрабатывал frontend новой внутренней ERP-системы совместно с backend-разработчиком.',
          'Проектировал интерфейсы, структуру приложения и управление состоянием.',
          'Интегрировал frontend с API и серверной частью системы.',
          'Разрабатывал общие компоненты и архитектуру нескольких функциональных модулей.',
          'Создал frontend Telegram Mini App для внутренних задач компании.',
        ],
        achievements: [
          'Разработал frontend новой ERP-системы предприятия до состояния alpha-версии.',
          'Довёл отдельный Telegram Mini App от прототипа до законченного рабочего интерфейса.',
        ],
        stack: [
          'React',
          'Next.js',
          'TypeScript',
          'Tailwind CSS',
          'Zustand',
          'REST API',
          'GraphQL',
          'Turborepo',
          'pnpm',
          'Docker',
          'GitLab CI',
        ],
        projects: [
          {
            id: 'belnet-erp',
            name: 'Внутренняя ERP-система',
            description:
              'Модульная система для автоматизации внутренних процессов интернет-провайдера. Отвечал за frontend и разработал его до полноценной alpha-версии.',
            stack: [
              'React',
              'Next.js',
              'TypeScript',
              'Tailwind CSS',
              'Zustand',
              'REST API',
              'GraphQL',
              'Turborepo',
            ],
            shots: [
              {
                file: 'belnet-erp-01.jpg',
                alt: 'Модуль лидов ERP-системы: сводные показатели по статусам и таблица заявок с источником, кампанией, статусом и ответственным менеджером.',
              },
              {
                file: 'belnet-erp-02.jpg',
                alt: 'Модуль персонала: таблица сотрудников с должностью, группой доступа, статусом, двухфакторной аутентификацией и последней активностью.',
              },
              {
                file: 'belnet-erp-03.jpg',
                alt: 'Экран входа в рабочее пространство ERP-системы по почте и паролю или через Google.',
              },
              {
                file: 'belnet-erp-04.jpg',
                alt: 'Таблица лидов с системными полями и вкладками открытых модулей в верхней панели интерфейса.',
              },
            ],
          },
          {
            id: 'belnet-telegram-mini-app',
            name: 'Telegram Mini App',
            description:
              'Frontend мини-приложения Telegram для сотрудников интернет-провайдера и взаимодействия с внутренними сервисами компании.',
            stack: ['Vue', 'JavaScript', 'Tailwind CSS', 'REST API'],
            shots: [
              {
                file: 'belnet-telegram-mini-app-01.png',
                alt: 'Форма создания абонента в Telegram Mini App: данные клиента, адрес подключения и выбор услуг.',
              },
              {
                file: 'belnet-telegram-mini-app-02.png',
                alt: 'Мобильная версия формы создания абонента с проверкой пароля и номера телефона.',
              },
              {
                file: 'belnet-telegram-mini-app-03.png',
                alt: 'Мобильная версия формы: заметка, необязательные данные роутера и кнопка создания пользователя.',
              },
            ],
          },
        ],
      },
      {
        id: 'oiac',
        company: 'ОІАЦ',
        role: 'Руководитель отдела разработки программного обеспечения',
        previousRole: 'Инженер программного обеспечения',
        start: '2024-09',
        end: '2025-05',
        location: 'Одесса, Украина · офис',
        description:
          'Разрабатывал веб-сервисы и внутренние информационные системы для Одесской областной государственной администрации и связанных с ней структур. Параллельно занимался технической поддержкой существующей инфраструктуры веб-сайтов.',
        responsibilities: [
          'Разрабатывал новые веб-сайты, внутренние сервисы и full-stack веб-приложения.',
          'Поддерживал, обновлял и исправлял около 40+ существующих WordPress-сайтов территориальных громад, подразделений и других областных структур.',
          'После повышения распределял задачи и контролировал работу двух других сотрудников отдела разработки.',
          'Работал с внутренним документооборотом и отчётностью, включая систему АСКОД.',
        ],
        achievements: [
          'Примерно через полгода после начала работы был повышен с инженера программного обеспечения до руководителя отдела разработки ПО.',
          'Совмещал разработку новых информационных систем с техническим сопровождением порядка 40 существующих веб-сайтов.',
        ],
        stack: [
          'Vue 3',
          'JavaScript',
          'Node.js',
          'Express.js',
          'Python',
          'Pinia',
          'Vuex',
          'PostgreSQL',
          'Sequelize',
          'REST API',
          'Tailwind CSS',
          'Leaflet',
          'WordPress',
        ],
        projects: [
          {
            id: 'rd-hub-platform',
            name: 'R&D Hub Platform',
            description:
              'Платформа для организации хакатонов и их информационного сопровождения. Включает пользовательскую часть, административную панель, систему ролей, уведомления и средства аутентификации.',
            stack: [
              'Vue 3',
              'Pinia',
              'Vue Router',
              'PrimeVue',
              'Tailwind CSS',
              'Node.js',
              'Express.js',
              'PostgreSQL',
              'Sequelize',
              'JWT',
            ],
            shots: [
              {
                file: 'rd-hub-platform-01.png',
                alt: 'Главная страница R&D Hub с описанием платформы и подборкой актуальных фестов.',
              },
              {
                file: 'rd-hub-platform-02.png',
                alt: 'Каталог новостей с поиском, фильтром по фесту и карточками публикаций.',
              },
              {
                file: 'rd-hub-platform-03.png',
                alt: 'Страница отдельной новости об открытии лаборатории инноваций.',
              },
              {
                file: 'rd-hub-platform-04.png',
                alt: 'Каталог фестов с фильтрами по статусу, ключевым словам и датам проведения.',
              },
              {
                file: 'rd-hub-platform-05.png',
                alt: 'Страница активного феста с датами, местом, числом участников и кнопками регистрации и создания команды.',
              },
              {
                file: 'rd-hub-platform-06.png',
                alt: 'Диалог регистрации на фест с выбором индивидуального участия или вступления в команду по коду.',
              },
              {
                file: 'rd-hub-platform-07.png',
                alt: 'Блок победителей завершённого феста с командами и комментариями жюри.',
              },
              {
                file: 'rd-hub-platform-08.png',
                alt: 'Статистика административной панели: пользователи, фесты, регистрации, команды и победители.',
              },
              {
                file: 'rd-hub-platform-09.png',
                alt: 'Управление фестами: таблица с датами проведения, дедлайном регистрации, статусом и действиями.',
              },
              {
                file: 'rd-hub-platform-10.png',
                alt: 'Управление участниками феста: командные участники, отметки победителей, статусы заявок и действия.',
              },
              {
                file: 'rd-hub-platform-11.png',
                alt: 'Управление пользователями: таблица с контактами, университетом, специализацией и ролью на демонстрационных данных.',
              },
              {
                file: 'rd-hub-platform-12.png',
                alt: 'Управление новостями: таблица публикаций с автором, привязкой к фесту и статусом публикации.',
              },
              {
                file: 'rd-hub-platform-13.png',
                alt: 'Управление командами: таблица команд с фестом, лидером, числом участников и статусом.',
              },
            ],
          },
          {
            id: 'odesa-interactive-map',
            name: 'Интерактивная карта Одессы',
            description:
              'Реализованный в кратчайшие сроки проект, за 4 дня. Интерактивная и анимированная карта города с привязанными к географическим точкам статьями и фотографиями.',
            stack: [
              'Vue 3',
              'Pinia',
              'Leaflet',
              'Tailwind CSS',
              'Node.js',
              'Express.js',
              'PostgreSQL',
              'Sequelize',
              'JWT',
            ],
            shots: [
              {
                file: 'odesa-interactive-map-01.png',
                alt: 'Интерактивная карта Одессы проекта «Рух без бар’єрів» с тематическими метками объектов.',
              },
              {
                file: 'odesa-interactive-map-02.png',
                alt: 'Выбранная метка на карте и боковая панель со статьёй о Доме учёных, фотографией и описанием.',
              },
              {
                file: 'odesa-interactive-map-03.png',
                alt: 'Каталог статей с сортировкой, категориями и открытой панелью просмотра материала.',
              },
              {
                file: 'odesa-interactive-map-04.png',
                alt: 'Административная панель: таблица статей с датой создания и действиями редактирования и удаления.',
              },
              {
                file: 'odesa-interactive-map-05.png',
                alt: 'Редактор статьи с названием, категорией, цветом типа, визуальным редактором текста и загрузкой изображения.',
              },
              {
                file: 'odesa-interactive-map-06.png',
                alt: 'Настройка метки статьи: выбор точки на карте, координаты, иконка, цвета и подпись маркера.',
              },
            ],
          },
          {
            id: 'attendance-bot',
            name: 'Система учёта сотрудников',
            description:
              'Telegram-бот для внутреннего учёта присутствия и статусов сотрудников, ведения справочной информации и формирования данных для кадровой работы.',
            stack: ['Python', 'aiogram', 'PostgreSQL', 'asyncpg', 'SQLAlchemy', 'APScheduler'],
            shots: [
              {
                file: 'attendance-bot-01.png',
                alt: 'Личный кабинет тестового сотрудника в Telegram-боте: контакты, статус, напоминания и отметка о приходе, с меню действий.',
              },
              {
                file: 'attendance-bot-02.png',
                alt: 'Регистрация сотрудника в боте с проверкой формата ФИО, телефона и даты рождения и настройкой начала рабочего дня.',
              },
            ],
          },
          {
            id: 'password-generator',
            name: 'Генератор паролей',
            description:
              'Внутренний веб-инструмент для генерации вариантов паролей с авторизацией, сохранением состояния и дополнительными инструментами транслитерации.',
            stack: ['Vue 3', 'Vuex', 'JavaScript', 'Node.js', 'Express.js'],
            shots: [
              {
                file: 'password-generator-01.png',
                alt: 'Генератор паролей в режиме «слово + разделитель + префикс» со списком вариантов в украинской и английской раскладке и таблицей транслитерации.',
              },
              {
                file: 'password-generator-02.png',
                alt: 'Генерация сложных паролей с расширенным префиксом из цифр, символов и букв двух алфавитов.',
              },
            ],
          },
        ],
      },
      {
        id: 'suitt',
        company: 'Государственный университет интеллектуальных технологий и связи (ГУИТС / ДУІТЗ)',
        role: 'Специалист I категории ННЦ технологий онлайн-образования',
        roleNote: 'С сентября 2024 года — по совместительству',
        start: '2022-09',
        end: '2026-06',
        location: 'Одесса, Украина · гибрид',
        description:
          'Отвечал за развертывание и техническое сопровождение университетской системы дистанционного обучения Moodle. После первоначального запуска основной задачей стало администрирование платформы и техническая поддержка преподавателей и студентов.',
        responsibilities: [
          'Развернул Moodle на сервере и выполнил первоначальную настройку платформы.',
          'Администрировал систему, учётные записи, роли и права доступа.',
          'Обновлял и технически поддерживал Moodle в процессе эксплуатации.',
          'Оказывал техническую поддержку преподавателям и студентам.',
          'Помогал с подготовкой отчётности, бланков и других служебных материалов.',
          'При необходимости занимался поиском и сбором информации для внутренних задач.',
        ],
        achievements: [
          'Самостоятельно развернул и настроил университетскую Moodle-платформу, после чего сопровождал её в течение нескольких лет.',
          'После перехода на другую основную работу продолжил поддерживать систему по совместительству до июня 2026 года.',
        ],
        stack: ['Moodle', 'Linux'],
        projects: [
          {
            id: 'suitt-moodle',
            name: 'Система дистанционного обучения Moodle',
            description: 'Университетская платформа дистанционного обучения студентов.',
            stack: ['Moodle', 'Linux'],
            shots: [
              {
                file: 'moodle-01.png',
                alt: 'Главная страница университетской Moodle с поиском курсов и каталогом образовательно-профессиональных программ по уровням высшего образования.',
              },
              {
                file: 'moodle-02.png',
                alt: 'Панель администрирования Moodle с разделами аналитики, компетенций, значков, H5P и лицензий.',
              },
              {
                file: 'moodle-03.png',
                alt: 'Страница учебного курса с силлабусом, литературой и списком лекций с отметками о выполнении.',
              },
              {
                file: 'moodle-04.png',
                alt: 'Окно добавления активности или ресурса в курс: тесты, задания, форумы, H5P, SCORM и другие элементы.',
              },
            ],
          },
        ],
      },
    ],
    projects: [
      {
        id: 'artillery-spotter-calculator',
        name: 'Artillery Spotter Calculator',
        description:
          'Веб-калькулятор для игроков Foxhole, упрощающий расчёт дистанции, азимута и поправок для артиллерийской стрельбы. Поддерживает несколько сценариев наведения и учитывает параметры ветра и разные типы артиллерии.',
        highlights: [
          'Три режима расчёта: прямое наведение, триангуляция и групповая стрельба',
          'Визуализация позиций, направлений и расчётов с помощью SVG',
          'Мультиязычный интерфейс, история расчётов и поддержка нескольких типов артиллерии',
        ],
        stack: ['React', 'JavaScript', 'Tailwind CSS', 'SVG', 'LocalStorage'],
        githubUrl: 'https://github.com/Konradiuss/artillery-calculator-stable',
        demoUrl: 'https://konradiuss.github.io/artillery-calculator-stable',
        shots: [
          {
            file: 'happy-shells-01.png',
            alt: 'Интерфейс режима прямого наведения с вводом дистанции, азимута, типа артиллерии и параметров ветра.',
          },
          {
            file: 'happy-shells-02.png',
            alt: 'Результат расчёта прямого наведения с визуализацией направления стрельбы и положения цели.',
          },
          {
            file: 'happy-shells-03.png',
            alt: 'История произведённых расчётов и справочник по влиянию силы ветра на разные типы артиллерии.',
          },
          {
            file: 'happy-shells-04.png',
            alt: 'Режим триангуляции для вычисления необходимых поправок по координатам цели и точки попадания.',
          },
          {
            file: 'happy-shells-05.png',
            alt: 'Режим групповой стрельбы с интерактивным размещением нескольких артиллерийских орудий на координатной сетке.',
          },
          {
            file: 'happy-shells-06.png',
            alt: 'Рассчитанные поправки для группы орудий вместе с историей предыдущих групповых расчётов.',
          },
        ],
      },
      {
        id: 'disco-cv',
        name: 'DiscoCV',
        description:
          'Интерактивный сайт-портфолио в эстетике диско, объединяющий резюме с полноценной 3D-сценой и интерактивными элементами. Проект создан как эксперимент с нестандартной подачей профессионального профиля и сложными браузерными интерфейсами.',
        highlights: [
          'Интерактивная 3D-сцена на Three.js с диско-шаром, отражениями, освещением и анимациями',
          'Встроенный музыкальный плеер с управлением воспроизведением, громкостью и визуальной реакцией сцены на звук',
          'Мультиязычный интерфейс, адаптивная верстка и автоматизированное тестирование с Vitest и Playwright',
        ],
        stack: ['Vue 3', 'TypeScript', 'Three.js', 'Vite', 'Vue Router', 'Vitest', 'Playwright'],
        shots: [
          {
            file: 'disco-cv-01.png',
            alt: 'Главный экран DiscoCV с интерактивной 3D-диско-сценой, профилем разработчика, музыкальным плеером и переключателем языков.',
          },
          {
            file: 'disco-cv-02.png',
            alt: 'Хронология опыта работы DiscoCV с должностями, компаниями, периодами и описаниями обязанностей.',
          },
          {
            file: 'disco-cv-03.png',
            alt: 'Карточки рабочих проектов в DiscoCV со стеком технологий и галереями скриншотов.',
          },
          {
            file: 'disco-cv-04.png',
            alt: 'Раздел пет-проектов DiscoCV с описаниями, ключевыми возможностями и технологическим стеком.',
          },
          {
            file: 'disco-cv-05.png',
            alt: 'Матрица технических навыков DiscoCV, сгруппированная по направлениям и уровням владения.',
          },
          {
            file: 'disco-cv-06.png',
            alt: 'Раздел образования и языков DiscoCV в нижней части интерактивного резюме.',
          },
        ],
      },
    ],
    skills: [
      { name: 'Frontend', skills: skillGroups.frontend },
      { name: 'Состояние и данные', skills: skillGroups.state },
      { name: 'Backend', skills: skillGroups.backend },
      { name: 'Базы данных и ORM', skills: skillGroups.databases },
      { name: 'Тестирование', skills: skillGroups.testing },
      { name: 'Инструменты', skills: skillGroups.tooling },
      { name: 'DevOps и инфраструктура', skills: skillGroups.devops },
      { name: 'CMS', skills: skillGroups.cms },
      { name: 'Web Graphics', skills: skillGroups.graphics },
      { name: 'Архитектура', skills: skillGroups.architecture },
    ],
    education: [
      {
        id: 'server-college',
        institution: 'Колледж «Сервер»',
        qualification: '121 — Инженерия программного обеспечения, младший специалист',
        start: '2018-09',
        end: '2022-06',
      },
      {
        id: 'suitt-bachelor',
        institution:
          'Государственный университет интеллектуальных технологий и связи (ГУИТС / ДУІТЗ)',
        qualification: '121 — Инженерия программного обеспечения, бакалавр',
        start: '2022-09',
        end: '2024-06',
      },
      {
        id: 'suitt-master',
        institution:
          'Государственный университет интеллектуальных технологий и связи (ГУИТС / ДУІТЗ)',
        qualification: '121 — Инженерия программного обеспечения, магистр',
        honors: 'с отличием',
        start: '2024-09',
        end: '2025-12',
      },
    ],
    languages: [
      { code: 'UA', name: 'Украинский', level: 'Родной' },
      { code: 'RU', name: 'Русский', level: 'Родной' },
      { code: 'EN', name: 'Английский', level: 'C1' },
      { code: 'DE', name: 'Немецкий', level: 'A1' },
    ],
  },
  en: {
    locale: 'en',
    sections: {
      experience: 'Work Experience',
      projects: 'Pet Projects',
      skills: 'Skills',
      background: 'Education and Languages',
    },
    ui: {
      nowPlaying: 'Now playing',
      playMusic: 'Play music',
      pauseMusic: 'Pause music',
      chooseTrack: 'Choose a track',
      restartTrack: 'Restart track',
      turntable: 'Turntable',
      volume: 'Volume',
      volumeUp: 'Volume up',
      volumeDown: 'Volume down',
      localTime: 'Your local time',
      trackTime: 'Track time',
      scrollToBottom: 'Scroll to bottom',
      scrollToTop: 'Scroll to top',
      downloadPdf: 'Download resume (PDF)',
      present: 'present',
      technologyStack: 'Technology stack',
      contactLinks: 'Contact links',
      contactActions: {
        github: 'Open GitHub',
        telegram: 'Message on Telegram',
        whatsapp: 'Message on WhatsApp',
        email: 'Send an email',
      },
      promotedFrom: 'Promoted from',
      workProjects: 'Projects',
      openScreenshot: 'Open screenshot',
      screenshots: 'Screenshots',
      closeScreenshot: 'Close screenshot',
      previousScreenshot: 'Previous screenshot',
      nextScreenshot: 'Next screenshot',
      education: 'Education',
      languages: 'Languages',
      skillLevels: 'Skill levels',
      skillLevelNames: {
        core: 'Core',
        proficient: 'Proficient',
        familiar: 'Familiar',
      },
    },
    profile: {
      name: 'Babii Oleksandr',
      title: 'Full-stack Web Developer',
      location: 'Odesa, Ukraine',
      timezone: 'Europe/Kyiv',
      summary:
        'Full-stack web developer whose core stack is Vue, Nuxt, TypeScript, and Node.js. I design and build web applications end to end, including the interface, the server side, integrations, and deployment infrastructure. In my free time I experiment with game mods and video-game-related web projects.',
      availability: 'Open to remote work',
      contacts,
      resumePdf: 'resume-en.pdf',
    },
    experience: [
      {
        id: 'cuit',
        company: 'TsUIT / ЦУІТ',
        role: 'Full-stack Developer',
        start: '2026-04',
        end: null,
        location: 'Zaporizhzhia, Ukraine · Remote',
        description:
          'I develop web services, websites, and information systems for projects of the Zaporizhzhia Regional State Administration. On these projects I often act as both developer and administrator. I build interfaces, server-side logic, databases, and integrations with external services, and in parallel support existing systems and infrastructure.',
        responsibilities: [
          'Develop websites, internal services, and specialized web applications.',
          'Design the frontend and backend of applications, data models, and integrations.',
          'Set up databases, containerization, and deployment environments.',
          'Maintain and extend systems as client requirements change.',
          'Prepare projects for handover and hosting in the client’s infrastructure.',
        ],
        achievements: [
          'Some of the projects I built are not yet shown in this portfolio: they are awaiting the client’s approval for publication.',
          'Built ZODA Memorial — a full-featured online memorial with a public site, CMS, search, and administrative tools.',
        ],
        stack: [
          'Vue',
          'Nuxt',
          'TypeScript',
          'Node.js',
          'Python',
          'PostgreSQL',
          'Prisma',
          'Directus',
          'Payload CMS',
          'Redis / Valkey',
          'Docker',
          'Caddy',
          'Vitest',
          'Playwright',
        ],
        projects: [
          {
            id: 'zoda-memorial',
            name: 'ZODA Memorial',
            description:
              'An online memorial with a public catalog, search, a map, a submission system, and an administrative CMS for content management. Built and handed over to the client.',
            stack: [
              'Nuxt',
              'Vue',
              'TypeScript',
              'Payload CMS',
              'PostgreSQL',
              'Redis / Valkey',
              'Docker',
              'Caddy',
              'Vitest',
              'Playwright',
            ],
            shots: [
              {
                file: 'zoda-memorial-01.jpg',
                alt: 'Home page of the “Меморіал Честі” online memorial with a description of the Book of Memory and a quick link to search.',
              },
              {
                file: 'zoda-memorial-02.jpg',
                alt: 'A Defender’s profile page on demo data: biography, awards, photo gallery, and profile QR code.',
              },
              {
                file: 'zoda-memorial-03.jpg',
                alt: 'Interactive map of burial sites in the Zaporizhzhia region with marker clusters and a district filter.',
              },
              {
                file: 'zoda-memorial-04.jpg',
                alt: 'Catalog of burial sites by district and community with cards of the Heroes at the selected site, on demo data.',
              },
              {
                file: 'zoda-memorial-05.jpg',
                alt: 'Payload CMS admin panel with sections for the memorial, reference data, site content, and administration.',
              },
            ],
          },
          {
            id: 'air-monitor-kyiv',
            name: 'Air Monitor Kyiv',
            description:
              'A system that collects, analyzes, and delivers localized air-threat alerts for the Kyiv region and the city of Kyiv. It determines the affected districts and communities and builds reports from that information.',
            stack: [
              'Python',
              'aiogram',
              'Telethon',
              'aiohttp',
              'SQLite',
              'aiosqlite',
              'Shapely',
              'Pillow',
              'Docker',
              'Pytest',
            ],
            shots: [
              {
                file: 'air-monitor-kyiv-01.png',
                alt: 'Immediate-threat alert with a local map of the Kyiv region, the affected districts and communities, and source diagnostics.',
              },
              {
                file: 'air-monitor-kyiv-02.png',
                alt: 'Threat alert for the city of Kyiv with an overview map of the region and a detailed map of the Bucha district’s communities.',
              },
              {
                file: 'air-monitor-kyiv-03.png',
                alt: 'The Telegram bot’s welcome message describing its sources, data retention policy, and command menu.',
              },
              {
                file: 'air-monitor-kyiv-04.png',
                alt: 'Choosing districts of the Kyiv region and the city of Kyiv to subscribe to alerts.',
              },
            ],
          },
        ],
      },
      {
        id: 'belnet',
        company: 'BELNET',
        role: 'Frontend Developer',
        start: '2025-05',
        end: '2026-03',
        location: 'Odesa, Ukraine · Hybrid',
        description:
          'Worked on internal digital products of an internet service provider. The main project was the company’s new ERP system; in parallel I built the frontend of a Telegram Mini App for field installers.',
        responsibilities: [
          'Developed the frontend of the new internal ERP system together with a backend developer.',
          'Designed interfaces, application structure, and state management.',
          'Integrated the frontend with the API and the system’s server side.',
          'Built shared components and the architecture of several functional modules.',
          'Created the frontend of a Telegram Mini App for the company’s internal tasks.',
        ],
        achievements: [
          'Developed the frontend of the company’s new ERP system to an alpha-stage release.',
          'Took a separate Telegram Mini App from prototype to a finished, working interface.',
        ],
        stack: [
          'React',
          'Next.js',
          'TypeScript',
          'Tailwind CSS',
          'Zustand',
          'REST API',
          'GraphQL',
          'Turborepo',
          'pnpm',
          'Docker',
          'GitLab CI',
        ],
        projects: [
          {
            id: 'belnet-erp',
            name: 'Internal ERP System',
            description:
              'A modular system automating the internal processes of an internet service provider. I owned the frontend and brought it to a full alpha release.',
            stack: [
              'React',
              'Next.js',
              'TypeScript',
              'Tailwind CSS',
              'Zustand',
              'REST API',
              'GraphQL',
              'Turborepo',
            ],
            shots: [
              {
                file: 'belnet-erp-01.jpg',
                alt: 'ERP leads module: summary figures by status and a table of requests with source, campaign, status, and assigned manager.',
              },
              {
                file: 'belnet-erp-02.jpg',
                alt: 'Workforce module: a table of employees with position, access group, status, two-factor authentication, and last activity.',
              },
              {
                file: 'belnet-erp-03.jpg',
                alt: 'Sign-in screen for the ERP workspace with email and password or Google.',
              },
              {
                file: 'belnet-erp-04.jpg',
                alt: 'Leads table with system fields and tabs of open modules in the top bar of the interface.',
              },
            ],
          },
          {
            id: 'belnet-telegram-mini-app',
            name: 'Telegram Mini App',
            description:
              'Frontend of a Telegram mini app for the internet service provider’s staff to work with the company’s internal services.',
            stack: ['Vue', 'JavaScript', 'Tailwind CSS', 'REST API'],
            shots: [
              {
                file: 'belnet-telegram-mini-app-01.png',
                alt: 'Subscriber creation form in the Telegram Mini App: client details, connection address, and choice of services.',
              },
              {
                file: 'belnet-telegram-mini-app-02.png',
                alt: 'Mobile version of the subscriber creation form with password and phone number validation.',
              },
              {
                file: 'belnet-telegram-mini-app-03.png',
                alt: 'Mobile version of the form: a note, optional router details, and the create-user button.',
              },
            ],
          },
        ],
      },
      {
        id: 'oiac',
        company: 'OIAC / ОІАЦ',
        role: 'Head of Software Development Department',
        previousRole: 'Software Engineer',
        start: '2024-09',
        end: '2025-05',
        location: 'Odesa, Ukraine · On-site',
        description:
          'Developed web services and internal information systems for the Odesa Regional State Administration and its related bodies. In parallel provided technical support for the existing website infrastructure.',
        responsibilities: [
          'Developed new websites, internal services, and full-stack web applications.',
          'Maintained, updated, and fixed 40+ existing WordPress sites of territorial communities, departments, and other regional bodies.',
          'After the promotion, assigned tasks to and supervised the work of two other developers.',
          'Worked with internal document management and reporting, including the ASKOD system.',
        ],
        achievements: [
          'About six months after joining, was promoted from Software Engineer to Head of the Software Development Department.',
          'Combined building new information systems with technical support for about 40 existing websites.',
        ],
        stack: [
          'Vue 3',
          'JavaScript',
          'Node.js',
          'Express.js',
          'Python',
          'Pinia',
          'Vuex',
          'PostgreSQL',
          'Sequelize',
          'REST API',
          'Tailwind CSS',
          'Leaflet',
          'WordPress',
        ],
        projects: [
          {
            id: 'rd-hub-platform',
            name: 'R&D Hub Platform',
            description:
              'A platform for organizing hackathons and keeping participants informed. Includes a public site, an admin panel, a role system, notifications, and authentication.',
            stack: [
              'Vue 3',
              'Pinia',
              'Vue Router',
              'PrimeVue',
              'Tailwind CSS',
              'Node.js',
              'Express.js',
              'PostgreSQL',
              'Sequelize',
              'JWT',
            ],
            shots: [
              {
                file: 'rd-hub-platform-01.png',
                alt: 'R&D Hub home page with a description of the platform and a selection of current fests.',
              },
              {
                file: 'rd-hub-platform-02.png',
                alt: 'News catalog with search, a fest filter, and publication cards.',
              },
              {
                file: 'rd-hub-platform-03.png',
                alt: 'A single news page about the opening of the innovation lab.',
              },
              {
                file: 'rd-hub-platform-04.png',
                alt: 'Fest catalog with filters by status, keywords, and dates.',
              },
              {
                file: 'rd-hub-platform-05.png',
                alt: 'An active fest page with dates, venue, participant count, and buttons to register and create a team.',
              },
              {
                file: 'rd-hub-platform-06.png',
                alt: 'Fest registration dialog with a choice between individual participation and joining a team by code.',
              },
              {
                file: 'rd-hub-platform-07.png',
                alt: 'Winners of a finished fest with teams and jury comments.',
              },
              {
                file: 'rd-hub-platform-08.png',
                alt: 'Admin panel statistics: users, fests, registrations, teams, and winners.',
              },
              {
                file: 'rd-hub-platform-09.png',
                alt: 'Fest management: a table with dates, registration deadline, status, and actions.',
              },
              {
                file: 'rd-hub-platform-10.png',
                alt: 'Fest participant management: team members, winner marks, application statuses, and actions.',
              },
              {
                file: 'rd-hub-platform-11.png',
                alt: 'User management: a table with contacts, university, specialization, and role, on demo data.',
              },
              {
                file: 'rd-hub-platform-12.png',
                alt: 'News management: a table of publications with author, linked fest, and publication status.',
              },
              {
                file: 'rd-hub-platform-13.png',
                alt: 'Team management: a table of teams with fest, leader, participant count, and status.',
              },
            ],
          },
          {
            id: 'odesa-interactive-map',
            name: 'Odesa Interactive Map',
            description:
              'A project delivered on a very tight deadline — in 4 days. An interactive, animated city map with articles and photos pinned to geographic points.',
            stack: [
              'Vue 3',
              'Pinia',
              'Leaflet',
              'Tailwind CSS',
              'Node.js',
              'Express.js',
              'PostgreSQL',
              'Sequelize',
              'JWT',
            ],
            shots: [
              {
                file: 'odesa-interactive-map-01.png',
                alt: 'Interactive map of Odesa for the “Рух без бар’єрів” project with themed markers for places.',
              },
              {
                file: 'odesa-interactive-map-02.png',
                alt: 'A selected map marker and a side panel with an article about the House of Scientists, a photo, and a description.',
              },
              {
                file: 'odesa-interactive-map-03.png',
                alt: 'Article catalog with sorting, categories, and an open article preview panel.',
              },
              {
                file: 'odesa-interactive-map-04.png',
                alt: 'Admin panel: a table of articles with creation date and edit and delete actions.',
              },
              {
                file: 'odesa-interactive-map-05.png',
                alt: 'Article editor with title, category, type color, a rich text editor, and image upload.',
              },
              {
                file: 'odesa-interactive-map-06.png',
                alt: 'Article marker settings: point on the map, coordinates, icon, colors, and marker label.',
              },
            ],
          },
          {
            id: 'attendance-bot',
            name: 'Employee Attendance System',
            description:
              'A Telegram bot for internal tracking of employee attendance and statuses, keeping reference information, and preparing data for HR work.',
            stack: ['Python', 'aiogram', 'PostgreSQL', 'asyncpg', 'SQLAlchemy', 'APScheduler'],
            shots: [
              {
                file: 'attendance-bot-01.png',
                alt: 'A test employee’s profile in the Telegram bot: contacts, status, reminders, and arrival check-in, with the action menu.',
              },
              {
                file: 'attendance-bot-02.png',
                alt: 'Employee registration in the bot with validation of full name, phone, and date of birth, and setting the workday start.',
              },
            ],
          },
          {
            id: 'password-generator',
            name: 'Password Generator',
            description:
              'An internal web tool that generates password options, with sign-in, saved state, and additional transliteration tools.',
            stack: ['Vue 3', 'Vuex', 'JavaScript', 'Node.js', 'Express.js'],
            shots: [
              {
                file: 'password-generator-01.png',
                alt: 'Password generator in “word + separator + prefix” mode with a list of options in Ukrainian and English keyboard layouts and a transliteration table.',
              },
              {
                file: 'password-generator-02.png',
                alt: 'Generating strong passwords with an extended prefix of digits, symbols, and letters from two alphabets.',
              },
            ],
          },
        ],
      },
      {
        id: 'suitt',
        company:
          'State University of Intelligent Technologies and Telecommunications (SUITT / ДУІТЗ)',
        role: 'First-Category Specialist, Research and Educational Center for Online Learning Technologies',
        roleNote: 'Part-time since September 2024',
        start: '2022-09',
        end: '2026-06',
        location: 'Odesa, Ukraine · Hybrid',
        description:
          'Responsible for deploying and maintaining the university’s Moodle distance learning system. After the initial launch, the main work became administering the platform and providing technical support to faculty and students.',
        responsibilities: [
          'Deployed Moodle on the server and completed the platform’s initial setup.',
          'Administered the system, user accounts, roles, and access rights.',
          'Updated and technically maintained Moodle in production.',
          'Provided technical support to faculty and students.',
          'Helped prepare reports, forms, and other official materials.',
          'Searched for and gathered information for internal tasks when needed.',
        ],
        achievements: [
          'Deployed and configured the university’s Moodle platform on my own, then maintained it for several years.',
          'After moving to another main job, continued to support the system part-time until June 2026.',
        ],
        stack: ['Moodle', 'Linux'],
        projects: [
          {
            id: 'suitt-moodle',
            name: 'Moodle Distance Learning System',
            description: 'The university’s distance learning platform for students.',
            stack: ['Moodle', 'Linux'],
            shots: [
              {
                file: 'moodle-01.png',
                alt: 'Home page of the university’s Moodle with course search and a catalog of educational programs by level of higher education.',
              },
              {
                file: 'moodle-02.png',
                alt: 'Moodle site administration with sections for analytics, competencies, badges, H5P, and licenses.',
              },
              {
                file: 'moodle-03.png',
                alt: 'A course page with the syllabus, reading list, and lectures with completion marks.',
              },
              {
                file: 'moodle-04.png',
                alt: 'Dialog for adding an activity or resource to a course: quizzes, assignments, forums, H5P, SCORM, and more.',
              },
            ],
          },
        ],
      },
    ],
    projects: [
      {
        id: 'artillery-spotter-calculator',
        name: 'Artillery Spotter Calculator',
        description:
          'A web calculator for Foxhole players that simplifies calculating distance, azimuth, and corrections for artillery fire. Supports several aiming scenarios and accounts for wind and different artillery types.',
        highlights: [
          'Three calculation modes: direct aiming, triangulation, and group fire',
          'SVG visualization of positions, directions, and calculations',
          'Multilingual interface, calculation history, and support for several artillery types',
        ],
        stack: ['React', 'JavaScript', 'Tailwind CSS', 'SVG', 'LocalStorage'],
        githubUrl: 'https://github.com/Konradiuss/artillery-calculator-stable',
        demoUrl: 'https://konradiuss.github.io/artillery-calculator-stable',
        shots: [
          {
            file: 'happy-shells-01.png',
            alt: 'Direct aiming mode with inputs for distance, azimuth, artillery type, and wind.',
          },
          {
            file: 'happy-shells-02.png',
            alt: 'Direct aiming result with a visualization of the firing direction and target position.',
          },
          {
            file: 'happy-shells-03.png',
            alt: 'History of calculations and a reference on how wind strength affects different artillery types.',
          },
          {
            file: 'happy-shells-04.png',
            alt: 'Triangulation mode for calculating corrections from the target and impact coordinates.',
          },
          {
            file: 'happy-shells-05.png',
            alt: 'Group fire mode with interactive placement of several artillery pieces on a coordinate grid.',
          },
          {
            file: 'happy-shells-06.png',
            alt: 'Calculated corrections for a group of guns together with the history of previous group calculations.',
          },
        ],
      },
      {
        id: 'disco-cv',
        name: 'DiscoCV',
        description:
          'An interactive disco-themed portfolio site that combines a resume with a full 3D scene and interactive elements. Built as an experiment in presenting a professional profile in an unconventional way and in complex browser interfaces.',
        highlights: [
          'Interactive Three.js 3D scene with a disco ball, reflections, lighting, and animations',
          'Built-in music player with playback and volume controls and a scene that reacts to the sound',
          'Multilingual interface, responsive layout, and automated testing with Vitest and Playwright',
        ],
        stack: ['Vue 3', 'TypeScript', 'Three.js', 'Vite', 'Vue Router', 'Vitest', 'Playwright'],
        shots: [
          {
            file: 'disco-cv-01.png',
            alt: 'DiscoCV home screen with an interactive 3D disco scene, developer profile, music player, and language switcher.',
          },
          {
            file: 'disco-cv-02.png',
            alt: 'DiscoCV work experience timeline with roles, companies, dates, and responsibility summaries.',
          },
          {
            file: 'disco-cv-03.png',
            alt: 'Work project cards in DiscoCV with technology stacks and screenshot galleries.',
          },
          {
            file: 'disco-cv-04.png',
            alt: 'DiscoCV pet projects section with descriptions, key features, and technology stacks.',
          },
          {
            file: 'disco-cv-05.png',
            alt: 'DiscoCV technical skills matrix grouped by discipline and proficiency level.',
          },
          {
            file: 'disco-cv-06.png',
            alt: 'DiscoCV education and languages section near the end of the interactive resume.',
          },
        ],
      },
    ],
    skills: [
      { name: 'Frontend', skills: skillGroups.frontend },
      { name: 'State & Data', skills: skillGroups.state },
      { name: 'Backend', skills: skillGroups.backend },
      { name: 'Databases & ORM', skills: skillGroups.databases },
      { name: 'Testing', skills: skillGroups.testing },
      { name: 'Tooling', skills: skillGroups.tooling },
      { name: 'DevOps & Infrastructure', skills: skillGroups.devops },
      { name: 'CMS', skills: skillGroups.cms },
      { name: 'Web Graphics', skills: skillGroups.graphics },
      { name: 'Architecture', skills: skillGroups.architecture },
    ],
    education: [
      {
        id: 'server-college',
        institution: 'Server College',
        qualification: '121 — Software Engineering, Junior Specialist',
        start: '2018-09',
        end: '2022-06',
      },
      {
        id: 'suitt-bachelor',
        institution:
          'State University of Intelligent Technologies and Telecommunications (SUITT / ДУІТЗ)',
        qualification: '121 — Software Engineering, Bachelor’s degree',
        start: '2022-09',
        end: '2024-06',
      },
      {
        id: 'suitt-master',
        institution:
          'State University of Intelligent Technologies and Telecommunications (SUITT / ДУІТЗ)',
        qualification: '121 — Software Engineering, Master’s degree',
        honors: 'with honors',
        start: '2024-09',
        end: '2025-12',
      },
    ],
    languages: [
      { code: 'UA', name: 'Ukrainian', level: 'Native' },
      { code: 'RU', name: 'Russian', level: 'Native' },
      { code: 'EN', name: 'English', level: 'C1' },
      { code: 'DE', name: 'German', level: 'A1' },
    ],
  },
}
