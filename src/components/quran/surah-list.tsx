'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen, Loader2, Star, Sparkles } from 'lucide-react';
import { useQuranStore } from '@/stores/quran-store';
import type { Surah } from '@/types/quran';

// Arabic numeral converter
const toArabicNumber = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
};

// Luxurious Surah Card
const SurahCard = ({ 
  surah, 
  isSelected, 
  onClick,
  isDark 
}: { 
  surah: Surah; 
  isSelected: boolean;
  onClick: () => void;
  isDark: boolean;
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 rounded-2xl transition-all duration-300
        flex items-center gap-4 relative overflow-hidden group
        ${isSelected 
          ? isDark
            ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40'
            : 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-400/40'
          : isDark
            ? 'hover:bg-slate-700/50 border border-transparent hover:border-amber-500/20'
            : 'hover:bg-emerald-50/50 border border-transparent hover:border-emerald-200/50'
        }
      `}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className={`
          absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full
          ${isDark ? 'bg-gradient-to-b from-amber-400 to-amber-600' : 'bg-gradient-to-b from-emerald-400 to-teal-500'}
        `} />
      )}

      {/* Surah Number */}
      <div className={`
        relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0
        transition-all duration-300 group-hover:scale-105
        ${isSelected 
          ? isDark
            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 shadow-lg shadow-amber-500/30'
            : 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
          : isDark
            ? 'bg-slate-700/80 text-slate-300 border border-amber-500/20'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }
      `}
      style={{
        boxShadow: isSelected
          ? isDark
            ? '0 0 20px rgba(217, 119, 6, 0.3)'
            : '0 0 20px rgba(5, 150, 105, 0.2)'
          : 'none'
      }}
      >
        <span className="text-sm font-bold">{toArabicNumber(surah.number)}</span>
        {/* Decorative corner */}
        <div className={`
          absolute -top-1 -right-1 w-3 h-3 rotate-45
          ${isSelected ? 'bg-white/30' : isDark ? 'bg-amber-500/20' : 'bg-emerald-300/50'}
        `} />
      </div>

      {/* Surah Info */}
      <div className="flex-1 min-w-0" dir="rtl">
        <div className="flex items-center justify-between gap-2">
          <span 
            className="font-bold text-lg truncate"
            style={{ fontFamily: "'Scheherazade New', 'Amiri', serif" }}
          >
            {surah.nameArabic}
          </span>
          <span className={`text-xs ${isSelected ? (isDark ? 'text-amber-300' : 'text-emerald-600') : 'text-muted-foreground'}`}>
            {toArabicNumber(surah.totalAyahs)} آية
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-xs ${isSelected ? (isDark ? 'text-amber-300/80' : 'text-emerald-600/80') : 'text-muted-foreground'}`}>
            {surah.nameEnglish}
          </span>
          <Badge 
            className={`
              text-[10px] px-2 py-0.5 h-5 rounded-full
              ${isSelected 
                ? isDark
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : isDark
                  ? 'bg-slate-600/50 text-slate-400 border-slate-500/30'
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              }
            `}
          >
            {surah.revelationType === 'meccan' ? 'مكية' : 'مدنية'}
          </Badge>
        </div>
      </div>

      {/* Sparkle icon for selected */}
      {isSelected && (
        <Sparkles className={`
          absolute right-2 top-2 h-4 w-4
          ${isDark ? 'text-amber-400' : 'text-emerald-500'}
          animate-pulse
        `} />
      )}
    </button>
  );
};

export function SurahList() {
  const { currentSurah, setCurrentSurah, isDarkMode } = useQuranStore();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        const response = await fetch('/api/surahs');
        const data = await response.json();
        if (data.success) {
          setSurahs(data.data);
        }
      } catch (error) {
        console.error('Error fetching surahs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSurahs();
  }, []);

  const filteredSurahs = surahs.filter(surah => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      surah.nameArabic.includes(searchQuery) ||
      surah.nameEnglish.toLowerCase().includes(query) ||
      surah.nameTransliteration.toLowerCase().includes(query) ||
      surah.number.toString() === searchQuery
    );
  });

  const handleSurahSelect = (surah: Surah) => {
    setCurrentSurah(surah);
  };

  return (
    <div 
      className={`
        h-full flex flex-col
        ${isDarkMode 
          ? 'bg-gradient-to-b from-slate-800 to-slate-900' 
          : 'bg-gradient-to-b from-white to-emerald-50/30'
        }
      `}
      dir="rtl"
    >
      {/* Header */}
      <div className={`
        shrink-0 p-4 border-b
        ${isDarkMode ? 'border-amber-500/20' : 'border-emerald-200'}
      `}>
        {/* Search */}
        <div className="relative">
          <Search className={`
            absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4
            ${isDarkMode ? 'text-amber-500/50' : 'text-emerald-500/50'}
          `} />
          <Input
            placeholder="بحث عن سورة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`
              pr-10 h-11 text-sm rounded-xl
              ${isDarkMode 
                ? 'bg-slate-700/50 border-amber-500/20 text-white placeholder:text-slate-400' 
                : 'bg-emerald-50/50 border-emerald-200 text-gray-900 placeholder:text-gray-400'
              }
            `}
            dir="rtl"
          />
        </div>
        
        {/* Stats */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <BookOpen className={`h-4 w-4 ${isDarkMode ? 'text-amber-500' : 'text-emerald-500'}`} />
            <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
              {filteredSurahs.length} سورة
            </span>
          </div>
          <div className={`
            px-3 py-1 rounded-full text-xs font-bold
            ${isDarkMode 
              ? 'bg-amber-500/20 text-amber-400' 
              : 'bg-emerald-100 text-emerald-700'
            }
          `}>
            ١١٤
          </div>
        </div>
      </div>

      {/* Surah List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className={`h-8 w-8 animate-spin ${isDarkMode ? 'text-amber-500' : 'text-emerald-500'}`} />
            </div>
          ) : (
            filteredSurahs.map((surah) => (
              <SurahCard
                key={surah.id}
                surah={surah}
                isSelected={currentSurah?.id === surah.id}
                onClick={() => handleSurahSelect(surah)}
                isDark={isDarkMode}
              />
            ))
          )}

          {!isLoading && filteredSurahs.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className={`h-12 w-12 mx-auto mb-3 opacity-40 ${isDarkMode ? 'text-amber-500' : 'text-emerald-500'}`} />
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                لم يتم العثور على نتائج
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default SurahList;
