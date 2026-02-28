// Quran Application Constants

// Technology Stack
export const TECH_STACK = {
  mobile: {
    framework: 'Kotlin + Jetpack Compose',
    minSdk: 26,
    targetSdk: 34,
    compileSdk: 34,
    architecture: 'Clean Architecture (MVVM + Repository Pattern)',
    di: 'Hilt',
    networking: 'Retrofit + OkHttp',
    localDb: 'Room',
    imageLoading: 'Coil',
    audioPlayer: 'ExoPlayer',
  },
  backend: {
    framework: 'NestJS (Node.js)',
    runtime: 'Node.js 20 LTS',
    language: 'TypeScript',
    orm: 'Prisma',
    auth: 'JWT + Passport',
    validation: 'class-validator + class-transformer',
    docs: 'Swagger/OpenAPI',
  },
  admin: {
    framework: 'Next.js 16',
    language: 'TypeScript',
    styling: 'Tailwind CSS 4',
    components: 'shadcn/ui',
    state: 'Zustand + TanStack Query',
  },
  database: {
    primary: 'PostgreSQL 16',
    orm: 'Prisma',
    migrations: 'Prisma Migrate',
  },
  storage: {
    type: 'S3-compatible Object Storage',
    provider: 'AWS S3 / DigitalOcean Spaces / MinIO',
    cdn: 'CloudFront / Cloudflare',
  },
  caching: {
    redis: 'Redis 7.x',
    strategy: 'Cache-aside with TTL',
  },
  containerization: {
    docker: 'Docker + Docker Compose',
    orchestration: 'Kubernetes (optional for scale)',
  },
  ci: {
    platform: 'GitHub Actions',
    stages: 'Lint → Test → Build → Deploy',
  },
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: 'POST /api/auth/login',
    register: 'POST /api/auth/register',
    refresh: 'POST /api/auth/refresh',
    logout: 'POST /api/auth/logout',
    me: 'GET /api/auth/me',
  },
  // Quran Data
  quran: {
    surahs: 'GET /api/quran/surahs',
    surahById: 'GET /api/quran/surahs/:id',
    ayahs: 'GET /api/quran/ayahs',
    ayahById: 'GET /api/quran/ayahs/:id',
    search: 'GET /api/quran/search',
    byPage: 'GET /api/quran/page/:number',
    byJuz: 'GET /api/quran/juz/:number',
  },
  // Audio/Recitations
  recitations: {
    list: 'GET /api/recitations',
    reciters: 'GET /api/recitations/reciters',
    byReciter: 'GET /api/recitations/reciter/:id',
    audioUrl: 'GET /api/recitations/audio/:id',
    stream: 'GET /api/recitations/stream/:id',
    download: 'GET /api/recitations/download/:id',
  },
  // Tafsir
  tafsir: {
    sources: 'GET /api/tafsir/sources',
    byAyah: 'GET /api/tafsir/ayah/:id',
    bySource: 'GET /api/tafsir/source/:id',
  },
  // Bookmarks
  bookmarks: {
    list: 'GET /api/bookmarks',
    add: 'POST /api/bookmarks',
    remove: 'DELETE /api/bookmarks/:id',
    update: 'PATCH /api/bookmarks/:id',
  },
  // Admin
  admin: {
    users: 'GET /api/admin/users',
    updateUser: 'PATCH /api/admin/users/:id',
    reciters: {
      list: 'GET /api/admin/reciters',
      create: 'POST /api/admin/reciters',
      update: 'PUT /api/admin/reciters/:id',
      delete: 'DELETE /api/admin/reciters/:id',
    },
    tafsir: {
      list: 'GET /api/admin/tafsir',
      create: 'POST /api/admin/tafsir',
      update: 'PUT /api/admin/tafsir/:id',
      delete: 'DELETE /api/admin/tafsir/:id',
    },
    settings: {
      list: 'GET /api/admin/settings',
      update: 'PUT /api/admin/settings/:key',
    },
    auditLogs: 'GET /api/admin/audit-logs',
  },
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  USER: 'user',
} as const;

// Quran Metadata
export const QURAN_METADATA = {
  totalSurahs: 114,
  totalAyahs: 6236,
  totalPages: 604,
  totalJuz: 30,
  totalHizb: 60,
  manzils: 7,
  sajdahVerses: 15,
} as const;

// App Settings Categories
export const SETTING_CATEGORIES = {
  GENERAL: 'general',
  AUDIO: 'audio',
  DISPLAY: 'display',
  API: 'api',
  SECURITY: 'security',
} as const;

// Audio Quality Options
export const AUDIO_QUALITIES = {
  LOW: { label: 'Low (64kbps)', bitrate: 64, sampleRate: 22050 },
  MEDIUM: { label: 'Medium (128kbps)', bitrate: 128, sampleRate: 44100 },
  HIGH: { label: 'High (256kbps)', bitrate: 256, sampleRate: 44100 },
  LOSSLESS: { label: 'Lossless (320kbps)', bitrate: 320, sampleRate: 48000 },
} as const;

// Revelation Types
export const REVELATION_TYPES = {
  MECCAN: 'Meccan',
  MEDINAN: 'Medinan',
} as const;

// Navigation Items
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'architecture', label: 'Architecture', icon: 'GitBranch' },
  { id: 'database', label: 'Database', icon: 'Database' },
  { id: 'api', label: 'API Docs', icon: 'Code' },
  { id: 'reciters', label: 'Reciters', icon: 'Mic' },
  { id: 'tafsir', label: 'Tafsir', icon: 'BookOpen' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
  { id: 'android', label: 'Android', icon: 'Smartphone' },
  { id: 'deployment', label: 'Deployment', icon: 'Rocket' },
  { id: 'security', label: 'Security', icon: 'Shield' },
] as const;
