import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatarUrl: string | null;
}

export interface Surah {
  id: number;
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTransliteration: string;
  revelationType: string;
  totalAyahs: number;
  ayahCount?: number;
}

export interface Ayah {
  id: number;
  ayahNumber: number;
  ayahNumberGlobal: number;
  textArabic: string;
  textUthmani: string | null;
  pageNumber: number;
  juzNumber: number;
  hizbNumber: number;
  sajdah: boolean;
  translation?: {
    text: string;
    sourceName: string;
  } | null;
}

export interface Reciter {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  slug: string;
  bio: string | null;
  country: string | null;
  hasHighQuality: boolean;
  hasGapless: boolean;
  popularity: number;
  recitationCount?: number;
}

export interface Recitation {
  id: string;
  surahId: number;
  reciterId: string;
  style: string;
  bitrate: number;
  format: string;
  audioUrl: string;
  audioUrlHd: string | null;
  durationSeconds: number | null;
  reciter?: Reciter;
}

export interface Bookmark {
  id: string;
  userId: string;
  ayahId: number;
  type: string;
  note: string | null;
  color: string | null;
  createdAt: string;
  ayah?: Ayah & { surah: { id: number; number: number; nameEnglish: string } };
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  // Current view
  currentView: 'home' | 'surah' | 'bookmarks' | 'search' | 'admin';
  setCurrentView: (view: 'home' | 'surah' | 'bookmarks' | 'search' | 'admin') => void;

  // Selected surah/ayah
  selectedSurah: Surah | null;
  setSelectedSurah: (surah: Surah | null) => void;
  selectedAyahId: number | null;
  setSelectedAyahId: (id: number | null) => void;

  // Audio
  currentReciter: Reciter | null;
  setCurrentReciter: (reciter: Reciter | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentAyahAudio: number | null;
  setCurrentAyahAudio: (ayahId: number | null) => void;

  // Settings
  showTranslation: boolean;
  setShowTranslation: (show: boolean) => void;
  showTafsir: boolean;
  setShowTafsir: (show: boolean) => void;
  fontSize: number;
  setFontSize: (size: number) => void;

  // Bookmarks
  bookmarks: Bookmark[];
  setBookmarks: (bookmarks: Bookmark[]) => void;
}

export const useQuranStore = create<AppState>((set) => ({
  // Auth
  user: null,
  token: null,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  logout: () => set({ user: null, token: null }),

  // Current view
  currentView: 'home',
  setCurrentView: (currentView) => set({ currentView }),

  // Selected surah/ayah
  selectedSurah: null,
  setSelectedSurah: (selectedSurah) => set({ selectedSurah }),
  selectedAyahId: null,
  setSelectedAyahId: (selectedAyahId) => set({ selectedAyahId }),

  // Audio
  currentReciter: null,
  setCurrentReciter: (currentReciter) => set({ currentReciter }),
  isPlaying: false,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  currentAyahAudio: null,
  setCurrentAyahAudio: (currentAyahAudio) => set({ currentAyahAudio }),

  // Settings
  showTranslation: true,
  setShowTranslation: (showTranslation) => set({ showTranslation }),
  showTafsir: false,
  setShowTafsir: (showTafsir) => set({ showTafsir }),
  fontSize: 1.0,
  setFontSize: (fontSize) => set({ fontSize }),

  // Bookmarks
  bookmarks: [],
  setBookmarks: (bookmarks) => set({ bookmarks }),
}));
