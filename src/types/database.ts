// src/types/database.ts
// TypeScript types for Enterprise Stage 1 models

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
  pos?: 'noun' | 'verb' | 'particle' | 'preposition' | 'conjunction' | 'pronoun' | 'adjective' | 'adverb' | 'other';
  morphology?: MorphologyData;
  meaning?: string;
  createdAt: Date;
  updatedAt: Date;
}

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

export interface AudioFile {
  id: string;
  recitationId: string;
  ayahId: number;
  format: 'mp3' | 'ogg' | 'wav';
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
export interface APILog {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
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
