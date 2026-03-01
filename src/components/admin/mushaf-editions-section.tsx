'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
import { 
  Image as ImageIcon,
  BookOpen,
  Loader2,
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Settings,
  Upload,
  Database,
  ChevronRight,
  Eye,
  FileCode,
} from 'lucide-react';
import { toast } from 'sonner';

interface ImageMushafEdition {
  id: string;
  slug: string;
  nameArabic: string;
  nameEnglish: string;
  description: string | null;
  narration: number;
  width: number;
  height: number;
  totalPages: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  stats?: {
    pages: number;
    ayat: number;
    words: number;
    lines: number;
    surahs: number;
  };
}

interface TtfMushafEdition {
  id: string;
  slug: string;
  nameArabic: string;
  nameEnglish: string;
  description: string | null;
  narration: number;
  type: string;
  width: number;
  height: number;
  totalPages: number;
  isDefault: boolean;
  isActive: boolean;
  specialFontUrl?: string | null;
  createdAt: string;
  stats?: {
    fonts: number;
    ayat: number;
    words: number;
    discriminators: number;
    surahs: number;
  };
}

interface MushafPage {
  id: string;
  pageNumber: number;
  imageUrl: string;
}

interface TtfFont {
  id: number;
  pageNumber: number;
  fileName: string;
  fileSize: number;
  fontUrl: string;
}

