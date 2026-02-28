import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Surah, Verse, Reciter, Recitation, Bookmark, MushafEdition } from '@/types/quran';

interface QuranStore {
  // Surahs list
  surahs: Surah[];
  setSurahs: (surahs: Surah[]) => void;
  
  // Current content
  currentSurah: Surah | null;
  setCurrentSurah: (surah: Surah | null) => void;
  
  currentVerse: Verse | null;
  setCurrentVerse: (verse: Verse | null) => void;
  
  verses: Verse[];
  setVerses: (verses: Verse[]) => void;

  // Mushaf view settings
  mushafViewMode: 'normal' | 'mushaf-images' | 'mushaf-ttf';
  setMushafViewMode: (mode: 'normal' | 'mushaf-images' | 'mushaf-ttf') => void;
  
  currentMushafPage: number;
  setCurrentMushafPage: (page: number) => void;
  
  selectedEdition: string;
  setSelectedEdition: (editionId: string) => void;

  // Reciters
  reciters: Reciter[];
  setReciters: (reciters: Reciter[]) => void;
  
  selectedReciter: string;
  setSelectedReciter: (reciterId: string) => void;

  // Audio settings
  currentReciter: Reciter | null;
  setCurrentReciter: (reciter: Reciter | null) => void;
  
  currentRecitation: Recitation | null;
  setCurrentRecitation: (recitation: Recitation | null) => void;
  
  currentAudioUrl: string;
  setCurrentAudioUrl: (url: string) => void;
  
  isAudioPlaying: boolean;
  setIsAudioPlaying: (playing: boolean) => void;
  
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  
  audioProgress: number;
  setAudioProgress: (progress: number) => void;
  
  audioDuration: number;
  setAudioDuration: (duration: number) => void;
  
  audioVolume: number;
  setAudioVolume: (volume: number) => void;
  
  isAudioMuted: boolean;
  setIsAudioMuted: (muted: boolean) => void;
  
  isLoadingAudio: boolean;
  setIsLoadingAudio: (loading: boolean) => void;
  
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  
  // Repeat settings
  repeatMode: 'off' | 'verse' | 'surah';
  setRepeatMode: (mode: 'off' | 'verse' | 'surah') => void;
  cycleRepeatMode: () => void;
  
  repeatCount: number;
  setRepeatCount: (count: number) => void;
  
  currentRepeatCount: number;
  setCurrentRepeatCount: (count: number) => void;

  // Auto-play
  autoPlayEnabled: boolean;
  setAutoPlayEnabled: (enabled: boolean) => void;
  toggleAutoPlay: () => void;

  // Sleep timer
  sleepTimerMinutes: number;
  setSleepTimerMinutes: (minutes: number) => void;
  
  sleepTimerEndTime: number | null;
  setSleepTimerEndTime: (time: number | null) => void;

  // Bismillah
  playBismillah: boolean;
  setPlayBismillah: (play: boolean) => void;
  togglePlayBismillah: () => void;
  
  isPlayingBismillah: boolean;
  setIsPlayingBismillah: (playing: boolean) => void;

  // Display settings
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  
  fontSize: number;
  setFontSize: (size: number) => void;
  
  showTajweed: boolean;
  setShowTajweed: (show: boolean) => void;
  
  showTranslation: boolean;
  setShowTranslation: (show: boolean) => void;
  
  showTafsir: boolean;
  setShowTafsir: (show: boolean) => void;
  
  showAudioPlayer: boolean;
  setShowAudioPlayer: (show: boolean) => void;

  // User data
  bookmarks: Bookmark[];
  setBookmarks: (bookmarks: Bookmark[]) => void;
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (id: string) => void;

