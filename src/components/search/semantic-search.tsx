'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { useQuranStore } from '@/stores/quran-store';
import type { Verse, Surah } from '@/types/quran';

interface SearchResult {
  verse: Verse;
  score: number;
  highlights?: string[];
}

// Arabic numeral converter
const toArabicNumber = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
};

export function SemanticSearch() {
  const { setCurrentSurah, setCurrentVerse, isDarkMode } = useQuranStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Perform search
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), limit: 20 }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError('Failed to perform search');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle result selection
  const handleResultSelect = (result: SearchResult) => {
    if (result.verse.surah) {
      setCurrentSurah(result.verse.surah as Surah);
    }
    setCurrentVerse(result.verse);
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-slate-900' : 'bg-[#faf7f0]'}`}>
      {/* Search Header */}
      <div className={`p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-emerald-200'}`}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
            <Input
              placeholder="ابحث في القرآن الكريم..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`pr-9 ${isDarkMode ? 'bg-slate-800 border-slate-600' : ''}`}
              dir="rtl"
            />
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={isLoading || !query.trim()}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'بحث'
            )}
          </Button>
        </div>

        {/* Search Tips */}
        <div className={`mt-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          <span>أمثلة: </span>
          <span className={`${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>"الحمد لله"، "الصلاة"، "الجنة"</span>
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className={`h-8 w-8 animate-spin ${isDarkMode ? 'text-amber-400' : 'text-emerald-600'}`} />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className={`text-center py-12 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">حدث خطأ</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && !hasSearched && (
            <div className="text-center py-12">
              <Search className={`h-16 w-16 mx-auto mb-4 ${isDarkMode ? 'text-slate-700' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                البحث في القرآن الكريم
              </h3>
              <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                أدخل كلمة أو عبارة للبحث
              </p>
            </div>
          )}

          {/* No Results */}
          {!isLoading && !error && hasSearched && results.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className={`h-16 w-16 mx-auto mb-4 ${isDarkMode ? 'text-slate-700' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                لم يتم العثور على نتائج
              </h3>
              <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                جرب البحث بكلمات مختلفة
              </p>
            </div>
          )}

          {/* Results List */}
          {!isLoading && !error && results.length > 0 && (
            <div className="space-y-3">
              <div className={`flex items-center justify-between mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                <span className="text-sm">
                  {results.length} نتيجة
                </span>
              </div>

              {results.map((result, index) => (
                <Card
                  key={`${result.verse.id}-${index}`}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isDarkMode 
                      ? 'bg-slate-800 border-slate-700 hover:border-amber-500/50' 
                      : 'bg-white border-emerald-100 hover:border-emerald-300'
                  }`}
                  onClick={() => handleResultSelect(result)}
                >
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {result.verse.surah?.nameEnglish || `Surah ${result.verse.surahId}`}
                        </Badge>
                        <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                          آية {toArabicNumber(result.verse.numberInSurah)}
                        </span>
                      </div>
                      {result.score < 1 && (
                        <Badge variant="secondary" className="text-xs">
                          مطابقة {Math.round(result.score * 100)}%
                        </Badge>
                      )}
                    </div>

                    {/* Arabic Text */}
                    <p
                      className="text-right text-lg leading-loose mb-2"
                      dir="rtl"
                      style={{
                        fontFamily: "'Scheherazade New', 'Amiri', serif",
                        fontSize: '18px',
                        lineHeight: '2'
                      }}
                    >
                      {result.verse.textArabic}
                    </p>

                    {/* Translation (if available) */}
                    {result.verse.translation && (
                      <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                        {result.verse.translation.text}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
