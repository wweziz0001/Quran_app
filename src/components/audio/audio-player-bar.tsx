'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Loader2,
  Repeat,
  Repeat1,
  Clock,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useQuranStore } from '@/stores/quran-store';
import { cn } from '@/lib/utils';

// Arabic numeral converter
const toArabicNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) return '';
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
};

// Sleep timer options in minutes
const SLEEP_TIMER_OPTIONS = [
  { value: 0, label: 'إيقاف' },
  { value: 5, label: '٥ دقائق' },
  { value: 10, label: '١٠ دقائق' },
  { value: 15, label: '١٥ دقيقة' },
  { value: 30, label: '٣٠ دقيقة' },
  { value: 45, label: '٤٥ دقيقة' },
  { value: 60, label: 'ساعة' },
  { value: 90, label: 'ساعة ونصف' },
  { value: 120, label: 'ساعتان' },
];

// Repeat count options
const REPEAT_COUNT_OPTIONS = [
  { value: 1, label: 'مرة واحدة' },
  { value: 2, label: 'مرتان' },
  { value: 3, label: '٣ مرات' },
  { value: 5, label: '٥ مرات' },
  { value: 7, label: '٧ مرات' },
  { value: 10, label: '١٠ مرات' },
  { value: 0, label: 'غير محدود' },
];