  // UI state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useQuranStore = create<QuranStore>()(
  persist(
    (set) => ({
      // Surahs list
      surahs: [],
      setSurahs: (surahs) => set({ surahs }),
      
      // Current content
      currentSurah: null,
      setCurrentSurah: (currentSurah) => set({ currentSurah }),
      
      currentVerse: null,
      setCurrentVerse: (currentVerse) => set({ currentVerse }),
      
      verses: [],
      setVerses: (verses) => set({ verses }),

      // Mushaf view settings
      mushafViewMode: 'normal',
      setMushafViewMode: (mushafViewMode) => set({ mushafViewMode }),
      
      currentMushafPage: 1,
      setCurrentMushafPage: (currentMushafPage) => set({ currentMushafPage }),
      
      selectedEdition: '',
      setSelectedEdition: (selectedEdition) => set({ selectedEdition }),

      // Reciters
      reciters: [],
      setReciters: (reciters) => set({ reciters }),
      
      selectedReciter: '',
      setSelectedReciter: (selectedReciter) => set({ selectedReciter }),

      // Audio settings
      currentReciter: null,
      setCurrentReciter: (currentReciter) => set({ currentReciter }),
      
      currentRecitation: null,
      setCurrentRecitation: (currentRecitation) => set({ currentRecitation }),
      
      currentAudioUrl: '',
      setCurrentAudioUrl: (currentAudioUrl) => set({ currentAudioUrl }),
      
      isAudioPlaying: false,
      setIsAudioPlaying: (isAudioPlaying) => set({ isAudioPlaying }),
      
      isPlaying: false,
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      
      audioProgress: 0,
      setAudioProgress: (audioProgress) => set({ audioProgress }),
      
      audioDuration: 0,
      setAudioDuration: (audioDuration) => set({ audioDuration }),
      
      audioVolume: 1,
      setAudioVolume: (audioVolume) => set({ audioVolume }),
      
      isAudioMuted: false,
      setIsAudioMuted: (isAudioMuted) => set({ isAudioMuted }),
      
      isLoadingAudio: false,
      setIsLoadingAudio: (isLoadingAudio) => set({ isLoadingAudio }),
      
      playbackRate: 1.0,
      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      
      // Repeat settings
      repeatMode: 'off',
      setRepeatMode: (repeatMode) => set({ repeatMode }),
      cycleRepeatMode: () => set((state) => {
        const modes: ('off' | 'verse' | 'surah')[] = ['off', 'verse', 'surah'];
        const currentIndex = modes.indexOf(state.repeatMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        return { repeatMode: modes[nextIndex] };
      }),
      
      repeatCount: 1,
      setRepeatCount: (repeatCount) => set({ repeatCount }),
      
      currentRepeatCount: 0,
      setCurrentRepeatCount: (currentRepeatCount) => set({ currentRepeatCount }),

      // Auto-play
      autoPlayEnabled: false,
      setAutoPlayEnabled: (autoPlayEnabled) => set({ autoPlayEnabled }),
      toggleAutoPlay: () => set((state) => ({ autoPlayEnabled: !state.autoPlayEnabled })),

      // Sleep timer
      sleepTimerMinutes: 0,
      setSleepTimerMinutes: (minutes) => set({ 
        sleepTimerMinutes: minutes,
        sleepTimerEndTime: minutes > 0 ? Date.now() + minutes * 60 * 1000 : null
      }),
      
      sleepTimerEndTime: null,
      setSleepTimerEndTime: (sleepTimerEndTime) => set({ sleepTimerEndTime }),

      // Bismillah
      playBismillah: true,
      setPlayBismillah: (playBismillah) => set({ playBismillah }),
      togglePlayBismillah: () => set((state) => ({ playBismillah: !state.playBismillah })),
      
      isPlayingBismillah: false,
      setIsPlayingBismillah: (isPlayingBismillah) => set({ isPlayingBismillah }),

      // Display settings
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      
      fontSize: 28,
      setFontSize: (fontSize) => set({ fontSize }),
      
      showTajweed: false,
      setShowTajweed: (showTajweed) => set({ showTajweed }),
      
      showTranslation: true,
      setShowTranslation: (showTranslation) => set({ showTranslation }),
      
      showTafsir: false,
      setShowTafsir: (showTafsir) => set({ showTafsir }),
      
      showAudioPlayer: false,
      setShowAudioPlayer: (showAudioPlayer) => set({ showAudioPlayer }),

      // User data
      bookmarks: [],
      setBookmarks: (bookmarks) => set({ bookmarks }),
      addBookmark: (bookmark) => set((state) => ({ 
        bookmarks: [...state.bookmarks, bookmark] 
      })),
      removeBookmark: (id) => set((state) => ({ 
        bookmarks: state.bookmarks.filter(b => b.id !== id) 
      })),

      // UI state
      searchQuery: '',
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ 
        isSidebarOpen: !state.isSidebarOpen 
      })),
    }),
    {
      name: 'quran-storage',
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        fontSize: state.fontSize,
        showTajweed: state.showTajweed,
        showTranslation: state.showTranslation,
        showTafsir: state.showTafsir,
        playbackRate: state.playbackRate,
        currentReciter: state.currentReciter,
        selectedReciter: state.selectedReciter,
        selectedEdition: state.selectedEdition,
        mushafViewMode: state.mushafViewMode,
        audioVolume: state.audioVolume,
        autoPlayEnabled: state.autoPlayEnabled,
        playBismillah: state.playBismillah,
        repeatMode: state.repeatMode,
        repeatCount: state.repeatCount,
      }),
    }
  )
);
