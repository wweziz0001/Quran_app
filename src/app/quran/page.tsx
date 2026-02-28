'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Search, 
  FileText, 
  RefreshCw,
  Loader2,
  Moon,
  Sun,
  Menu,
  X,
  Sparkles,
  Star
} from 'lucide-react';
import { MushafViewer } from '@/components/quran/mushaf-viewer';
import { SurahList } from '@/components/quran/surah-list';
import { SemanticSearch } from '@/components/search/semantic-search';
import { TafsirPanel } from '@/components/tafsir/tafsir-panel';
import { useQuranStore } from '@/stores/quran-store';
import type { Verse } from '@/types/quran';

export default function QuranApp() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeeded, setIsSeeded] = useState(false);
  const [activeMiddleTab, setActiveMiddleTab] = useState('mushaf');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const { isDarkMode, toggleDarkMode, setSurahs } = useQuranStore();
  
  const [selectedVerseInfo, setSelectedVerseInfo] = useState<{
    surahName: string;
    verseNumber: number;
    textArabic: string;
  } | null>(null);

  // Check if database is seeded
  useEffect(() => {
    const checkAndSeed = async () => {
      try {
        const response = await fetch('/api/surahs');
        const data = await response.json();
        
        if (data.success) {
          if (data.data.length > 0) {
            setSurahs(data.data);
          }
          
          if (data.data.length === 0) {
            setIsSeeding(true);
            const seedResponse = await fetch('/api/seed', { method: 'POST' });
            const seedData = await seedResponse.json();
            console.log('Seed result:', seedData);
            setIsSeeded(true);
            setIsSeeding(false);
          } else {
            setIsSeeded(true);
          }
        }
      } catch (error) {
        console.error('Error checking/seeding database:', error);
        setIsSeeding(false);
      }
    };

    checkAndSeed();
  }, [setSurahs]);

  const handleVerseSelect = useCallback((verse: Verse) => {
    setSelectedVerseInfo({
      surahName: verse.surah?.nameEnglish || '',
      verseNumber: verse.numberInSurah,
      textArabic: verse.textArabic,
    });
  }, []);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const toArabicNumber = (num: number): string => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
  };

  return (
    <div 
      className={`h-screen flex flex-col overflow-hidden transition-colors duration-500 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900' 
          : 'bg-gradient-to-br from-[#f8f4eb] via-[#fffef8] to-[#f5f0e5]'
      }`}
    >
      {/* Luxurious Header */}
      <header className={`
        shrink-0 relative overflow-hidden
        ${isDarkMode 
          ? 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800' 
          : 'bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800'
        } text-white
      `}>
        {/* Decorative pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
        
        {/* Gold accent line */}
        <div className={`
          absolute bottom-0 left-0 right-0 h-1
          ${isDarkMode ? 'bg-gradient-to-r from-transparent via-amber-500 to-transparent' : 'bg-gradient-to-r from-transparent via-amber-400 to-transparent'}
        `} />

        <div className="relative z-10 flex items-center justify-between px-4 py-3">
          {/* Left Side - Logo & Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white hover:bg-white/20 rounded-full lg:hidden"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-3">
              {/* Logo Icon */}
              <div className={`
                relative w-12 h-12 rounded-xl flex items-center justify-center
                ${isDarkMode 
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600' 
                  : 'bg-gradient-to-br from-white/30 to-white/10'
                }
              `}
              style={{
                boxShadow: isDarkMode 
                  ? '0 0 20px rgba(217, 119, 6, 0.4)' 
                  : '0 0 20px rgba(255,255,255,0.3)'
              }}
              >
                <BookOpen className="h-6 w-6 text-white" />
                <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-white animate-pulse" />
              </div>
              
              <div>
                <h1 
                  className="font-bold text-xl"
                  style={{ 
                    fontFamily: "'Scheherazade New', 'Amiri', serif",
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)'
                  }}
                >
                  القرآن الكريم
                </h1>
                <p className="text-xs text-white/70 hidden sm:block">
                  The Noble Quran
                </p>
              </div>
            </div>
          </div>

          {/* Center - Navigation Tabs */}
          <Tabs value={activeMiddleTab} onValueChange={setActiveMiddleTab} className="hidden md:block">
            <TabsList className={`
              bg-transparent h-12 gap-1 p-1
              ${isDarkMode ? 'border border-amber-500/20' : 'border border-white/20'}
              rounded-2xl
            `}>
              <TabsTrigger 
                value="mushaf" 
                className={`
                  gap-2 px-5 py-2 rounded-xl transition-all duration-300
                  data-[state=active]:bg-white/20 data-[state=active]:shadow-lg
                  ${isDarkMode 
                    ? 'data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400' 
                    : 'data-[state=active]:bg-white data-[state=active]:text-emerald-700'
                  }
                  text-white/80 hover:text-white
                `}
              >
                <BookOpen className="h-4 w-4" />
                <span className="font-medium">المصحف</span>
              </TabsTrigger>
              <TabsTrigger 
                value="search" 
                className={`
                  gap-2 px-5 py-2 rounded-xl transition-all duration-300
                  data-[state=active]:bg-white/20 data-[state=active]:shadow-lg
                  ${isDarkMode 
                    ? 'data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400' 
                    : 'data-[state=active]:bg-white data-[state=active]:text-emerald-700'
                  }
                  text-white/80 hover:text-white
                `}
              >
                <Search className="h-4 w-4" />
                <span className="font-medium">البحث</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Right Side - Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white hover:bg-white/20 rounded-full transition-all duration-300 hover:scale-110"
              onClick={toggleDarkMode}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white hover:bg-white/20 rounded-full transition-all duration-300 hover:scale-110"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-white/10 relative z-10">
          <Tabs value={activeMiddleTab} onValueChange={setActiveMiddleTab} className="w-full">
            <TabsList className="w-full justify-center bg-transparent h-14 gap-1 p-1">
              <TabsTrigger 
                value="mushaf" 
                className="flex-1 gap-2 py-2 rounded-xl text-white/80 data-[state=active]:bg-white/20"
              >
                <BookOpen className="h-4 w-4" />
                <span>المصحف</span>
              </TabsTrigger>
              <TabsTrigger 
                value="search" 
                className="flex-1 gap-2 py-2 rounded-xl text-white/80 data-[state=active]:bg-white/20"
              >
                <Search className="h-4 w-4" />
                <span>البحث</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tafsir" 
                className="flex-1 gap-2 py-2 rounded-xl text-white/80 data-[state=active]:bg-white/20"
              >
                <FileText className="h-4 w-4" />
                <span>التفسير</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {isSeeding ? (
          <div className={`
            h-full flex items-center justify-center
            ${isDarkMode ? 'bg-slate-900' : 'bg-[#f8f4eb]'}
          `}>
            <div className="text-center space-y-6">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin mx-auto text-emerald-500" />
                <div className="absolute inset-0 h-16 w-16 mx-auto rounded-full bg-emerald-500/20 animate-pulse" />
              </div>
              <div>
                <h2 className={`
                  text-2xl font-bold mb-2
                  ${isDarkMode ? 'text-white' : 'text-gray-800'}
                `}
                style={{ fontFamily: "'Scheherazade New', 'Amiri', serif" }}
                >
                  جاري تهيئة قاعدة البيانات
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  تحميل بيانات القرآن الكريم...
                </p>
              </div>
            </div>
          </div>
        ) : (
          <PanelGroup direction="horizontal" className="h-full">
            {/* Left Panel - Tafsir */}
            <Panel 
              defaultSize={40} 
              minSize={30} 
              className={`
                hidden lg:block
                ${isDarkMode ? 'border-amber-500/20' : 'border-emerald-200'}
                border-r
              `}
            >
              <TafsirPanel />
            </Panel>

            <PanelResizeHandle className={`
              w-1 hidden lg:block
              ${isDarkMode 
                ? 'bg-gradient-to-b from-slate-700 via-amber-500/30 to-slate-700' 
                : 'bg-gradient-to-b from-emerald-100 via-emerald-300 to-emerald-100'
              }
              transition-colors hover:w-2
            `} />

            {/* Middle Panel - Mushaf / Search */}
            <Panel defaultSize={42} minSize={30} maxSize={60}>
              <Tabs value={activeMiddleTab} onValueChange={setActiveMiddleTab} className="h-full flex flex-col">
                <TabsContent value="mushaf" className="flex-1 m-0 overflow-hidden data-[state=inactive]:hidden">
                  <MushafViewer onVerseSelect={handleVerseSelect} />
                </TabsContent>
                <TabsContent value="search" className="flex-1 m-0 overflow-hidden data-[state=inactive]:hidden">
                  <SemanticSearch />
                </TabsContent>
                <TabsContent value="tafsir" className="flex-1 m-0 overflow-hidden data-[state=inactive]:hidden lg:hidden">
                  <TafsirPanel />
                </TabsContent>
              </Tabs>
            </Panel>

            <PanelResizeHandle className={`
              w-1 hidden lg:block
              ${isDarkMode 
                ? 'bg-gradient-to-b from-slate-700 via-amber-500/30 to-slate-700' 
                : 'bg-gradient-to-b from-emerald-100 via-emerald-300 to-emerald-100'
              }
              transition-colors hover:w-2
            `} />

            {/* Right Panel - Surah List */}
            <Panel 
              defaultSize={18} 
              minSize={15} 
              maxSize={25} 
              className={`
                hidden lg:block
                ${isDarkMode ? 'border-amber-500/20' : 'border-emerald-200'}
                border-l
              `}
            >
              <SurahList />
            </Panel>
          </PanelGroup>
        )}
      </main>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className={`
              absolute inset-0 
              ${isDarkMode ? 'bg-black/60' : 'bg-black/40'}
              backdrop-blur-sm
            `}
            onClick={() => setShowMobileMenu(false)} 
          />
          <div className={`
            absolute right-0 top-0 bottom-0 w-80 shadow-2xl
            ${isDarkMode ? 'bg-slate-900' : 'bg-white'}
          `}>
            <SurahList />
          </div>
        </div>
      )}

    </div>
  );
}
