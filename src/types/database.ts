// src/types/database.ts
// TypeScript types for Enterprise Stage 1 tables

// ==================== Search ====================
export interface SearchIndex {
  id: string;
  ayahId: number;
  content: string;
  contentNormalized?: string;
  embedding?: number[];
  embeddingModel?: string;
  language: string;
  lastIndexed: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Word Analysis ====================
export interface WordAnalysis {
  id: number;
  ayahId: number;
  wordPosition: number;
  word: string;
  wordNormalized?: string;
  root?: string;
  lemma?: string;
  pos?: PartOfSpeech;
  morphology?: MorphologyData;
  meaning?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'particle'
  | 'preposition'
  | 'conjunction'
  | 'pronoun'
  | 'adjective'
  | 'adverb'
  | 'other';

export interface MorphologyData {
  gender?: 'masculine' | 'feminine';
  number?: 'singular' | 'dual' | 'plural';
  case?: 'nominative' | 'accusative' | 'genitive';
  definiteness?: 'definite' | 'indefinite' | 'construct';
  tense?: 'past' | 'present' | 'imperative';
  voice?: 'active' | 'passive';
  person?: 'first' | 'second' | 'third';
}

// ==================== Notifications ====================
export type NotificationType =
  | 'BOOKMARK'
  | 'READING_REMINDER'
  | 'NEW_TAFSIR'
  | 'NEW_TRANSLATION'
  | 'SYSTEM'
  | 'ACHIEVEMENT';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

// ==================== Analytics ====================
export type AnalyticsEventType =
  | 'PAGE_VIEW'
  | 'AYAH_READ'
  | 'AYAH_AUDIO_PLAYED'
  | 'SURAH_COMPLETED'
  | 'SEARCH_QUERY'
  | 'BOOKMARK_CREATED'
  | 'TAFSIR_VIEWED'
  | 'TRANSLATION_CHANGED'
  | 'RECITER_CHANGED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT';

export interface Analytics {
  id: string;
  eventType: AnalyticsEventType;
  userId?: string;
  surahId?: number;
  ayahId?: number;
  reciterId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// ==================== Audio ====================
export type AudioStatus = 'pending' | 'processing' | 'ready' | 'error';
export type AudioFormat = 'mp3' | 'ogg' | 'wav';

export interface AudioFile {
  id: string;
  recitationId: string;
  ayahId: number;
  format: AudioFormat;
  hlsPlaylistUrl?: string;
  hlsSegmentsUrl?: string;
  fileSize?: number;
  durationMs?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  checksum?: string;
  status: AudioStatus;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Collections ====================
export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  color?: string;
  icon?: string;
  itemCount: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  items?: CollectionItem[];
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  ayahId: number;
  note?: string;
  sortOrder: number;
  addedAt: Date;
}

// ==================== Tajweed ====================
export interface TajweedRule {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  code: string;
  description?: string;
  color?: string;
  examples?: TajweedExample[];
  category?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TajweedExample {
  ayahId: number;
  surahId: number;
  text: string;
  highlightedWord: string;
}

// ==================== Feature Flags ====================
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rollout: number;
  conditions?: FeatureFlagCondition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagCondition {
  type: 'user_id' | 'user_role' | 'country' | 'device' | 'custom';
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'lt';
  value: string | string[] | number;
}

// ==================== API Log ====================
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface APILog {
  id: string;
  endpoint: string;
  method: HttpMethod;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  statusCode: number;
  responseTime: number;
  requestSize?: number;
  responseSize?: number;
  error?: string;
  timestamp: Date;
}

// ==================== User Session ====================
export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  deviceInfo?: DeviceInfo;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  lastActivity: Date;
  createdAt: Date;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  browserVersion: string;
}

// ==================== API Response Types ====================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== Helper Types ====================
export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

// Feature flag keys enum for type safety
export const FEATURE_FLAG_KEYS = {
  SEMANTIC_SEARCH: 'semantic_search',
  AUDIO_HLS: 'audio_hls',
  OFFLINE_MODE: 'offline_mode',
  DARK_MODE: 'dark_mode',
  WORD_ANALYSIS: 'word_analysis',
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[keyof typeof FEATURE_FLAG_KEYS];

// Tajweed rule codes enum for type safety
export const TAJWEED_CODES = {
  IDGHAM: 'IDGHAM',
  IZHAR: 'IZHAR',
  IQLAB: 'IQLAB',
  IKHFA: 'IKHFA',
  GHUNNAH: 'GHUNNAH',
  MADD: 'MADD',
  QALQALAH: 'QALQALAH',
} as const;

export type TajweedCode = (typeof TAJWEED_CODES)[keyof typeof TAJWEED_CODES];
