export interface SurahType {
  id: number;
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTransliteration: string;
  revelationType: string;
  totalAyahs: number;
  pageNumberStart: number;
  juzNumberStart: number;
  description: string | null;
}

export interface AyahType {
  id: number;
  surahId: number;
  ayahNumber: number;
  ayahNumberGlobal: number;
  textArabic: string;
  textUthmani: string | null;
  pageNumber: number;
  juzNumber: number;
  hizbNumber: number;
  sajdah: boolean;
  surah?: SurahType;
  translation?: {
    text: string;
    sourceName: string;
  };
}

export interface ReciterType {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  slug: string;
  bio: string | null;
  imageUrl: string | null;
  country: string | null;
  hasHighQuality: boolean;
  hasGapless: boolean;
  popularity: number;
}

export interface RecitationType {
  id: string;
  surahId: number;
  reciterId: string;
  style: string;
  bitrate: number;
  format: string;
  audioUrl: string;
  audioUrlHd: string | null;
  durationSeconds: number | null;
  reciter?: ReciterType;
}

export interface TafsirSourceType {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  slug: string;
  language: string;
  isDefault: boolean;
}

export interface TafsirEntryType {
  id: string;
  ayahId: number;
  sourceId: string;
  textArabic: string | null;
  textTranslation: string | null;
  source?: TafsirSourceType;
}

export interface BookmarkType {
  id: string;
  userId: string;
  ayahId: number;
  type: 'BOOKMARK' | 'HIGHLIGHT' | 'NOTE';
  note: string | null;
  color: string | null;
  createdAt: Date;
  ayah?: AyahType;
}

export interface AppSettingType {
  id: string;
  key: string;
  value: string;
  description: string | null;
  isPublic: boolean;
}

export interface UserSettingType {
  fontSize: number;
  fontFamily: string;
  showTajweed: boolean;
  showTranslation: boolean;
  preferredTranslation: string;
  defaultReciterId: string | null;
  audioSpeed: number;
  autoPlay: boolean;
  dailyReminder: boolean;
  reminderTime: string | null;
}
