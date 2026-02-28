'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BookOpen, 
  Loader2,
  FileText
} from 'lucide-react';
import { useQuranStore } from '@/stores/quran-store';
import { AudioPlayerBar } from '@/components/audio/audio-player-bar';
import type { TafsirSource, TafsirEntry } from '@/types/quran';

// Arabic numeral converter
const toArabicNumber = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
};

export function TafsirPanel() {
  const { currentSurah, currentVerse, isDarkMode } = useQuranStore();
  const [tafsirSources, setTafsirSources] = useState<TafsirSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [tafsirEntries, setTafsirEntries] = useState<TafsirEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch tafsir sources
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await fetch('/api/tafsir?all=true');
        const data = await response.json();
        if (data.success) {
          setTafsirSources(data.data);
          const defaultSource = data.data.find((s: TafsirSource) => s.isDefault) || data.data[0];
          if (defaultSource) {
            setSelectedSource(defaultSource.id);
          }
        }
      } catch (error) {
        console.error('Error fetching tafsir sources:', error);
      }
    };
    fetchSources();
  }, []);

  // Fetch tafsir for current verse
  useEffect(() => {
    const fetchTafsir = async () => {
      if (!currentVerse || !selectedSource) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/tafsir?ayahId=${currentVerse.id}&source=${selectedSource}`
        );
        const data = await response.json();
        if (data.success) {
          setTafsirEntries(data.data);
        }
      } catch (error) {
        console.error('Error fetching tafsir:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTafsir();
  }, [currentVerse, selectedSource]);

  const currentTafsir = tafsirEntries[0];

  return (
    <div className="h-full flex flex-col">
      {/* Audio Player Bar - At the top */}
      <AudioPlayerBar />

      {/* Header */}
      <div className={`p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-emerald-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className={`h-5 w-5 ${isDarkMode ? 'text-amber-400' : 'text-emerald-600'}`} />
            <h2 className="font-bold text-lg" style={{ fontFamily: "'Amiri', serif" }}>
              التفسير
            </h2>
          </div>
          
          {/* Tafsir Source Selector */}
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className={`w-36 h-8 text-xs ${isDarkMode ? 'bg-slate-700 border-slate-600' : ''}`}>
              <SelectValue placeholder="اختر التفسير" />
            </SelectTrigger>
            <SelectContent>
              {tafsirSources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.nameArabic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current Verse Info */}
        {currentVerse && currentSurah && (
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-emerald-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-xs">
                {currentSurah.nameEnglish} - آية {toArabicNumber(currentVerse.numberInSurah)}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                الجزء {toArabicNumber(currentVerse.juzNumber)}
              </Badge>
            </div>
            <p 
              className="text-right text-lg leading-loose"
              dir="rtl"
              style={{ 
                fontFamily: "'Scheherazade New', 'Amiri', serif",
                fontSize: '20px'
              }}
            >
              {currentVerse.textArabic}
            </p>
          </div>
        )}
      </div>

      {/* Tafsir Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : currentTafsir ? (
            <div className="space-y-4">
              {/* Tafsir Source Info */}
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-700/30' : 'bg-amber-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className={`h-4 w-4 ${isDarkMode ? 'text-amber-400' : 'text-emerald-600'}`} />
                  <span className="font-medium text-sm" style={{ fontFamily: "'Amiri', serif" }}>
                    {tafsirSources.find(s => s.id === selectedSource)?.nameArabic}
                  </span>
                </div>
                {tafsirSources.find(s => s.id === selectedSource)?.authorArabic && (
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    المؤلف: {tafsirSources.find(s => s.id === selectedSource)?.authorArabic}
                  </p>
                )}
              </div>

              {/* Tafsir Text */}
              <div 
                className="text-right leading-loose"
                dir="rtl"
                style={{ 
                  fontFamily: "'Amiri', serif",
                  fontSize: '18px',
                  lineHeight: '2'
                }}
              >
                {currentTafsir.textArabic ? (
                  <p className="whitespace-pre-wrap">{currentTafsir.textArabic}</p>
                ) : currentTafsir.textTranslation ? (
                  <p className="whitespace-pre-wrap">{currentTafsir.textTranslation}</p>
                ) : (
                  <p className="text-muted-foreground">لا يوجد تفسير لهذه الآية</p>
                )}
              </div>
            </div>
          ) : currentVerse ? (
            <div className="text-center py-8">
              <FileText className={`h-12 w-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                لا يوجد تفسير متاح
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                جرب اختيار مصدر تفسير آخر
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className={`h-12 w-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                اختر آية لعرض التفسير
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
