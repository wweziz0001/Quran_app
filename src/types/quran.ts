// Quran-specific types for the Mushaf Viewer

export interface Surah {
  id: number;
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTransliteration: string;
  revelationType: 'meccan' | 'medinan';
  totalAyahs: number;
  pageNumberStart: number;
  juzNumberStart: number;
  description?: string | null;
}

export interface Verse {
  id: string;
  surahId: number;
  numberInSurah: number;
  numberGlobal: number;
  textArabic: string;
  textUthmani?: string | null;
  textIndopak?: string | null;
  pageNumber: number;
  juzNumber: number;
  hizbNumber: number;
  rubNumber: number;
  sajdah: boolean;
  sajdahType?: string | null;
  wordCount?: number | null;
  letterCount?: number | null;
  // Relationships
  surah?: Surah;
  translation?: Translation;
  tafsir?: TafsirEntry[];
}

export interface Translation {
  id: string;
  ayahId: number;
  sourceId: string;
  text: string;
  footnotes?: string | null;
  source?: TranslationSource;
}

export interface TranslationSource {
  id: string;
  name: string;
  language: string;
  languageCode: string;
  author?: string | null;
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface TafsirSource {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  slug: string;
  authorArabic?: string | null;
  authorEnglish?: string | null;
  description?: string | null;
  language: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface TafsirEntry {
  id: string;
  surahId: number;
  ayahId: number;
  sourceId: string;
  textArabic?: string | null;
  textTranslation?: string | null;
  htmlContent?: string | null;
  pageNumber?: number | null;
  wordExplanations?: string | null;
  source?: TafsirSource;
}

export interface Reciter {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  slug: string;
  bio?: string | null;
  imageUrl?: string | null;
  country?: string | null;
  deathYear?: number | null;
  hasHighQuality: boolean;
  hasGapless: boolean;
  totalDownloads: number;
  popularity: number;
  isActive: boolean;
}

export interface Recitation {
  id: string;
  surahId: number;
  reciterId: string;
  style: 'murattal' | 'mujawwad' | 'muallim' | 'other';
  bitrate: number;
  format: string;
  timingDataUrl?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
  audioUrl: string;
  audioUrlHd?: string | null;
  isActive: boolean;
  downloadCount: number;
  reciter?: Reciter;
}

export interface RecitationAyah {
  id: string;
  recitationId: string;
  ayahId: number;
  startTime: number;
  endTime: number;
  audioUrl?: string | null;
  durationMs?: number | null;
}

export interface MushafEdition {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  slug: string;
  type: 'image' | 'ttf' | 'svg';
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
  fontName?: string | null;
  fontUrl?: string | null;
}

export interface MushafPage {
  id: string;
  editionId: string;
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

export interface MushafAyahLine {
  id: string;
  ayahId: string;
  pageNumber: number;
  lineNumber: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface MushafAyah {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  lines: MushafAyahLine[];
}

export interface Bookmark {
  id: string;
  userId: string;
  ayahId: number;
  type: 'BOOKMARK' | 'HIGHLIGHT' | 'NOTE';
  note?: string | null;
  color?: string | null;
  createdAt: Date;
  updatedAt: Date;
  ayah?: Verse;
}

export interface ReadingHistory {
  id: string;
  userId: string;
  ayahId: number;
  lastReadAt: Date;
  readCount: number;
}

export interface SearchIndex {
  id: number;
  ayahId: number;
  textArabicNormalized: string;
  textEnglishNormalized?: string | null;
}

// Audio Player State
export interface AudioPlayerState {
  currentRecitation: Recitation | null;
  currentVerse: Verse | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  repeatMode: 'none' | 'single' | 'range' | 'all';
  autoScroll: boolean;
}

// Tajweed Rule Types
export interface TajweedRule {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  color: string;
  description: string;
  examples?: string[];
}

// Word Analysis
export interface WordAnalysis {
  id: string;
  ayahId: number;
  wordPosition: number;
  wordArabic: string;
  wordRoot?: string | null;
  wordTranslation?: string | null;
  grammar?: string | null;
}