export function MushafEditionsSection() {
  const [imageEditions, setImageEditions] = useState<ImageMushafEdition[]>([]);
  const [ttfEditions, setTtfEditions] = useState<TtfMushafEdition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [isAddImageOpen, setIsAddImageOpen] = useState(false);
  const [isAddTtfOpen, setIsAddTtfOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'image' | 'ttf'; id: string; name: string } | null>(null);

  // Page/Font management
  const [selectedImageEdition, setSelectedImageEdition] = useState<ImageMushafEdition | null>(null);
  const [selectedTtfEdition, setSelectedTtfEdition] = useState<TtfMushafEdition | null>(null);
  const [imagePages, setImagePages] = useState<MushafPage[]>([]);
  const [ttfFonts, setTtfFonts] = useState<TtfFont[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [isUploadPagesOpen, setIsUploadPagesOpen] = useState(false);
  const [isUploadFontsOpen, setIsUploadFontsOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [startPage, setStartPage] = useState('1');
  const [previewImage, setPreviewImage] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Form state for image mushaf
  const [imageForm, setImageForm] = useState({
    nameArabic: '',
    nameEnglish: '',
    description: '',
    slug: '',
    narration: '1',
    width: '1024',
    height: '1656',
    totalPages: '604',
    isDefault: false,
  });
  const [imageDbFile, setImageDbFile] = useState<File | null>(null);
  const imageDbFileRef = useRef<HTMLInputElement>(null);
  const imagePageFilesRef = useRef<HTMLInputElement>(null);

  // Form state for TTF mushaf
  const [ttfForm, setTtfForm] = useState({
    nameArabic: '',
    nameEnglish: '',
    description: '',
    slug: '',
    narration: '1',
    type: 'uthmani',
    width: '1024',
    height: '1656',
    totalPages: '604',
    isDefault: false,
  });
  const [ttfDbFile, setTtfDbFile] = useState<File | null>(null);
  const [ttfFontFiles, setTtfFontFiles] = useState<File[]>([]);
  const [specialFontFile, setSpecialFontFile] = useState<File | null>(null);
  const ttfDbFileRef = useRef<HTMLInputElement>(null);
  const ttfFontFilesRef = useRef<HTMLInputElement>(null);
  const specialFontRef = useRef<HTMLInputElement>(null);
  const ttfPageFilesRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [imageRes, ttfRes] = await Promise.all([
        fetch('/api/admin/image-mushaf'),
        fetch('/api/admin/ttf-mushaf'),
      ]);
      
      const imageData = await imageRes.json();
      const ttfData = await ttfRes.json();
      
      if (imageData.success) setImageEditions(imageData.data);
      if (ttfData.success) setTtfEditions(ttfData.data);
    } catch (error) {
      console.error('Error fetching editions:', error);
      toast.error('فشل في تحميل المصاحف');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch pages for image edition
  const fetchImagePages = async (editionId: string) => {
    setPagesLoading(true);
    try {
      const res = await fetch(`/api/admin/image-mushaf-pages?editionId=${editionId}`);
      const data = await res.json();
      if (data.success) setImagePages(data.data);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setPagesLoading(false);
    }
  };

  // Fetch fonts for TTF edition
  const fetchTtfFonts = async (editionId: string) => {
    setPagesLoading(true);
    try {
      const res = await fetch(`/api/admin/ttf-fonts?editionId=${editionId}`);
      const data = await res.json();
      if (data.success) setTtfFonts(data.data);
    } catch (error) {
      console.error('Error fetching fonts:', error);
    } finally {
      setPagesLoading(false);
    }
  };

  // Handle add image mushaf
  const handleAddImageMushaf = async () => {
    if (!imageForm.nameArabic || !imageForm.nameEnglish) {
      toast.error('يرجى ملء الاسم بالعربية والإنجليزية');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(imageForm).forEach(([key, value]) => {
        if (key === 'isDefault') {
          formData.append(key, String(value));
        } else {
          formData.append(key, value);
        }
      });
      
      if (imageDbFile) {
        formData.append('dbFile', imageDbFile);
      }

      const res = await fetch('/api/admin/image-mushaf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'تم إنشاء مصحف الصور بنجاح');
        setIsAddImageOpen(false);
        resetImageForm();
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('فشل في إنشاء مصحف الصور');
    } finally {
      setSaving(false);
    }
  };

  // Handle add TTF mushaf
  const handleAddTtfMushaf = async () => {
    if (!ttfForm.nameArabic || !ttfForm.nameEnglish) {
      toast.error('يرجى ملء الاسم بالعربية والإنجليزية');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(ttfForm).forEach(([key, value]) => {
        if (key === 'isDefault') {
          formData.append(key, String(value));
        } else {
          formData.append(key, value);
        }
      });
      
      if (ttfDbFile) {
        formData.append('dbFile', ttfDbFile);
      }
      
      for (const file of ttfFontFiles) {
        formData.append('fontFiles', file);
      }
      
      if (specialFontFile) {
        formData.append('specialFontFile', specialFontFile);
      }

      const res = await fetch('/api/admin/ttf-mushaf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'تم إنشاء مصحف TTF بنجاح');
        setIsAddTtfOpen(false);
        resetTtfForm();
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('فشل في إنشاء مصحف TTF');
    } finally {
      setSaving(false);
    }
  };

  // Handle upload image pages
  const handleUploadImagePages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImageEdition || !imagePageFilesRef.current?.files?.length) return;

    const files = Array.from(imagePageFilesRef.current.files);
    if (files.length === 0) return;

    setSaving(true);
    setUploadProgress(0);
    const start = parseInt(startPage) || 1;
    let uploaded = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const pageNumber = start + i;

        const formData = new FormData();
        formData.append('editionId', selectedImageEdition.id);
        formData.append('pageNumber', pageNumber.toString());
        formData.append('file', file);

        const res = await fetch('/api/admin/image-mushaf-pages', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) uploaded++;
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      toast.success(`تم رفع ${uploaded} صورة بنجاح`);
      setIsUploadPagesOpen(false);
      setStartPage('1');
      if (imagePageFilesRef.current) imagePageFilesRef.current.value = '';
      fetchImagePages(selectedImageEdition.id);
      fetchData();
    } catch (error) {
      toast.error('حدث خطأ أثناء رفع الصور');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  // Handle upload TTF fonts
  const handleUploadTtfFonts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTtfEdition || !ttfPageFilesRef.current?.files?.length) return;

    const files = Array.from(ttfPageFilesRef.current.files);
    if (files.length === 0) return;

    setSaving(true);
    setUploadProgress(0);
    const start = parseInt(startPage) || 1;
    let uploaded = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const pageNumber = start + i;

        const formData = new FormData();
        formData.append('editionId', selectedTtfEdition.id);
        formData.append('pageNumber', pageNumber.toString());
        formData.append('fontFile', file);

        const res = await fetch('/api/admin/ttf-fonts', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) uploaded++;
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      toast.success(`تم رفع ${uploaded} ملف خط بنجاح`);
      setIsUploadFontsOpen(false);
      setStartPage('1');
      if (ttfPageFilesRef.current) ttfPageFilesRef.current.value = '';
      fetchTtfFonts(selectedTtfEdition.id);
      fetchData();
    } catch (error) {
      toast.error('حدث خطأ أثناء رفع الخطوط');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  // Handle delete
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;

    setSaving(true);
    try {
      const endpoint = deleteTarget.type === 'image' ? '/api/admin/image-mushaf' : '/api/admin/ttf-mushaf';
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('تم حذف المصحف بنجاح');
        setDeleteTarget(null);
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('فشل في حذف المصحف');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete page
  const handleDeletePage = async (pageId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصفحة؟')) return;
    
    try {
      await fetch('/api/admin/image-mushaf-pages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pageId }),
      });
      
      if (selectedImageEdition) {
        fetchImagePages(selectedImageEdition.id);
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting page:', error);
    }
  };

  // Handle delete font
  const handleDeleteFont = async (fontId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الخط؟')) return;
    
    try {
      await fetch('/api/admin/ttf-fonts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fontId }),
      });
      
      if (selectedTtfEdition) {
        fetchTtfFonts(selectedTtfEdition.id);
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting font:', error);
    }
  };

  // Reset forms
  const resetImageForm = () => {
    setImageForm({
      nameArabic: '',
      nameEnglish: '',
      description: '',
      slug: '',
      narration: '1',
      width: '1024',
      height: '1656',
      totalPages: '604',
      isDefault: false,
    });
    setImageDbFile(null);
    if (imageDbFileRef.current) imageDbFileRef.current.value = '';
  };

  const resetTtfForm = () => {
    setTtfForm({
      nameArabic: '',
      nameEnglish: '',
      description: '',
      slug: '',
      narration: '1',
      type: 'uthmani',
      width: '1024',
      height: '1656',
      totalPages: '604',
      isDefault: false,
    });
    setTtfDbFile(null);
    setTtfFontFiles([]);
    setSpecialFontFile(null);
    if (ttfDbFileRef.current) ttfDbFileRef.current.value = '';
    if (ttfFontFilesRef.current) ttfFontFilesRef.current.value = '';
    if (specialFontRef.current) specialFontRef.current.value = '';
  };

  const getNarrationName = (narration: number) => {
    const narrations: Record<number, string> = {
      1: 'حفص عن عاصم',
      2: 'ورش عن نافع',
      3: 'قالون عن نافع',
      4: 'الدوري عن أبي عمرو',
    };
    return narrations[narration] || `رواية ${narration}`;
  };

  // Image Pages Management View
  if (selectedImageEdition) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setSelectedImageEdition(null)}>
            <ChevronRight className="w-4 h-4 ml-1" />
            رجوع
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{selectedImageEdition.nameArabic}</h1>
            <p className="text-muted-foreground">{selectedImageEdition.nameEnglish}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'صفحة', value: selectedImageEdition.stats?.pages || 0 },
            { label: 'آية', value: selectedImageEdition.stats?.ayat || 0 },
            { label: 'كلمة', value: selectedImageEdition.stats?.words || 0 },
            { label: 'سطر', value: selectedImageEdition.stats?.lines || 0 },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upload Pages */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">صفحات المصحف</h2>
          <Dialog open={isUploadPagesOpen} onOpenChange={setIsUploadPagesOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 ml-2" />
                رفع صور الصفحات
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>رفع صور صفحات المصحف</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUploadImagePages} className="space-y-4">
                <div>
                  <Label>رقم الصفحة الأولى</Label>
                  <Input
                    type="number"
                    value={startPage}
                    onChange={(e) => setStartPage(e.target.value)}
                    min="1"
                    max="604"
                  />
                </div>
                <div>
                  <Label>ملفات الصور (مرتبة حسب رقم الصفحة)</Label>
                  <Input
                    ref={imagePageFilesRef}
                    type="file"
                    accept="image/*"
                    multiple
                  />
                </div>
                {uploadProgress > 0 && (
                  <Progress value={uploadProgress} className="w-full" />
                )}
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري الرفع...
                    </>
                  ) : 'رفع الصور'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pages Grid */}
        {pagesLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : imagePages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد صفحات. اضغط على "رفع صور الصفحات" للبدء.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {imagePages.map((page) => (
              <Card key={page.id} className="overflow-hidden group">
                <div
                  className="aspect-[1024/1656] bg-muted relative cursor-pointer"
                  onClick={() => { setPreviewImage(page.imageUrl); setIsPreviewOpen(true); }}
                >
                  <img
                    src={page.imageUrl}
                    alt={`صفحة ${page.pageNumber}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                </div>
                <CardContent className="p-2 flex justify-between items-center">
                  <span className="text-sm font-medium">صفحة {page.pageNumber}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeletePage(page.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <img src={previewImage} alt="معاينة الصفحة" className="w-full h-auto" />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // TTF Fonts Management View
  if (selectedTtfEdition) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setSelectedTtfEdition(null)}>
            <ChevronRight className="w-4 h-4 ml-1" />
            رجوع
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{selectedTtfEdition.nameArabic}</h1>
            <p className="text-muted-foreground">{selectedTtfEdition.nameEnglish}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'ملف خط', value: selectedTtfEdition.stats?.fonts || 0 },
            { label: 'آية', value: selectedTtfEdition.stats?.ayat || 0 },
            { label: 'كلمة', value: selectedTtfEdition.stats?.words || 0 },
            { label: 'تمييز', value: selectedTtfEdition.stats?.discriminators || 0 },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Special Font Info */}
        {selectedTtfEdition.specialFontUrl && (
          <Card className="border-primary">
            <CardContent className="pt-4 flex items-center gap-4">
              <FileCode className="w-8 h-8 text-primary" />
              <div>
                <p className="font-semibold">الخط الخاص (لأسماء السور والبسملة)</p>
                <p className="text-sm text-muted-foreground">{selectedTtfEdition.specialFontUrl}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Fonts */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">ملفات الخطوط</h2>
          <Dialog open={isUploadFontsOpen} onOpenChange={setIsUploadFontsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 ml-2" />
                رفع ملفات الخطوط
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>رفع ملفات الخطوط TTF</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUploadTtfFonts} className="space-y-4">
                <div>
                  <Label>رقم الصفحة الأولى</Label>
                  <Input
                    type="number"
                    value={startPage}
                    onChange={(e) => setStartPage(e.target.value)}
                    min="1"
                    max="604"
                  />
                </div>
                <div>
                  <Label>ملفات الخطوط (مرتبة حسب رقم الصفحة)</Label>
                  <Input
                    ref={ttfPageFilesRef}
                    type="file"
                    accept=".ttf"
                    multiple
                  />
                </div>
                {uploadProgress > 0 && (
                  <Progress value={uploadProgress} className="w-full" />
                )}
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري الرفع...
                    </>
                  ) : 'رفع الملفات'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Fonts Grid */}
        {pagesLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : ttfFonts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <FileCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد ملفات خطوط. اضغط على "رفع ملفات الخطوط" للبدء.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {ttfFonts.map((font) => (
              <Card key={font.id} className="overflow-hidden">
                <CardContent className="p-3 text-center">
                  <FileCode className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="font-bold text-sm">صفحة {font.pageNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    {(font.fileSize / 1024).toFixed(1)} KB
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive mt-2"
                    onClick={() => handleDeleteFont(font.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Main View
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">إدارة المصاحف</h2>
          <p className="text-muted-foreground">إدارة مصاحف الصور ومصاحف الخطوط</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ImageIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{imageEditions.length}</p>
                <p className="text-xs text-muted-foreground">مصاحف الصور</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <FileText className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ttfEditions.length}</p>
                <p className="text-xs text-muted-foreground">مصاحف TTF</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <BookOpen className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {imageEditions.reduce((sum, e) => sum + (e.stats?.pages || 0), 0) +
                   ttfEditions.reduce((sum, e) => sum + (e.stats?.fonts || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">إجمالي الصفحات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Settings className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {[...imageEditions, ...ttfEditions].filter(e => e.isDefault).length}
                </p>
                <p className="text-xs text-muted-foreground">المصاحف الافتراضية</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-8">
          {/* Image Mushafs Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  مصاحف الصور
                </CardTitle>
                <CardDescription>مصاحف تعتمد على صور الصفحات مع إحداثيات الكلمات</CardDescription>
              </div>
              <Button onClick={() => setIsAddImageOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة مصحف صور
              </Button>
            </CardHeader>
            <CardContent>
              {imageEditions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد مصاحف صور</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {imageEditions.map((edition) => (
                    <div key={edition.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{edition.nameArabic}</h3>
                          <p className="text-sm text-muted-foreground">{edition.nameEnglish}</p>
                        </div>
                        <div className="flex gap-1">
                          {edition.isDefault && <Badge variant="default" className="text-xs">افتراضي</Badge>}
                          <Badge variant="outline" className="text-xs">صور</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{getNarrationName(edition.narration)}</p>
                      <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-bold">{edition.stats?.pages || 0}</div>
                          <div className="text-xs text-muted-foreground">صفحة</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-bold">{edition.stats?.ayat || 0}</div>
                          <div className="text-xs text-muted-foreground">آية</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-bold">{edition.stats?.words || 0}</div>
                          <div className="text-xs text-muted-foreground">كلمة</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-bold">{edition.stats?.lines || 0}</div>
                          <div className="text-xs text-muted-foreground">سطر</div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-3">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedImageEdition(edition);
                            fetchImagePages(edition.id);
                          }}
                        >
                          <Settings className="h-4 w-4 ml-1" />
                          إدارة الصفحات
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteTarget({ type: 'image', id: edition.id, name: edition.nameArabic })}
                        >
                          <Trash2 className="h-4 w-4 ml-1" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* TTF Mushafs Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  مصاحف الخطوط (TTF)
                </CardTitle>
                <CardDescription>مصاحف تعتمد على خطوط TTF مع رموز Glyphs</CardDescription>
              </div>
              <Button onClick={() => setIsAddTtfOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة مصحف TTF
              </Button>
            </CardHeader>
            <CardContent>
              {ttfEditions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد مصاحف TTF</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {ttfEditions.map((edition) => (
                    <div key={edition.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{edition.nameArabic}</h3>
                          <p className="text-sm text-muted-foreground">{edition.nameEnglish}</p>
                        </div>
                        <div className="flex gap-1">
                          {edition.isDefault && <Badge variant="default" className="text-xs">افتراضي</Badge>}
                          {edition.specialFontUrl && <Badge variant="secondary" className="text-xs">خط خاص</Badge>}
                          <Badge variant="outline" className="text-xs">TTF</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{getNarrationName(edition.narration)} • {edition.type}</p>
                      <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-bold">{edition.stats?.fonts || 0}</div>
                          <div className="text-xs text-muted-foreground">خط</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-bold">{edition.stats?.ayat || 0}</div>
                          <div className="text-xs text-muted-foreground">آية</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-bold">{edition.stats?.words || 0}</div>
                          <div className="text-xs text-muted-foreground">كلمة</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-bold">{edition.stats?.discriminators || 0}</div>
                          <div className="text-xs text-muted-foreground">تمييز</div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-3">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedTtfEdition(edition);
                            fetchTtfFonts(edition.id);
                          }}
                        >
                          <Settings className="h-4 w-4 ml-1" />
                          إدارة الخطوط
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteTarget({ type: 'ttf', id: edition.id, name: edition.nameArabic })}
                        >
                          <Trash2 className="h-4 w-4 ml-1" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Image Mushaf Dialog */}
      <Dialog open={isAddImageOpen} onOpenChange={(open) => { setIsAddImageOpen(open); if (!open) resetImageForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة مصحف صور جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الاسم بالعربية *</Label>
                <Input
                  value={imageForm.nameArabic}
                  onChange={(e) => setImageForm({ ...imageForm, nameArabic: e.target.value })}
                  placeholder="مصحف المدينة"
                />
              </div>
              <div>
                <Label>الاسم بالإنجليزية *</Label>
                <Input
                  value={imageForm.nameEnglish}
                  onChange={(e) => setImageForm({ ...imageForm, nameEnglish: e.target.value })}
                  placeholder="Madinah Mushaf"
                />
              </div>
            </div>
            <div>
              <Label>الرابط (Slug)</Label>
              <Input
                value={imageForm.slug}
                onChange={(e) => setImageForm({ ...imageForm, slug: e.target.value })}
                placeholder="madinah-mushaf"
              />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea
                value={imageForm.description}
                onChange={(e) => setImageForm({ ...imageForm, description: e.target.value })}
                placeholder="وصف المصحف..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>العرض</Label>
                <Input
                  type="number"
                  value={imageForm.width}
                  onChange={(e) => setImageForm({ ...imageForm, width: e.target.value })}
                />
              </div>
              <div>
                <Label>الارتفاع</Label>
                <Input
                  type="number"
                  value={imageForm.height}
                  onChange={(e) => setImageForm({ ...imageForm, height: e.target.value })}
                />
              </div>
              <div>
                <Label>عدد الصفحات</Label>
                <Input
                  type="number"
                  value={imageForm.totalPages}
                  onChange={(e) => setImageForm({ ...imageForm, totalPages: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>الرواية</Label>
              <select
                className="w-full border rounded-md p-2 bg-background"
                value={imageForm.narration}
                onChange={(e) => setImageForm({ ...imageForm, narration: e.target.value })}
              >
                <option value="1">حفص عن عاصم</option>
                <option value="2">ورش عن نافع</option>
                <option value="3">قالون عن نافع</option>
                <option value="4">الدوري عن أبي عمرو</option>
              </select>
            </div>
            <div className="border-t pt-4">
              <Label className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4" />
                ملف قاعدة البيانات (SQLite) - اختياري
              </Label>
              <Input
                ref={imageDbFileRef}
                type="file"
                accept=".db,.sqlite,.sqlite3"
                onChange={(e) => setImageDbFile(e.target.files?.[0] || null)}
              />
              {imageDbFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  {imageDbFile.name} ({(imageDbFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                إذا رفعت ملف قاعدة البيانات، سيتم استيراد البيانات تلقائياً
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={imageForm.isDefault}
                onCheckedChange={(checked) => setImageForm({ ...imageForm, isDefault: checked })}
              />
              <Label>المصحف الافتراضي</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddImageOpen(false); resetImageForm(); }}>إلغاء</Button>
            <Button onClick={handleAddImageMushaf} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add TTF Mushaf Dialog */}
      <Dialog open={isAddTtfOpen} onOpenChange={(open) => { setIsAddTtfOpen(open); if (!open) resetTtfForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة مصحف TTF جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الاسم بالعربية *</Label>
                <Input
                  value={ttfForm.nameArabic}
                  onChange={(e) => setTtfForm({ ...ttfForm, nameArabic: e.target.value })}
                  placeholder="مصحف عثماني"
                />
              </div>
              <div>
                <Label>الاسم بالإنجليزية *</Label>
                <Input
                  value={ttfForm.nameEnglish}
                  onChange={(e) => setTtfForm({ ...ttfForm, nameEnglish: e.target.value })}
                  placeholder="Uthmani Mushaf"
                />
              </div>
            </div>
            <div>
              <Label>الرابط (Slug)</Label>
              <Input
                value={ttfForm.slug}
                onChange={(e) => setTtfForm({ ...ttfForm, slug: e.target.value })}
                placeholder="uthmani-mushaf"
              />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea
                value={ttfForm.description}
                onChange={(e) => setTtfForm({ ...ttfForm, description: e.target.value })}
                placeholder="وصف المصحف..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>العرض</Label>
                <Input
                  type="number"
                  value={ttfForm.width}
                  onChange={(e) => setTtfForm({ ...ttfForm, width: e.target.value })}
                />
              </div>
              <div>
                <Label>الارتفاع</Label>
                <Input
                  type="number"
                  value={ttfForm.height}
                  onChange={(e) => setTtfForm({ ...ttfForm, height: e.target.value })}
                />
              </div>
              <div>
                <Label>عدد الصفحات</Label>
                <Input
                  type="number"
                  value={ttfForm.totalPages}
                  onChange={(e) => setTtfForm({ ...ttfForm, totalPages: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الرواية</Label>
                <select
                  className="w-full border rounded-md p-2 bg-background"
                  value={ttfForm.narration}
                  onChange={(e) => setTtfForm({ ...ttfForm, narration: e.target.value })}
                >
                  <option value="1">حفص عن عاصم</option>
                  <option value="2">ورش عن نافع</option>
                  <option value="3">قالون عن نافع</option>
                  <option value="4">الدوري عن أبي عمرو</option>
                </select>
              </div>
              <div>
                <Label>نوع الخط</Label>
                <select
                  className="w-full border rounded-md p-2 bg-background"
                  value={ttfForm.type}
                  onChange={(e) => setTtfForm({ ...ttfForm, type: e.target.value })}
                >
                  <option value="uthmani">عثماني</option>
                  <option value="indopak">إندوباك</option>
                  <option value="nastaleeq">نستعليق</option>
                </select>
              </div>
            </div>
            
            {/* DB File */}
            <div className="border-t pt-4">
              <Label className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4" />
                ملف قاعدة البيانات (SQLite) *
              </Label>
              <Input
                ref={ttfDbFileRef}
                type="file"
                accept=".db,.sqlite,.sqlite3"
                onChange={(e) => setTtfDbFile(e.target.files?.[0] || null)}
              />
              {ttfDbFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  {ttfDbFile.name} ({(ttfDbFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Font Files */}
            <div className="border-t pt-4">
              <Label className="flex items-center gap-2 mb-2">
                <FileCode className="h-4 w-4" />
                ملفات الخطوط (TTF) - اختياري
              </Label>
              <Input
                ref={ttfFontFilesRef}
                type="file"
                accept=".ttf"
                multiple
                onChange={(e) => setTtfFontFiles(Array.from(e.target.files || []))}
              />
              {ttfFontFiles.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  تم اختيار {ttfFontFiles.length} ملف
                </p>
              )}
            </div>

            {/* Special Font */}
            <div className="border-t pt-4">
              <Label className="flex items-center gap-2 mb-2">
                <FileCode className="h-4 w-4 text-primary" />
                الخط الخاص (000.ttf) - لأسماء السور والبسملة
              </Label>
              <Input
                ref={specialFontRef}
                type="file"
                accept=".ttf"
                onChange={(e) => setSpecialFontFile(e.target.files?.[0] || null)}
              />
              {specialFontFile && (
                <p className="text-sm text-green-600 mt-1">
                  {specialFontFile.name} ({(specialFontFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                هذا الخط يُستخدم لأسماء السور والبسملة
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={ttfForm.isDefault}
                onCheckedChange={(checked) => setTtfForm({ ...ttfForm, isDefault: checked })}
              />
              <Label>المصحف الافتراضي</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddTtfOpen(false); resetTtfForm(); }}>إلغاء</Button>
            <Button onClick={handleAddTtfMushaf} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف مصحف "{deleteTarget?.name}"؟
              <br />
              <span className="text-destructive text-sm">⚠️ سيتم حذف جميع البيانات المرتبطة بالمصحف</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <Button
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حذف
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
