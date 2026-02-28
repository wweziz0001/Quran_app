'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Loader2, BookOpen, List, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface Surah {
  id: number;
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTransliteration: string;
  revelationType: string;
  totalAyahs: number;
  ayahCount?: number;
}

interface Verse {
  id: string;
  numberInSurah: number;
  textArabic: string;
  textTranslation?: string;
  juzNumber: number | null;
  pageNumber: number | null;
}

export function QuranManagementSection() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVerses, setIsLoadingVerses] = useState(false);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [totalAyahs, setTotalAyahs] = useState(0);
  
  // Dialog states
  const [isAddSurahOpen, setIsAddSurahOpen] = useState(false);
  const [isAddVerseOpen, setIsAddVerseOpen] = useState(false);
  const [isEditVerseOpen, setIsEditVerseOpen] = useState(false);
  const [isVersesOpen, setIsVersesOpen] = useState(false);
  const [isDeleteVerseOpen, setIsDeleteVerseOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [surahForm, setSurahForm] = useState({
    number: '',
    nameArabic: '',
    nameEnglish: '',
    nameTransliteration: '',
    revelationType: 'meccan',
    totalAyahs: '7',
  });

  const [verseForm, setVerseForm] = useState({
    numberInSurah: '',
    textArabic: '',
    textTranslation: '',
    juzNumber: '1',
    pageNumber: '1',
  });

  useEffect(() => {
    fetchSurahs();
  }, []);

  async function fetchSurahs() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/surahs');
      const data = await response.json();
      if (data.success) {
        setSurahs(data.data);
        // Calculate total ayahs from surahs data
        const total = data.data.reduce((sum: number, surah: Surah) => sum + (surah.ayahCount || 0), 0);
        setTotalAyahs(total);
      }
    } catch (error) {
      toast.error('فشل في تحميل السور');
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchVerses(surahId: number) {
    setIsLoadingVerses(true);
    try {
      const response = await fetch(`/api/ayah?surahId=${surahId}`);
      const data = await response.json();
      if (data.success) {
        setVerses(data.data);
      } else {
        toast.error('فشل في تحميل الآيات');
      }
    } catch (error) {
      toast.error('فشل في تحميل الآيات');
    } finally {
      setIsLoadingVerses(false);
    }
  }

  async function handleAddSurah() {
    if (!surahForm.nameArabic || !surahForm.nameEnglish) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/surahs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: parseInt(surahForm.number) || surahs.length + 1,
          nameArabic: surahForm.nameArabic,
          nameEnglish: surahForm.nameEnglish,
          nameTransliteration: surahForm.nameTransliteration || surahForm.nameEnglish,
          revelationType: surahForm.revelationType,
          totalAyahs: parseInt(surahForm.totalAyahs) || 0,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('تمت إضافة السورة بنجاح');
        setIsAddSurahOpen(false);
        fetchSurahs();
        setSurahForm({ number: '', nameArabic: '', nameEnglish: '', nameTransliteration: '', revelationType: 'meccan', totalAyahs: '7' });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('فشل في إضافة السورة');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddVerse() {
    if (!selectedSurah || !verseForm.textArabic) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/ayah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surahId: selectedSurah.id,
          numberInSurah: parseInt(verseForm.numberInSurah) || verses.length + 1,
          textArabic: verseForm.textArabic,
          juzNumber: parseInt(verseForm.juzNumber) || 1,
          pageNumber: parseInt(verseForm.pageNumber) || 1,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('تمت إضافة الآية بنجاح');
        fetchVerses(selectedSurah.id);
        setVerseForm({ numberInSurah: '', textArabic: '', textTranslation: '', juzNumber: '1', pageNumber: '1' });
        setIsAddVerseOpen(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('فشل في إضافة الآية');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEditVerse() {
    if (!selectedVerse || !verseForm.textArabic) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/ayah', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedVerse.id,
          numberInSurah: parseInt(verseForm.numberInSurah),
          textArabic: verseForm.textArabic,
          juzNumber: parseInt(verseForm.juzNumber),
          pageNumber: parseInt(verseForm.pageNumber),
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('تم تحديث الآية بنجاح');
        if (selectedSurah) {
          fetchVerses(selectedSurah.id);
        }
        setIsEditVerseOpen(false);
        setSelectedVerse(null);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('فشل في تحديث الآية');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteVerse(e?: React.MouseEvent) {
    e?.preventDefault();
    if (!selectedVerse) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/ayah?id=${selectedVerse.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('تم حذف الآية بنجاح');
        if (selectedSurah) {
          fetchVerses(selectedSurah.id);
        }
        setIsDeleteVerseOpen(false);
        setSelectedVerse(null);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('فشل في حذف الآية');
    } finally {
      setIsSaving(false);
    }
  }

  function openVersesDialog(surah: Surah) {
    setSelectedSurah(surah);
    setVerses([]);
    fetchVerses(surah.id);
    setIsVersesOpen(true);
  }

  function openEditVerseDialog(verse: Verse) {
    setSelectedVerse(verse);
    setVerseForm({
      numberInSurah: verse.numberInSurah.toString(),
      textArabic: verse.textArabic,
      textTranslation: verse.textTranslation || '',
      juzNumber: verse.juzNumber.toString(),
      pageNumber: verse.pageNumber.toString(),
    });
    setIsEditVerseOpen(true);
  }

  function openDeleteVerseDialog(verse: Verse) {
    setSelectedVerse(verse);
    setIsDeleteVerseOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">إدارة القرآن</h2>
          <p className="text-muted-foreground">إدارة السور والآيات</p>
        </div>
        <Button onClick={() => setIsAddSurahOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة سورة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{surahs.length}</p>
                <p className="text-xs text-muted-foreground">سورة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <BookOpen className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAyahs.toLocaleString('ar-SA')}</p>
                <p className="text-xs text-muted-foreground">آية</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <List className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{surahs.length}</p>
                <p className="text-xs text-muted-foreground">السور المتوقعة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Surahs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            السور ({surahs.length})
          </CardTitle>
          <CardDescription>قائمة جميع السور في قاعدة البيانات</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">#</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">الاسم بالعربية</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">الاسم بالإنجليزية</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">النوع</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">عدد الآيات</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {surahs.map((surah) => (
                    <tr key={surah.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4 text-sm">{surah.number}</td>
                      <td className="py-3 px-4 text-sm" style={{ fontFamily: "'Amiri', serif" }}>{surah.nameArabic}</td>
                      <td className="py-3 px-4 text-sm">{surah.nameEnglish}</td>
                      <td className="py-3 px-4 text-sm">
                        <Badge variant={surah.revelationType === 'meccan' ? 'default' : 'secondary'}>
                          {surah.revelationType === 'meccan' ? 'مكية' : 'مدنية'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={surah.ayahCount !== surah.totalAyahs ? 'text-amber-500 font-medium' : ''}>
                          {surah.ayahCount ?? surah.totalAyahs}
                        </span>
                        {surah.ayahCount !== surah.totalAyahs && (
                          <span className="text-xs text-muted-foreground mr-1">(متوقع: {surah.totalAyahs})</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="outline" size="sm" onClick={() => openVersesDialog(surah)} className="gap-1">
                          <List className="h-3 w-3" />
                          الآيات
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Surah Dialog */}
      <Dialog open={isAddSurahOpen} onOpenChange={setIsAddSurahOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة سورة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>رقم السورة</Label>
                <Input type="number" value={surahForm.number} onChange={(e) => setSurahForm({ ...surahForm, number: e.target.value })} />
              </div>
              <div>
                <Label>عدد الآيات</Label>
                <Input type="number" value={surahForm.totalAyahs} onChange={(e) => setSurahForm({ ...surahForm, totalAyahs: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>الاسم بالعربية *</Label>
              <Input value={surahForm.nameArabic} onChange={(e) => setSurahForm({ ...surahForm, nameArabic: e.target.value })} dir="rtl" />
            </div>
            <div>
              <Label>الاسم بالإنجليزية *</Label>
              <Input value={surahForm.nameEnglish} onChange={(e) => setSurahForm({ ...surahForm, nameEnglish: e.target.value })} />
            </div>
            <div>
              <Label>النطق الصوتي</Label>
              <Input value={surahForm.nameTransliteration} onChange={(e) => setSurahForm({ ...surahForm, nameTransliteration: e.target.value })} />
            </div>
            <div>
              <Label>نوع النزول</Label>
              <select 
                className="w-full border rounded-md p-2 bg-background"
                value={surahForm.revelationType}
                onChange={(e) => setSurahForm({ ...surahForm, revelationType: e.target.value })}
              >
                <option value="meccan">مكية</option>
                <option value="medinan">مدنية</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSurahOpen(false)}>إلغاء</Button>
            <Button onClick={handleAddSurah} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verses Dialog */}
      <Dialog open={isVersesOpen} onOpenChange={setIsVersesOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              آيات سورة {selectedSurah?.nameArabic}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center justify-between py-2">
            <Badge variant="outline">{verses.length} آية</Badge>
            <Button onClick={() => {
              setVerseForm({ numberInSurah: (verses.length + 1).toString(), textArabic: '', textTranslation: '', juzNumber: '1', pageNumber: '1' });
              setIsAddVerseOpen(true);
            }} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              إضافة آية
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoadingVerses ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : verses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">لا توجد آيات</div>
            ) : (
              <div className="space-y-2">
                {verses.map((verse) => (
                  <div key={verse.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2">
                        <Badge className="shrink-0">{verse.numberInSurah}</Badge>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditVerseDialog(verse)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDeleteVerseDialog(verse)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg text-right" style={{ fontFamily: "'Amiri', serif" }} dir="rtl">
                          {verse.textArabic}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>الجزء: {verse.juzNumber ?? '-'}</span>
                          <span>الصفحة: {verse.pageNumber ?? '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Verse Dialog */}
      <Dialog open={isAddVerseOpen} onOpenChange={setIsAddVerseOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة آية جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>رقم الآية</Label>
                <Input type="number" value={verseForm.numberInSurah} onChange={(e) => setVerseForm({ ...verseForm, numberInSurah: e.target.value })} />
              </div>
              <div>
                <Label>الجزء</Label>
                <Input type="number" value={verseForm.juzNumber} onChange={(e) => setVerseForm({ ...verseForm, juzNumber: e.target.value })} />
              </div>
              <div>
                <Label>الصفحة</Label>
                <Input type="number" value={verseForm.pageNumber} onChange={(e) => setVerseForm({ ...verseForm, pageNumber: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>نص الآية *</Label>
              <Textarea 
                value={verseForm.textArabic}
                onChange={(e) => setVerseForm({ ...verseForm, textArabic: e.target.value })}
                rows={4}
                className="text-right text-lg"
                dir="rtl"
                style={{ fontFamily: "'Amiri', serif" }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddVerseOpen(false)}>إلغاء</Button>
            <Button onClick={handleAddVerse} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Verse Dialog */}
      <Dialog open={isEditVerseOpen} onOpenChange={setIsEditVerseOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              تعديل الآية {selectedVerse?.numberInSurah}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>رقم الآية</Label>
                <Input type="number" value={verseForm.numberInSurah} onChange={(e) => setVerseForm({ ...verseForm, numberInSurah: e.target.value })} />
              </div>
              <div>
                <Label>الجزء</Label>
                <Input type="number" value={verseForm.juzNumber} onChange={(e) => setVerseForm({ ...verseForm, juzNumber: e.target.value })} />
              </div>
              <div>
                <Label>الصفحة</Label>
                <Input type="number" value={verseForm.pageNumber} onChange={(e) => setVerseForm({ ...verseForm, pageNumber: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>نص الآية *</Label>
              <Textarea 
                value={verseForm.textArabic}
                onChange={(e) => setVerseForm({ ...verseForm, textArabic: e.target.value })}
                rows={4}
                className="text-right text-lg"
                dir="rtl"
                style={{ fontFamily: "'Amiri', serif" }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditVerseOpen(false)}>
              <X className="h-4 w-4 mr-1" />
              إلغاء
            </Button>
            <Button onClick={handleEditVerse} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Save className="h-4 w-4 mr-1" />
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Verse Confirmation */}
      <AlertDialog open={isDeleteVerseOpen} onOpenChange={setIsDeleteVerseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">هل أنت متأكد من حذف هذه الآية؟</span>
              <span className="block text-sm text-muted-foreground" style={{ fontFamily: "'Amiri', serif" }} dir="rtl">
                الآية {selectedVerse?.numberInSurah}: {selectedVerse?.textArabic?.substring(0, 50)}...
              </span>
              <span className="block text-destructive text-sm">⚠️ سيتم حذف جميع البيانات المرتبطة بالآية</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <Button
              onClick={handleDeleteVerse}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              حذف
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