export function AudioPlayerBar() {
  const {
    currentVerse,
    currentSurah,
    verses,
    surahs,
    setCurrentVerse,
    setCurrentSurah,
    reciters,
    selectedReciter,
    setReciters,
    setSelectedReciter,
    currentAudioUrl,
    setCurrentAudioUrl,
    isAudioPlaying,
    setIsAudioPlaying,
    audioProgress,
    setAudioProgress,
    audioDuration,
    setAudioDuration,
    audioVolume,
    setAudioVolume,
    isAudioMuted,
    setIsAudioMuted,
    isLoadingAudio,
    setIsLoadingAudio,
    isDarkMode,
    autoPlayEnabled,
    repeatMode,
    repeatCount,
    currentRepeatCount,
    sleepTimerEndTime,
    playBismillah,
    setAutoPlayEnabled,
    setRepeatMode,
    setRepeatCount,
    setCurrentRepeatCount,
    setSleepTimerMinutes,
    toggleAutoPlay,
    cycleRepeatMode,
    setIsPlayingBismillah,
    togglePlayBismillah,
  } = useQuranStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const isRepeatNavigationRef = useRef(false);
  const [showExpanded, setShowExpanded] = useState(false);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  
  // Bismillah state - using refs for synchronous access
  const bismillahAudioUrlRef = useRef<string>('');
  const pendingSurahNumberRef = useRef<number | null>(null);
  const isPlayingBismillahRef = useRef(false);
  const lastBismillahSurahRef = useRef<number | null>(null);

  // Fetch reciters on mount
  useEffect(() => {
    const fetchReciters = async () => {
      try {
        const response = await fetch('/api/reciters');
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setReciters(data.data);
          if (!selectedReciter) {
            setSelectedReciter(data.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching reciters:', error);
      }
    };
    fetchReciters();
  }, [setReciters, setSelectedReciter, selectedReciter]);

  // Fetch bismillah audio for the selected reciter
  useEffect(() => {
    const fetchBismillah = async () => {
      if (!selectedReciter) return;
      try {
        // Fetch the first verse of Al-Fatiha (verseGlobal=1) for the selected reciter
        const response = await fetch(`/api/recitations?verseGlobal=1&reciterId=${selectedReciter}`);
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          bismillahAudioUrlRef.current = data.data[0].audioUrl;
          console.log('Bismillah audio loaded for reciter:', selectedReciter, data.data[0].audioUrl);
        } else {
          bismillahAudioUrlRef.current = '';
          console.log('No bismillah audio found for reciter:', selectedReciter);
        }
      } catch (error) {
        console.error('Error fetching bismillah audio:', error);
        bismillahAudioUrlRef.current = '';
      }
    };
    fetchBismillah();
  }, [selectedReciter]);

  // Fetch audio when verse changes
  useEffect(() => {
    const fetchAudio = async () => {
      if (!currentVerse || !selectedReciter) return;
      
      const surahNumber = currentSurah?.number;
      const isFirstVerse = currentVerse.numberInSurah === 1;
      const isAtTawbah = surahNumber === 9;
      
      // If we're currently playing bismillah and the surah changed
      if (isPlayingBismillahRef.current && pendingSurahNumberRef.current !== null) {
        const previousSurahNumber = pendingSurahNumberRef.current;
        
        // Check if surah changed while playing bismillah
        if (previousSurahNumber !== surahNumber && isFirstVerse && !isAtTawbah && bismillahAudioUrlRef.current) {
          // Surah changed - update the pending surah number
          lastBismillahSurahRef.current = surahNumber || null;
          pendingSurahNumberRef.current = surahNumber || null;
          
          // Restart bismillah from beginning by resetting audio
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
          }
          return;
        }
        // Same surah, skip
        return;
      }
      
      // Check if we should play bismillah first
      if (playBismillah && isFirstVerse && !isAtTawbah && lastBismillahSurahRef.current !== surahNumber && bismillahAudioUrlRef.current) {
        // Mark this surah
        lastBismillahSurahRef.current = surahNumber || null;
        
        // Set bismillah playing state
        isPlayingBismillahRef.current = true;
        setIsPlayingBismillah(true);
        
        // Store pending surah number
        pendingSurahNumberRef.current = surahNumber || null;
        
        // Play bismillah
        setCurrentAudioUrl(bismillahAudioUrlRef.current);
        setIsLoadingAudio(false);
        return;
      }
      
      // Update last surah for non-bismillah cases
      if (surahNumber && !isFirstVerse) {
        lastBismillahSurahRef.current = null;
      }
      
      // Fetch regular verse audio
      setIsLoadingAudio(true);
      try {
        const response = await fetch(
          `/api/recitations?verseGlobal=${currentVerse.numberGlobal}&reciterId=${selectedReciter}`
        );
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
          setCurrentAudioUrl(data.data[0].audioUrl);
        } else {
          setCurrentAudioUrl('');
        }
      } catch (error) {
        console.error('Error fetching audio:', error);
        setCurrentAudioUrl('');
      } finally {
        setIsLoadingAudio(false);
      }
    };
    fetchAudio();
  }, [currentVerse, selectedReciter, currentSurah, playBismillah, setCurrentAudioUrl, setIsLoadingAudio, setIsPlayingBismillah]);

  // Auto-play flag
  const shouldAutoPlay = autoPlayEnabled || repeatMode !== 'off';

  // Sleep timer countdown
  useEffect(() => {
    if (!sleepTimerEndTime) {
      setSleepTimerRemaining(null);
      return;
    }

    const updateRemaining = () => {
      const remaining = sleepTimerEndTime - Date.now();
      if (remaining <= 0) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsAudioPlaying(false);
        setSleepTimerMinutes(0);
        setSleepTimerRemaining(null);
      } else {
        setSleepTimerRemaining(Math.ceil(remaining / 1000));
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEndTime, setIsAudioPlaying, setSleepTimerMinutes]);

  // Auto-play when audio URL changes - BUT NOT during bismillah
  useEffect(() => {
    // Don't auto-play if we're playing bismillah - it will play manually
    if (isPlayingBismillahRef.current) return;
    
    if (shouldAutoPlay && currentAudioUrl && audioRef.current && !isLoadingAudio) {
      audioRef.current.play().catch(console.error);
    }
  }, [currentAudioUrl, shouldAutoPlay, isLoadingAudio]);

  // Reset repeat count when verse changes
  useEffect(() => {
    if (!isRepeatNavigationRef.current) {
      setCurrentRepeatCount(0);
    }
    isRepeatNavigationRef.current = false;
  }, [currentVerse?.id, setCurrentRepeatCount]);

  // Audio playback functions
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !currentAudioUrl) return;
    
    if (isAudioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  }, [isAudioPlaying, currentAudioUrl]);

  const playNextVerse = useCallback(() => {
    if (!currentVerse || !verses.length) return;
    const currentIndex = verses.findIndex(v => v.id === currentVerse.id);
    
    if (currentIndex < verses.length - 1) {
      setCurrentVerse(verses[currentIndex + 1]);
    } else {
      const currentSurahIndex = surahs.findIndex(s => s.id === currentSurah?.id);
      if (currentSurahIndex < surahs.length - 1) {
        setCurrentSurah(surahs[currentSurahIndex + 1]);
      } else {
        setIsAudioPlaying(false);
      }
    }
  }, [currentVerse, verses, setCurrentVerse, surahs, currentSurah, setCurrentSurah, setIsAudioPlaying]);

  const playPreviousVerse = useCallback(() => {
    if (!currentVerse || !verses.length) return;
    const currentIndex = verses.findIndex(v => v.id === currentVerse.id);
    if (currentIndex > 0) {
      setCurrentVerse(verses[currentIndex - 1]);
    }
  }, [currentVerse, verses, setCurrentVerse]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setAudioProgress(audioRef.current.currentTime);
    }
  }, [setAudioProgress]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
      // Auto-play bismillah when it loads
      if (isPlayingBismillahRef.current) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [setAudioDuration]);

  const handleSeek = useCallback((value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setAudioProgress(value[0]);
    }
  }, [setAudioProgress]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setAudioVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsAudioMuted(newVolume === 0);
  }, [setAudioVolume, setIsAudioMuted]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isAudioMuted) {
        audioRef.current.volume = audioVolume || 1;
        setIsAudioMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsAudioMuted(true);
      }
    }
  }, [isAudioMuted, audioVolume, setIsAudioMuted]);

  const handleAudioEnded = useCallback(async () => {
    // Check sleep timer first
    if (sleepTimerEndTime && Date.now() >= sleepTimerEndTime) {
      setIsAudioPlaying(false);
      return;
    }

    // If we just finished playing bismillah, fetch and play the actual verse
    if (isPlayingBismillahRef.current && pendingSurahNumberRef.current !== null && selectedReciter) {
      isPlayingBismillahRef.current = false;
      setIsPlayingBismillah(false);
      
      const pendingSurahNumber = pendingSurahNumberRef.current;
      pendingSurahNumberRef.current = null;
      
      setIsLoadingAudio(true);
      try {
        // Find the first verse of the pending surah
        const surah = surahs.find(s => s.number === pendingSurahNumber);
        if (surah) {
          // Get verses for this surah to find the first verse's numberGlobal
          const versesResponse = await fetch(`/api/ayah?surahId=${surah.id}&limit=1`);
          const versesData = await versesResponse.json();
          
          if (versesData.success && versesData.data.length > 0) {
            const firstVerse = versesData.data[0];
            
            // Fetch audio for the first verse
            const response = await fetch(
              `/api/recitations?verseGlobal=${firstVerse.numberGlobal}&reciterId=${selectedReciter}`
            );
            const data = await response.json();
            if (data.success && data.data.length > 0) {
              setCurrentAudioUrl(data.data[0].audioUrl);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching verse audio after bismillah:', error);
      } finally {
        setIsLoadingAudio(false);
      }
      return;
    }

    // Calculate next repeat count
    const nextRepeatCount = currentRepeatCount + 1;

    // Handle verse repeat mode
    if (repeatMode === 'verse') {
      const maxReached = repeatCount > 0 && nextRepeatCount >= repeatCount;
      
      if (!maxReached) {
        setCurrentRepeatCount(nextRepeatCount);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(console.error);
        }
        return;
      }
      setCurrentRepeatCount(0);
    }

    // Handle surah repeat mode
    if (repeatMode === 'surah' && currentVerse && verses.length > 0) {
      const currentIndex = verses.findIndex(v => v.id === currentVerse.id);
      
      if (currentIndex === verses.length - 1) {
        const maxReached = repeatCount > 0 && nextRepeatCount >= repeatCount;
        
        if (!maxReached) {
          setCurrentRepeatCount(nextRepeatCount);
          isRepeatNavigationRef.current = true;
          lastBismillahSurahRef.current = null; // Reset to play bismillah again
          setCurrentVerse(verses[0]);
          return;
        }
        setCurrentRepeatCount(0);
      }
    }

    // Move to next verse
    if (repeatMode !== 'off' || autoPlayEnabled) {
      playNextVerse();
    }
  }, [
    repeatMode, 
    repeatCount, 
    currentRepeatCount, 
    setCurrentRepeatCount, 
    playNextVerse,
    autoPlayEnabled,
    currentVerse,
    verses,
    setCurrentVerse,
    sleepTimerEndTime,
    setIsAudioPlaying,
    selectedReciter,
    setCurrentAudioUrl,
    setIsLoadingAudio,
    setIsPlayingBismillah,
    surahs,
  ]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format remaining sleep time
  const formatSleepTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get repeat mode icon and label
  const getRepeatInfo = () => {
    switch (repeatMode) {
      case 'verse':
        return { icon: Repeat1, label: 'تكرار الآية' };
      case 'surah':
        return { icon: Repeat, label: 'تكرار السورة' };
      default:
        return { icon: Repeat, label: 'بدون تكرار' };
    }
  };

  const RepeatIcon = getRepeatInfo().icon;

  return (
    <div className={`${isDarkMode ? 'bg-slate-700/50' : 'bg-black/10'}`}>
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={currentAudioUrl || undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        onPlay={() => setIsAudioPlaying(true)}
        onPause={() => setIsAudioPlaying(false)}
      />
      
      {/* Main Player Row */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        {/* Reciter Selection */}
        <Select value={selectedReciter} onValueChange={setSelectedReciter}>
          <SelectTrigger className="h-7 text-xs w-24 bg-transparent border-white/20 text-white/90">
            <SelectValue placeholder="القارئ" />
          </SelectTrigger>
          <SelectContent>
            {reciters.map((reciter) => (
              <SelectItem key={reciter.id} value={reciter.id} className="text-xs">
                {reciter.nameArabic}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Play Controls */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            onClick={playPreviousVerse}
          >
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button
            className="h-8 w-8 rounded-full bg-white text-[#1a5f4a] hover:bg-white/90 shadow-md disabled:opacity-50"
            onClick={togglePlayPause}
            disabled={!currentAudioUrl || isLoadingAudio}
            size="icon"
          >
            {isLoadingAudio ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isAudioPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            onClick={playNextVerse}
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {audioDuration > 0 && (
            <>
              <span className="text-[10px] text-white/50 w-8 text-right font-mono">
                {formatTime(audioProgress)}
              </span>
              <Slider
                value={[audioProgress]}
                max={audioDuration}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1 min-w-0"
              />
              <span className="text-[10px] text-white/50 w-8 font-mono">
                {formatTime(audioDuration)}
              </span>
            </>
          )}
        </div>
        
        {/* Volume */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            onClick={toggleMute}
          >
            {isAudioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </Button>
          <Slider
            value={[isAudioMuted ? 0 : audioVolume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-14"
          />
        </div>
        
        {/* Advanced Controls */}
        <div className="flex items-center gap-0.5">
          {/* Auto-play Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 text-white/70 hover:text-white hover:bg-white/10",
              autoPlayEnabled && "text-green-400"
            )}
            onClick={toggleAutoPlay}
            title={autoPlayEnabled ? 'إيقاف التشغيل التلقائي' : 'تشغيل تلقائي'}
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
          
          {/* Repeat Mode */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 text-white/70 hover:text-white hover:bg-white/10",
              repeatMode !== 'off' && "text-amber-400"
            )}
            onClick={cycleRepeatMode}
            title={getRepeatInfo().label}
          >
            <RepeatIcon className="h-3.5 w-3.5" />
          </Button>
          
          {/* Bismillah Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 text-white/70 hover:text-white hover:bg-white/10",
              playBismillah && "text-emerald-400"
            )}
            onClick={togglePlayBismillah}
            title={playBismillah ? 'إيقاف البسملة' : 'تشغيل البسملة'}
          >
            <span className="text-[9px] font-bold">بسملة</span>
          </Button>
          
          {/* Sleep Timer */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 text-white/70 hover:text-white hover:bg-white/10",
                  sleepTimerEndTime !== null && "text-blue-400"
                )}
              >
                <Clock className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <div className="text-xs font-medium mb-2 text-center">مؤقت النوم</div>
              <div className="grid grid-cols-2 gap-1">
                {SLEEP_TIMER_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={sleepTimerEndTime === (option.value > 0 ? 1 : null) ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSleepTimerMinutes(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {sleepTimerRemaining !== null && (
                <div className="mt-2 text-center text-xs text-muted-foreground">
                  متبقي: {formatSleepTime(sleepTimerRemaining)}
                </div>
              )}
            </PopoverContent>
          </Popover>
          
          {/* Expand/Collapse */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setShowExpanded(!showExpanded)}
          >
            {showExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      
      {/* Expanded Controls Row */}
      {showExpanded && (
        <div className="flex items-center justify-center gap-4 px-4 py-2 border-t border-white/10">
          {/* Repeat Count Selection */}
          {repeatMode !== 'off' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/70">عدد التكرارات:</span>
              <Select value={repeatCount.toString()} onValueChange={(v) => setRepeatCount(parseInt(v))}>
                <SelectTrigger className="h-6 text-xs w-24 bg-transparent border-white/20 text-white/90">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPEAT_COUNT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Current Repeat Count */}
          {repeatMode === 'verse' && repeatCount > 0 && (
            <div className="text-[10px] text-white/70">
              التكرار: {toArabicNumber(currentRepeatCount + 1)} / {toArabicNumber(repeatCount)}
            </div>
          )}
          
          {/* Verse Info */}
          <div className="text-white/70 text-xs text-center">
            <span>
              {currentSurah?.nameArabic} • آية {toArabicNumber(currentVerse?.numberInSurah || 1)}
            </span>
            {autoPlayEnabled && <span className="text-green-400 mr-2">• تشغيل تلقائي</span>}
            {sleepTimerEndTime !== null && sleepTimerRemaining !== null && (
              <span className="text-blue-400 mr-2">• {formatSleepTime(sleepTimerRemaining)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
