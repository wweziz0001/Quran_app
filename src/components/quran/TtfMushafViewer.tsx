'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Arabic numeral converter
const toArabicNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) return '';
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
};

interface TtfWord {
  id: string;
  text: string;
  discriminator: number;
  wordNumber: number;
  ayahNumber: number;
  surahNumber: number;
  ayahId: string;
}

interface TtfLine {
  lineNumber: number;
  words: TtfWord[];
}

interface TtfPageData {
  edition: {
    id: string;
    name: string;
    type: string;
  };
  page: {
    number: number;
    fontUrl: string | null;
    totalAyat: number;
    surahs: Array<{ number: number; name: string }>;
  };
  lines: TtfLine[];
  ayat: Array<{
    id: string;
    ayahId: number;
    surahNumber: number;
    ayahNumber: number;
    quarter: number | null;
    wordCount: number;
  }>;
}

interface TtfMushafViewerProps {
  pageNumber: number;
  editionId: string;
  isDark: boolean;
  onAyahSelect?: (surahNumber: number, ayahNumber: number) => void;
  selectedAyah?: { surahNumber: number; ayahNumber: number } | null;
}

export function TtfMushafViewer({
  pageNumber,
  editionId,
  isDark,
  onAyahSelect,
  selectedAyah,
}: TtfMushafViewerProps) {
  const [pageData, setPageData] = useState<TtfPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontLoaded, setFontLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Font face name for this page
  const fontName = `MushafPage${pageNumber}`;

  // Fetch page data
  useEffect(() => {
    const fetchPageData = async () => {
      if (!editionId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/mushaf/ttf-page?editionId=${editionId}&page=${pageNumber}`);
        const data = await response.json();
        
        if (response.ok) {
          setPageData(data);
        } else {
          setError(data.error || 'Failed to load page data');
        }
      } catch (err) {
        setError('Error loading page data');
        console.error('Error fetching TTF page:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPageData();
  }, [editionId, pageNumber]);

  // Load TTF font dynamically
  useEffect(() => {
    if (!pageData?.page?.fontUrl) {
      setFontLoaded(false);
      return;
    }

    // Create a unique font face for this page
    const fontFace = new FontFace(fontName, `url(${pageData.page.fontUrl})`);
    
    fontFace.load().then((loadedFont) => {
      // Add to document fonts
      document.fonts.add(loadedFont);
      setFontLoaded(true);
    }).catch((err) => {
      console.error('Failed to load font:', err);
      setFontLoaded(false);
    });

    return () => {
      // Clean up: remove font when component unmounts or page changes
      // Note: document.fonts.delete() doesn't exist, so we just let it be
    };
  }, [pageData?.page?.fontUrl, fontName]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-[80vh] ${isDark ? 'text-amber-400' : 'text-emerald-700'}`}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">جاري تحميل الصفحة...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-20 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
        <p className="text-xl mb-4">خطأ في تحميل البيانات</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className={`text-center py-20 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        <p>لا توجد بيانات للصفحة</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`
        w-full max-w-4xl mx-auto
        ${isDark 
          ? 'bg-gradient-to-b from-slate-800 to-slate-900 border border-amber-500/20' 
          : 'bg-gradient-to-b from-amber-50 to-white border-2 border-amber-200'
        }
        rounded-2xl shadow-2xl overflow-hidden
      `}
      dir="rtl"
    >
      {/* Page Header */}
      <div className={`
        py-3 px-4 text-center border-b
        ${isDark 
          ? 'bg-slate-700/50 border-amber-500/20 text-amber-400' 
          : 'bg-amber-100/50 border-amber-200 text-emerald-700'
        }
      `}>
        <div className="flex items-center justify-between">
          <span className="text-sm">صفحة {toArabicNumber(pageNumber)}</span>
          <span className="text-sm">
            {pageData.page.surahs.map(s => s.name).join(' - ')}
          </span>
        </div>
      </div>

      {/* Page Content - TTF Text */}
      <div className="p-8 min-h-[70vh]">
        {pageData.lines.length === 0 ? (
          <div className={`text-center py-20 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            <p>لا توجد بيانات للصفحة</p>
            <p className="text-xs mt-2">تأكد من استيراد بيانات قاعدة البيانات</p>
          </div>
        ) : (
          <div 
            className="text-center leading-loose"
            style={{
              fontFamily: fontLoaded ? `'${fontName}', 'Scheherazade New', 'Amiri', serif` : "'Scheherazade New', 'Amiri', serif",
              fontSize: '36px',
              lineHeight: '2.5',
            }}
          >
            {pageData.lines.map((line) => (
              <div 
                key={line.lineNumber}
                className={`
                  py-1 flex flex-wrap justify-center items-center gap-1
                  hover:bg-opacity-10 hover:bg-emerald-500
                  transition-colors duration-150
                `}
              >
                {line.words.map((word, idx) => {
                  const isSelected = selectedAyah && 
                    selectedAyah.surahNumber === word.surahNumber && 
                    selectedAyah.ayahNumber === word.ayahNumber;
                  
                  // Discriminator values: 0=normal word, 7=surah name, 8=quarter marker, 11=ayah end
                  const isSurahName = word.discriminator === 7;
                  const isQuarterMarker = word.discriminator === 8;
                  const isAyahEnd = word.discriminator === 11 || word.wordNumber === 999;
                  
                  return (
                    <span
                      key={`${word.id}-${idx}`}
                      className={`
                        inline-block cursor-pointer transition-all duration-200
                        ${isSelected 
                          ? isDark 
                            ? 'bg-amber-500/30 rounded px-1' 
                            : 'bg-emerald-400/30 rounded px-1'
                          : 'hover:bg-opacity-20 hover:bg-emerald-500 rounded'
                        }
                        ${isSurahName ? 'text-amber-500 font-bold text-2xl' : ''}
                        ${isQuarterMarker ? 'text-emerald-500 text-sm mx-2' : ''}
                        ${isAyahEnd ? 'text-amber-600 mx-1' : ''}
                      `}
                      onClick={() => {
                        if (!isAyahEnd && !isQuarterMarker && !isSurahName) {
                          onAyahSelect?.(word.surahNumber, word.ayahNumber);
                        }
                      }}
                    >
                      {isAyahEnd ? (
                        <span className="inline-flex items-center justify-center mx-1">
                          <span 
                            className={`
                              w-8 h-8 rounded-full flex items-center justify-center
                              text-sm font-bold
                              ${isDark 
                                ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' 
                                : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                              }
                            `}
                          >
                            {toArabicNumber(word.ayahNumber)}
                          </span>
                        </span>
                      ) : (
                        word.text
                      )}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Page Footer */}
      <div className={`
        py-2 px-4 text-center border-t
        ${isDark 
          ? 'bg-slate-700/50 border-amber-500/20 text-slate-400' 
          : 'bg-amber-100/50 border-amber-200 text-gray-500'
        }
      `}>
        <span className="text-xs">
          عدد الآيات: {toArabicNumber(pageData.page.totalAyat)}
        </span>
      </div>
    </div>
  );
}
