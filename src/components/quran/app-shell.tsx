'use client';

import { useState, useEffect } from 'react';
import { useQuranStore, type Surah, type Ayah } from '@/hooks/use-quran';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Book, Headphones, Bookmark, Search, Settings, Moon, Sun, 
  ChevronRight, Play, Pause, SkipBack, SkipForward, Volume2,
  Home, Menu, X, LogIn, LogOut
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// Surah List Component
function SurahList({ onSelectSurah }: { onSelectSurah: (surah: Surah) => void }) {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/surahs')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSurahs(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="p-4 space-y-2">
        {surahs.map((surah) => (
          <Card 
            key={surah.id} 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => onSelectSurah(surah)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{surah.number}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{surah.nameEnglish}</h3>
                      <p className="text-sm text-muted-foreground">{surah.nameTransliteration}</p>
                    </div>
                    <p className="text-2xl font-arabic" dir="rtl">{surah.nameArabic}</p>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {surah.ayahCount || surah.totalAyahs} Ayahs
                    </Badge>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {surah.revelationType}
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

// Quran Reader Component
function QuranReader({ surahId, onBack }: { surahId: number; onBack: () => void }) {
  const [surah, setSurah] = useState<{
    id: number;
    number: number;
    nameArabic: string;
    nameEnglish: string;
    ayahs: Ayah[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { showTranslation, fontSize, selectedAyahId, setSelectedAyahId } = useQuranStore();
  const [showTafsirModal, setShowTafsirModal] = useState(false);
  const [tafsirContent, setTafsirContent] = useState<string>('');
  const [bookmarkedAyahs, setBookmarkedAyahs] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch(`/api/surahs/${surahId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSurah(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, [surahId]);

  const handleAyahClick = (ayah: Ayah) => {
    setSelectedAyahId(ayah.id);
  };

  const handleShowTafsir = async (ayahId: number) => {
    try {
      const res = await fetch(`/api/tafsir?ayahId=${ayahId}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setTafsirContent(data.data[0].textTranslation || data.data[0].textArabic || 'No tafsir available');
      } else {
        setTafsirContent('Tafsir not available for this ayah.');
      }
      setShowTafsirModal(true);
    } catch {
      setTafsirContent('Failed to load tafsir.');
      setShowTafsirModal(true);
    }
  };

  const handleBookmark = async (ayahId: number) => {
    if (bookmarkedAyahs.has(ayahId)) {
      setBookmarkedAyahs(prev => {
        const next = new Set(prev);
        next.delete(ayahId);
        return next;
      });
    } else {
      setBookmarkedAyahs(prev => new Set(prev).add(ayahId));
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-8 bg-muted animate-pulse rounded w-1/4" />
            <div className="h-24 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!surah) {
    return (
      <div className="p-4 text-center">
        <p>Surah not found</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="p-4 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
            Back
          </Button>
          <div className="text-center">
            <h2 className="font-semibold">{surah.nameEnglish}</h2>
            <p className="text-sm text-muted-foreground">{surah.nameArabic}</p>
          </div>
          <div className="w-20" />
        </div>
      </div>

      {/* Surah Header (Bismillah for all except At-Tawbah) */}
      <div className="p-6 text-center border-b bg-gradient-to-b from-primary/5 to-transparent">
        <p className="text-3xl font-arabic" dir="rtl">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          In the name of Allah, the Most Gracious, the Most Merciful
        </p>
      </div>

      {/* Ayahs */}
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="p-4 space-y-4">
          {surah.ayahs.map((ayah) => (
            <div
              key={ayah.id}
              className={cn(
                "p-4 rounded-lg transition-colors cursor-pointer",
                selectedAyahId === ayah.id 
                  ? "bg-primary/10 border-2 border-primary/20" 
                  : "hover:bg-muted/50"
              )}
              onClick={() => handleAyahClick(ayah)}
            >
              <div className="flex items-start gap-4">
                {/* Ayah Number */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">{ayah.ayahNumber}</span>
                  </div>
                </div>

                {/* Ayah Content */}
                <div className="flex-1 min-w-0">
                  {/* Arabic Text */}
                  <p 
                    className="text-2xl leading-loose text-right font-arabic mb-3"
                    dir="rtl"
                    style={{ fontSize: `${fontSize * 1.5}rem` }}
                  >
                    {ayah.textArabic}
                    <span className="inline-flex items-center justify-center w-8 h-8 mx-1 text-sm bg-primary/10 rounded-full">
                      {ayah.ayahNumber}
                    </span>
                  </p>

                  {/* Translation */}
                  {showTranslation && ayah.translation && (
                    <p className="text-muted-foreground leading-relaxed">
                      {ayah.translation.text}
                    </p>
                  )}

                  {/* Ayah Actions */}
                  {selectedAyahId === ayah.id && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowTafsir(ayah.id);
                        }}
                      >
                        <Book className="h-4 w-4 mr-1" />
                        Tafsir
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookmark(ayah.id);
                        }}
                      >
                        <Bookmark 
                          className={cn(
                            "h-4 w-4 mr-1",
                            bookmarkedAyahs.has(ayah.id) && "fill-current text-primary"
                          )} 
                        />
                        {bookmarkedAyahs.has(ayah.id) ? 'Saved' : 'Save'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Play
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sajdah indicator */}
              {ayah.sajdah && (
                <Badge variant="outline" className="mt-2 text-xs">
                  ۩ Sajdah
                </Badge>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Tafsir Modal */}
      {showTafsirModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tafsir</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowTafsirModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-auto max-h-[60vh]">
              <p className="text-sm leading-relaxed">{tafsirContent}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Audio Player Component
function AudioPlayer() {
  const { isPlaying, setIsPlaying } = useQuranStore();
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-40">
      <div className="max-w-4xl mx-auto">
        {/* Progress bar */}
        <div className="h-1 bg-muted rounded-full mb-3">
          <div 
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          {/* Surah Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Headphones className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Al-Fatiha</p>
              <p className="text-xs text-muted-foreground">Mishary Rashid Al-Afasy</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button 
              size="icon" 
              className="h-10 w-10 rounded-full"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon">
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value, 10))}
              className="w-20 h-1 accent-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Search Component
function SearchView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ surahs: Surah[]; ayahs: Ayah[] }>({ surahs: [], ayahs: [] });
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (query.length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Quran (Arabic or English)..."
          className="flex-1 px-4 py-3 rounded-lg border bg-background"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={searching}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {results.surahs.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Surahs</h3>
          <div className="space-y-2">
            {results.surahs.map((surah) => (
              <Card key={surah.id} className="p-4">
                <p className="font-medium">{surah.nameEnglish}</p>
                <p className="text-sm text-muted-foreground">{surah.nameArabic}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {results.ayahs.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Ayahs</h3>
          <div className="space-y-2">
            {results.ayahs.map((ayah) => (
              <Card key={ayah.id} className="p-4">
                <p className="text-lg text-right font-arabic" dir="rtl">{ayah.textArabic}</p>
                {ayah.translation && (
                  <p className="text-sm text-muted-foreground mt-2">{ayah.translation.text}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Bookmarks View
function BookmarksView() {
  // For demo, show empty bookmarks
  const bookmarks: Array<{
    id: string;
    ayahId: number;
    type: string;
    ayah?: Ayah & { surah: { id: number; number: number; nameEnglish: string } };
  }> = [];

  if (bookmarks.length === 0) {
    return (
      <div className="p-4 text-center">
        <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">No Bookmarks Yet</h3>
        <p className="text-sm text-muted-foreground">
          Bookmark ayahs to quickly find them later.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {bookmarks.map((bookmark) => (
        <Card key={bookmark.id} className="p-4">
          <p className="text-lg text-right font-arabic" dir="rtl">
            {bookmark.ayah?.textArabic}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {bookmark.ayah?.surah?.nameEnglish} - Ayah {bookmark.ayah?.ayahNumber}
          </p>
        </Card>
      ))}
    </div>
  );
}

// Admin Dashboard
function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'reciters' | 'settings'>('overview');

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        <Button 
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </Button>
        <Button 
          variant={activeTab === 'reciters' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('reciters')}
        >
          Reciters
        </Button>
        <Button 
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </Button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Surahs</p>
              <p className="text-3xl font-bold">114</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Ayahs</p>
              <p className="text-3xl font-bold">6,236</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Reciters</p>
              <p className="text-3xl font-bold">3</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'reciters' && <RecitersManager />}
      {activeTab === 'settings' && <SettingsManager />}
    </div>
  );
}

// Reciters Manager
function RecitersManager() {
  const [reciters, setReciters] = useState<Array<{
    id: string;
    nameArabic: string;
    nameEnglish: string;
    slug: string;
    country: string | null;
    popularity: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReciter, setNewReciter] = useState({
    nameArabic: '',
    nameEnglish: '',
    slug: '',
    country: '',
  });

  useEffect(() => {
    fetch('/api/reciters')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setReciters(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAddReciter = async () => {
    try {
      const res = await fetch('/api/admin/reciters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReciter),
      });
      const data = await res.json();
      if (data.success) {
        setReciters([...reciters, data.data]);
        setShowAddForm(false);
        setNewReciter({ nameArabic: '', nameEnglish: '', slug: '', country: '' });
      }
    } catch (error) {
      console.error('Failed to add reciter:', error);
    }
  };

  if (loading) return <div>Loading reciters...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Manage Reciters</h3>
        <Button onClick={() => setShowAddForm(true)}>Add Reciter</Button>
      </div>

      {showAddForm && (
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Name (Arabic)"
              value={newReciter.nameArabic}
              onChange={(e) => setNewReciter({ ...newReciter, nameArabic: e.target.value })}
              className="px-3 py-2 rounded border"
            />
            <input
              type="text"
              placeholder="Name (English)"
              value={newReciter.nameEnglish}
              onChange={(e) => setNewReciter({ ...newReciter, nameEnglish: e.target.value })}
              className="px-3 py-2 rounded border"
            />
            <input
              type="text"
              placeholder="Slug"
              value={newReciter.slug}
              onChange={(e) => setNewReciter({ ...newReciter, slug: e.target.value })}
              className="px-3 py-2 rounded border"
            />
            <input
              type="text"
              placeholder="Country"
              value={newReciter.country}
              onChange={(e) => setNewReciter({ ...newReciter, country: e.target.value })}
              className="px-3 py-2 rounded border"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAddReciter}>Save</Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {reciters.map((reciter) => (
          <Card key={reciter.id} className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{reciter.nameEnglish}</p>
                <p className="text-sm text-muted-foreground">{reciter.nameArabic}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{reciter.country}</Badge>
                <Badge variant="secondary">Popularity: {reciter.popularity}</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Settings Manager
function SettingsManager() {
  const [settings, setSettings] = useState<Array<{
    id: string;
    key: string;
    value: string;
    description: string | null;
    isPublic: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSettings(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div>
      <h3 className="font-semibold mb-4">Application Settings</h3>
      <div className="space-y-2">
        {settings.map((setting) => (
          <Card key={setting.id} className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{setting.key}</p>
                <p className="text-sm text-muted-foreground">{setting.description}</p>
              </div>
              <input
                type="text"
                value={setting.value}
                onChange={(e) => {
                  const newSettings = settings.map(s => 
                    s.key === setting.key ? { ...s, value: e.target.value } : s
                  );
                  setSettings(newSettings);
                }}
                onBlur={(e) => handleUpdateSetting(setting.key, e.target.value)}
                className="px-3 py-1 rounded border w-48"
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Auth Modal
function AuthModal({ mode, onClose }: { mode: 'login' | 'register'; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, setToken } = useQuranStore();

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'login' ? { email, password } : { email, password, name }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
        setToken(data.data.token);
        onClose();
      } else {
        setError(data.error);
      }
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === 'login' ? 'Login' : 'Register'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded text-sm">
              {error}
            </div>
          )}
          
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded border"
            />
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded border"
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded border"
          />
          
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Settings Panel
function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { showTranslation, setShowTranslation, fontSize, setFontSize } = useQuranStore();
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Settings</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div>
            <h4 className="font-medium mb-2">Theme</h4>
            <div className="flex gap-2">
              <Button 
                variant={theme === 'light' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTheme('light')}
              >
                <Sun className="h-4 w-4 mr-1" /> Light
              </Button>
              <Button 
                variant={theme === 'dark' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-4 w-4 mr-1" /> Dark
              </Button>
              <Button 
                variant={theme === 'system' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTheme('system')}
              >
                System
              </Button>
            </div>
          </div>

          <Separator />

          {/* Translation */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Show Translation</h4>
              <p className="text-sm text-muted-foreground">Display English translation</p>
            </div>
            <Button 
              variant={showTranslation ? 'default' : 'outline'}
              onClick={() => setShowTranslation(!showTranslation)}
            >
              {showTranslation ? 'On' : 'Off'}
            </Button>
          </div>

          <Separator />

          {/* Font Size */}
          <div>
            <h4 className="font-medium mb-2">Arabic Font Size</h4>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFontSize(Math.max(0.5, fontSize - 0.1))}
              >
                A-
              </Button>
              <span className="w-16 text-center">{(fontSize * 100).toFixed(0)}%</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFontSize(Math.min(2, fontSize + 0.1))}
              >
                A+
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main App Component
export function QuranApp() {
  const { currentView, setCurrentView, selectedSurah, setSelectedSurah, user, logout } = useQuranStore();
  const [showAuthModal, setShowAuthModal] = useState<'login' | 'register' | null>(null);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleSelectSurah = (surah: Surah) => {
    setSelectedSurah(surah);
    setCurrentView('surah');
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Book className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold hidden sm:block">Quran App</h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Button 
              variant={currentView === 'home' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('home')}
            >
              <Home className="h-4 w-4 mr-1" />
              Home
            </Button>
            <Button 
              variant={currentView === 'search' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('search')}
            >
              <Search className="h-4 w-4 mr-1" />
              Search
            </Button>
            <Button 
              variant={currentView === 'bookmarks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('bookmarks')}
            >
              <Bookmark className="h-4 w-4 mr-1" />
              Bookmarks
            </Button>
            {user?.role === 'ADMIN' && (
              <Button 
                variant={currentView === 'admin' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('admin')}
              >
                <Settings className="h-4 w-4 mr-1" />
                Admin
              </Button>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowSettingsPanel(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm hidden sm:block">{user.name || user.email}</span>
                <Button variant="ghost" size="icon" onClick={logout}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setShowAuthModal('login')}>
                  <LogIn className="h-4 w-4 mr-1" />
                  Login
                </Button>
                <Button size="sm" onClick={() => setShowAuthModal('register')} className="hidden sm:flex">
                  Register
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-background pt-16">
          <nav className="p-4 space-y-2">
            <Button 
              variant={currentView === 'home' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => { setCurrentView('home'); setMobileMenuOpen(false); }}
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Button 
              variant={currentView === 'search' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => { setCurrentView('search'); setMobileMenuOpen(false); }}
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button 
              variant={currentView === 'bookmarks' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => { setCurrentView('bookmarks'); setMobileMenuOpen(false); }}
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Bookmarks
            </Button>
            {user?.role === 'ADMIN' && (
              <Button 
                variant={currentView === 'admin' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false); }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto">
        {currentView === 'home' && !selectedSurah && (
          <div className="p-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">القرآن الكريم</h2>
              <p className="text-muted-foreground">The Noble Quran</p>
            </div>
            <SurahList onSelectSurah={handleSelectSurah} />
          </div>
        )}

        {currentView === 'surah' && selectedSurah && (
          <QuranReader 
            surahId={selectedSurah.id} 
            onBack={() => {
              setSelectedSurah(null);
              setCurrentView('home');
            }}
          />
        )}

        {currentView === 'search' && <SearchView />}
        {currentView === 'bookmarks' && <BookmarksView />}
        {currentView === 'admin' && <AdminDashboard />}
      </main>

      {/* Audio Player */}
      <AudioPlayer />

      {/* Modals */}
      {showAuthModal && (
        <AuthModal mode={showAuthModal} onClose={() => setShowAuthModal(null)} />
      )}
      {showSettingsPanel && (
        <SettingsPanel onClose={() => setShowSettingsPanel(false)} />
      )}
    </div>
  );
}
