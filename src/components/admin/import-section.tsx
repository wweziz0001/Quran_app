'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Download, 
  Database, 
  BookOpen, 
  Mic, 
  BookMarked, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Music
} from 'lucide-react';

interface ImportStatus {
  currentData: {
    surahs: number;
    ayahs: number;
    tafsirEntries: number;
    reciters: number;
    recitations: number;
    recitationAyahs: number;
  };
  sources: Record<string, {
    name: string;
    url: string;
    description: string;
  }>;
}

interface ImportResult {
  success: boolean;
  imported?: number;
  message?: string;
  error?: string;
}

interface Reciter {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  apiIdentifier: string | null;
  isActive: boolean;
}

interface Reciter {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  slug: string;
  apiIdentifier: string | null;
  isActive: boolean;
}

const importTypes = [
  {
    id: 'surahs',
    name: 'سور القرآن الكريم',
    nameEn: 'Quran Surahs',
    icon: BookOpen,
    description: 'استيراد بيانات السور الـ 114',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'ayahs',
    name: 'آيات القرآن الكريم',
    nameEn: 'Quran Ayahs',
    icon: BookMarked,
    description: 'استيراد النصوص الكاملة للآيات الـ 6,236',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'missing-ayahs',
    name: 'الآيات الناقصة',
    nameEn: 'Missing Ayahs',
    icon: AlertCircle,
    description: 'استيراد الآيات الناقصة فقط',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    id: 'reciters',
    name: 'القراء',
    nameEn: 'Reciters',
    icon: Mic,
    description: 'استيراد قائمة القراء من AlQuran Cloud API',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'tafsir',
    name: 'التفاسير',
    nameEn: 'Tafsir Sources',
    icon: BookOpen,
    description: 'استيراد مصادر التفسير المعتمدة',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
];

export function ImportSection() {
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ImportResult>>({});
  const [progress, setProgress] = useState(0);
  const [selectedReciter, setSelectedReciter] = useState<string>('');

  useEffect(() => {
    fetchStatus();
    fetchReciters();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/import');
      const data = await response.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching import status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReciters = async () => {
    try {
      const response = await fetch('/api/reciters?all=true');
      const data = await response.json();
      if (data.success) {
        // Filter only reciters with API identifiers
        const validReciters = data.data.filter((r: Reciter) => r.apiIdentifier);
        setReciters(validReciters);
        if (validReciters.length > 0 && !selectedReciter) {
          setSelectedReciter(validReciters[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching reciters:', error);
    }
  };

  const handleImport = async (type: string, reciterId?: string) => {
    setImporting(type);
    setProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const body: { type: string; reciterId?: string } = { type };
      if (reciterId) {
        body.reciterId = reciterId;
      }
      
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      setProgress(100);
      
      setResults(prev => ({
        ...prev,
        [type]: data,
      }));

      if (data.success) {
        // Refresh status and reciters after successful import
        setTimeout(() => {
          fetchStatus();
          fetchReciters();
        }, 1000);
      }
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [type]: { success: false, error: 'حدث خطأ في الاتصال بالخادم' },
      }));
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setImporting(null);
        setProgress(0);
      }, 1000);
    }
  };

  const handleImportAll = async () => {
    setImporting('all');
    setProgress(0);

    for (let i = 0; i < importTypes.length; i++) {
      const type = importTypes[i];
      setProgress((i / importTypes.length) * 100);
      
      await handleImport(type.id);
      
      setResults(prev => ({
        ...prev,
        [`${type.id}-progress`]: { success: true, imported: i + 1 },
      }));
    }

    setProgress(100);
    setImporting(null);
    fetchStatus();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">استيراد البيانات</h2>
          <p className="text-muted-foreground mt-1">
            استيراد البيانات من المصادر المعتمدة
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            fetchStatus();
            fetchReciters();
          }}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </Button>
      </div>

      {/* Current Data Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            حالة البيانات الحالية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-emerald-500">{status?.currentData.surahs || 0}</p>
              <p className="text-sm text-muted-foreground mt-1">سورة</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-amber-500">{status?.currentData.ayahs || 0}</p>
              <p className="text-sm text-muted-foreground mt-1">آية</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-blue-500">{status?.currentData.reciters || 0}</p>
              <p className="text-sm text-muted-foreground mt-1">قارئ</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-cyan-500">{status?.currentData.recitations || 0}</p>
              <p className="text-sm text-muted-foreground mt-1">تلاوة</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-teal-500">{status?.currentData.recitationAyahs || 0}</p>
              <p className="text-sm text-muted-foreground mt-1">ملف صوتي</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-purple-500">{status?.currentData.tafsirEntries || 0}</p>
              <p className="text-sm text-muted-foreground mt-1">تفسير</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      {importing && (
        <Card className="border-primary/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">جاري الاستيراد...</p>
                <Progress value={progress} className="mt-2" />
              </div>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Options */}
      <div className="grid gap-4 md:grid-cols-2">
        {importTypes.map((type) => {
          const Icon = type.icon;
          const result = results[type.id];
          const isImportingThis = importing === type.id;

          return (
            <Card key={type.id} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${type.bgColor}`}>
                    <Icon className={`h-5 w-5 ${type.color}`} />
                  </div>
                  {result && (
                    result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )
                  )}
                </div>
                <CardTitle className="text-lg mt-3">{type.name}</CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {status?.sources[type.id]?.name || 'AlQuran Cloud'}
                    </Badge>
                  </div>
                  <Button
                    onClick={() => handleImport(type.id)}
                    disabled={importing !== null}
                    variant={result?.success ? "outline" : "default"}
                    className="gap-2"
                  >
                    {isImportingThis ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        استيراد
                      </>
                    )}
                  </Button>
                </div>
                {result && (
                  <div className={`mt-3 p-2 rounded-lg text-sm ${
                    result.success 
                      ? 'bg-green-500/10 text-green-600' 
                      : 'bg-red-500/10 text-red-600'
                  }`}>
                    {result.success ? result.message : result.error}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Audio Import with Reciter Selection */}
      <Card className="border-cyan-500/30 bg-cyan-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Music className="h-5 w-5 text-cyan-500" />
            استيراد الملفات الصوتية للآيات
          </CardTitle>
          <CardDescription>
            استيراد ملفات صوتية منفصلة لكل آية - اختر القارئ المطلوب
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reciters.length === 0 ? (
            <div className="p-4 bg-amber-500/10 text-amber-600 rounded-lg text-sm">
              ⚠️ لا يوجد قراء مع معرفات API. قم باستيراد القراء أولاً من خلال زر &quot;استيراد&quot; في قسم القراء أعلاه.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">اختر القارئ</label>
                <Select value={selectedReciter} onValueChange={setSelectedReciter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القارئ" />
                  </SelectTrigger>
                  <SelectContent>
                    {reciters.map((reciter) => (
                      <SelectItem key={reciter.id} value={reciter.id}>
                        <span className="flex items-center gap-2">
                          <span style={{ fontFamily: "'Amiri', serif" }}>{reciter.nameArabic}</span>
                          <span className="text-muted-foreground">({reciter.nameEnglish})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => handleImport('audio', selectedReciter)}
                  disabled={importing !== null || !selectedReciter}
                  className="gap-2 bg-cyan-600 hover:bg-cyan-700"
                >
                  {importing === 'audio' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الاستيراد...
                    </>
                  ) : (
                    <>
                      <Music className="h-4 w-4" />
                      استيراد الصوت
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          {results['audio'] && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              results['audio'].success 
                ? 'bg-green-500/10 text-green-600' 
                : 'bg-red-500/10 text-red-600'
            }`}>
              {results['audio'].success ? results['audio'].message : results['audio'].error}
            </div>
          )}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              ⏱️ <strong>ملاحظة:</strong> استيراد الملفات الصوتية لقارئ واحد يستغرق حوالي 10-15 دقيقة لجميع الآيات (6,236 آية)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              📡 <strong>المصدر:</strong> AlQuran Cloud CDN - {SOURCES.cdn}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Import All */}
      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">استيراد الكل</h3>
              <p className="text-sm text-muted-foreground">
                استيراد جميع البيانات من المصادر المعتمدة دفعة واحدة
              </p>
            </div>
            <Button
              onClick={handleImportAll}
              disabled={importing !== null}
              size="lg"
              className="gap-2"
            >
              {importing === 'all' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري الاستيراد...
                </>
              ) : (
                <>
                  <Database className="h-5 w-5" />
                  استيراد الكل
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Source Info */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">المصادر المعتمدة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>AlQuran Cloud API</strong> - مصدر موثوق لبيانات القرآن الكريم والقراء</p>
            <p>• <strong>AlQuran Cloud CDN</strong> - للملفات الصوتية على مستوى الآية</p>
            <p>• <strong>Quran.com API</strong> - للتفاسير المعتمدة</p>
            <p>• جميع البيانات مستوردة من مصادر إسلامية موثوقة</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// CDN URL constant for display
const SOURCES = {
  cdn: 'https://cdn.islamic.network/quran/audio/128',
};
