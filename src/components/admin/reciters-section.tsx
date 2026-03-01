'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Star,
  Globe,
  Mic,
  Loader2,
  Upload,
  Play,
  Music,
  FileAudio,
  Download,
  Link,
  Import,
  Eye,
  AlertCircle
} from 'lucide-react';

interface ReciterData {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  slug: string;
  country: string;
  style: string;
  biography?: string;
  isActive: boolean;
  isFeatured: boolean;
  recitationsCount: number;
}

interface RecitationData {
  id: string;
  reciterId: string;
  ayahId: number;
  surahId: number;
  audioUrl: string;
  audioFormat: string;
  fileSize?: number;
  duration?: number;
  quality?: string;
  isActive: boolean;
  ayahNumber?: number;
  verseGlobal?: number;
  surahName?: string;
  surahNameArabic?: string;
}

const initialFormState = {
  nameArabic: '',
  nameEnglish: '',
  slug: '',
  country: '',
  style: 'Hafs',
  biography: '',
  isActive: true,
  isFeatured: false,
};

const initialImportState = {
  urlPattern: 'https://cdn.islamic.network/quran/audio/128/ar.minshawi/{ayah_id}.mp3',
  ayahFrom: 1,
  ayahTo: 6236,
  quality: 'high',
};

export function RecitersSection() {
  const [reciters, setReciters] = useState<ReciterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isViewAudioDialogOpen, setIsViewAudioDialogOpen] = useState(false);
  
  // Selected items
  const [selectedReciter, setSelectedReciter] = useState<ReciterData | null>(null);
  const [recitations, setRecitations] = useState<RecitationData[]>([]);
  const [loadingRecitations, setLoadingRecitations] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState(initialFormState);
  const [importData, setImportData] = useState(initialImportState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState({ current: 0, total: 0, surah: '' });

  // Fetch reciters
  const fetchReciters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('all', 'true'); // Show all reciters including inactive
      if (searchQuery) params.set('search', searchQuery);
      
      const response = await fetch(`/api/reciters?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setReciters(result.data);
      }
    } catch (error) {
      toast.error('Failed to load reciters');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Fetch recitations
  const fetchRecitations = useCallback(async (reciterId: string) => {
    setLoadingRecitations(true);
    try {
      const response = await fetch(`/api/recitations?reciterId=${reciterId}`);
      const result = await response.json();
      if (result.success) {
        setRecitations(result.data);
      }
    } catch (error) {
      toast.error('Failed to load recitations');
    } finally {
      setLoadingRecitations(false);
    }
  }, []);

  useEffect(() => {
    fetchReciters();
  }, [fetchReciters]);

  // Create reciter
  const handleCreate = async () => {
    if (!formData.nameArabic || !formData.nameEnglish || !formData.slug) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reciters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();

      if (result.success) {
        toast.success('Reciter created successfully');
        setIsAddDialogOpen(false);
        setFormData(initialFormState);
        fetchReciters();
      } else {
        toast.error(result.error || 'Failed to create reciter');
      }
    } catch (error) {
      toast.error('Failed to create reciter');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update reciter
  const handleUpdate = async () => {
    if (!selectedReciter) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/reciters/${selectedReciter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();

      if (result.success) {
        toast.success('Reciter updated successfully');
        setIsEditDialogOpen(false);
        setSelectedReciter(null);
        setFormData(initialFormState);
        fetchReciters();
      } else {
        toast.error(result.error || 'Failed to update reciter');
      }
    } catch (error) {
      toast.error('Failed to update reciter');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete reciter
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedReciter) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/reciters/${selectedReciter.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success('Reciter deleted successfully');
        setIsDeleteDialogOpen(false);
        setSelectedReciter(null);
        fetchReciters();
      } else {
        toast.error(result.error || 'Failed to delete reciter');
      }
    } catch (error) {
      toast.error('Failed to delete reciter');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Import from URL
  const handleImportFromUrl = async () => {
    if (!selectedReciter) {
      toast.error('No reciter selected');
      return;
    }

    if (!importData.urlPattern.includes('{ayah_id}')) {
      toast.error('URL pattern must contain {ayah_id}');
      return;
    }

    setIsSubmitting(true);
    setImportProgress(0);
    setImportStats({ current: 0, total: importData.ayahTo - importData.ayahFrom + 1, surah: '' });

    try {
      const response = await fetch('/api/recitations/import-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reciterId: selectedReciter.id,
          urlPattern: importData.urlPattern,
          ayahFrom: importData.ayahFrom,
          ayahTo: importData.ayahTo,
          quality: importData.quality,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Imported ${result.data.imported} audio files!`);
        setIsImportDialogOpen(false);
        setImportData(initialImportState);
        fetchReciters();
      } else {
        toast.error(result.error || 'Failed to import audio');
      }
    } catch (error) {
      toast.error('Failed to import audio files');
    } finally {
      setIsSubmitting(false);
      setImportProgress(0);
    }
  };

  // Open dialogs
  const openEditDialog = (reciter: ReciterData) => {
    setSelectedReciter(reciter);
    setFormData({
      nameArabic: reciter.nameArabic,
      nameEnglish: reciter.nameEnglish,
      slug: reciter.slug,
      country: reciter.country || '',
      style: reciter.style || 'Hafs',
      biography: reciter.biography || '',
      isActive: reciter.isActive,
      isFeatured: reciter.isFeatured,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (reciter: ReciterData) => {
    setSelectedReciter(reciter);
    setIsDeleteDialogOpen(true);
  };

  const openImportDialog = (reciter: ReciterData) => {
    setSelectedReciter(reciter);
    setImportData(initialImportState);
    setIsImportDialogOpen(true);
  };

  const openViewAudioDialog = async (reciter: ReciterData) => {
    setSelectedReciter(reciter);
    setIsViewAudioDialogOpen(true);
    await fetchRecitations(reciter.id);
  };

  // Delete single audio file (RecitationAyah)
  const handleDeleteRecitation = async (recitationAyahId: string) => {
    try {
      const response = await fetch(`/api/recitations?recitationAyahId=${recitationAyahId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success('Audio file deleted');
        if (selectedReciter) {
          fetchRecitations(selectedReciter.id);
        }
      } else {
        toast.error('Failed to delete audio');
      }
    } catch (error) {
      toast.error('Failed to delete audio');
    }
  };

  // Delete all recitations for a reciter
  const handleDeleteAllAudio = async () => {
    if (!selectedReciter) return;
    
    try {
      const response = await fetch(`/api/recitations?reciterId=${selectedReciter.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success(`Deleted ${result.data.deleted} audio files`);
        setRecitations([]);
        fetchReciters();
      } else {
        toast.error('Failed to delete audio');
      }
    } catch (error) {
      toast.error('Failed to delete audio');
    }
  };

  // Generate slug
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Stats
  const stats = {
    total: reciters.length,
    active: reciters.filter(r => r.isActive).length,
    featured: reciters.filter(r => r.isFeatured).length,
    totalRecitations: reciters.reduce((sum, r) => sum + (r.recitationsCount || 0), 0),
  };

  // Calculate ayah count for display
  const ayahCount = importData.ayahTo - importData.ayahFrom + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reciters & Audio Management</h2>
          <p className="text-muted-foreground">Manage Quran reciters and their audio recitations</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(initialFormState)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Reciter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Reciter</DialogTitle>
              <DialogDescription>
                Add a new Quran reciter to the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nameArabic">Name (Arabic) *</Label>
                <Input 
                  id="nameArabic" 
                  placeholder="أحمد العجمي" 
                  dir="rtl"
                  value={formData.nameArabic}
                  onChange={(e) => setFormData({ ...formData, nameArabic: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEnglish">Name (English) *</Label>
                <Input 
                  id="nameEnglish" 
                  placeholder="Ahmed Al-Ajmy"
                  value={formData.nameEnglish}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    nameEnglish: e.target.value,
                    slug: generateSlug(e.target.value)
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input 
                  id="slug" 
                  placeholder="ahmed-alajmy"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input 
                    id="country" 
                    placeholder="Saudi Arabia"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="style">Style</Label>
                  <Input 
                    id="style" 
                    placeholder="Hafs"
                    value={formData.style}
                    onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="featured"
                    checked={formData.isFeatured}
                    onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                  />
                  <Label htmlFor="featured">Featured</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Reciter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Reciters</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Globe className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.featured}</p>
                <p className="text-xs text-muted-foreground">Featured</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/10">
                <Music className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalRecitations.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Audios</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reciters Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Reciters</CardTitle>
              <CardDescription>Manage reciters and their audio files</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search reciters..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reciters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reciters found. Add your first reciter to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reciter</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Style</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Audio Files</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reciters.map((reciter) => (
                  <TableRow key={reciter.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Mic className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{reciter.nameEnglish}</span>
                          <span className="text-sm text-muted-foreground" dir="rtl">{reciter.nameArabic}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{reciter.slug}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{reciter.style || 'Hafs'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {reciter.isActive ? (
                          <Badge variant="default" className="bg-emerald-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {reciter.isFeatured && (
                          <Badge variant="outline" className="text-amber-500 border-amber-500">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-mono">
                        <Music className="h-3 w-3 mr-1" />
                        {reciter.recitationsCount?.toLocaleString() || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onClick={() => openImportDialog(reciter)}>
                            <Link className="h-4 w-4 mr-2" />
                            Import Audio from URL
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openViewAudioDialog(reciter)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Audio Files
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(reciter)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Reciter
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(reciter)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Import Audio Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Import Audio from URL
            </DialogTitle>
            <DialogDescription>
              Import audio recitations for <strong>{selectedReciter?.nameEnglish}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* URL Pattern Input */}
            <div className="space-y-2">
              <Label>URL Pattern *</Label>
              <Input 
                value={importData.urlPattern}
                onChange={(e) => setImportData({ ...importData, urlPattern: e.target.value })}
                placeholder="https://cdn.islamic.network/quran/audio/128/ar.minshawi/{ayah_id}.mp3"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{'{ayah_id}'}</code> as placeholder for the global ayah number (1-6236)
              </p>
            </div>

            {/* Quick URL Templates */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Quick Templates (Click to use):</p>
              <div className="grid grid-cols-1 gap-1">
                <button 
                  className="text-xs text-left p-2 rounded hover:bg-muted font-mono truncate"
                  onClick={() => setImportData(prev => ({ ...prev, urlPattern: 'https://cdn.islamic.network/quran/audio/128/ar.minshawi/{ayah_id}.mp3' }))}
                >
                  <span className="text-primary">Minshawi:</span> https://cdn.islamic.network/quran/audio/128/ar.minshawi/{'{ayah_id}'}.mp3
                </button>
                <button 
                  className="text-xs text-left p-2 rounded hover:bg-muted font-mono truncate"
                  onClick={() => setImportData(prev => ({ ...prev, urlPattern: 'https://cdn.islamic.network/quran/audio/128/ar.abdulbasitmurattal/{ayah_id}.mp3' }))}
                >
                  <span className="text-primary">Abdul Basit:</span> https://cdn.islamic.network/quran/audio/128/ar.abdulbasitmurattal/{'{ayah_id}'}.mp3
                </button>
                <button 
                  className="text-xs text-left p-2 rounded hover:bg-muted font-mono truncate"
                  onClick={() => setImportData(prev => ({ ...prev, urlPattern: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/{ayah_id}.mp3' }))}
                >
                  <span className="text-primary">Alafasy:</span> https://cdn.islamic.network/quran/audio/128/ar.alafasy/{'{ayah_id}'}.mp3
                </button>
                <button 
                  className="text-xs text-left p-2 rounded hover:bg-muted font-mono truncate"
                  onClick={() => setImportData(prev => ({ ...prev, urlPattern: 'https://cdn.islamic.network/quran/audio/128/ar.husry/{ayah_id}.mp3' }))}
                >
                  <span className="text-primary">Husary:</span> https://cdn.islamic.network/quran/audio/128/ar.husry/{'{ayah_id}'}.mp3
                </button>
                <button 
                  className="text-xs text-left p-2 rounded hover:bg-muted font-mono truncate"
                  onClick={() => setImportData(prev => ({ ...prev, urlPattern: 'https://cdn.islamic.network/quran/audio/128/ar.sudais/{ayah_id}.mp3' }))}
                >
                  <span className="text-primary">Sudais:</span> https://cdn.islamic.network/quran/audio/128/ar.sudais/{'{ayah_id}'}.mp3
                </button>
              </div>
            </div>

            {/* Ayah Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Ayah ID (Global)</Label>
                <Input 
                  type="number"
                  min={1}
                  max={6236}
                  value={importData.ayahFrom}
                  onChange={(e) => setImportData({ ...importData, ayahFrom: Math.min(6236, Math.max(1, parseInt(e.target.value) || 1)) })}
                />
              </div>
              <div className="space-y-2">
                <Label>To Ayah ID (Global)</Label>
                <Input 
                  type="number"
                  min={1}
                  max={6236}
                  value={importData.ayahTo}
                  onChange={(e) => setImportData({ ...importData, ayahTo: Math.min(6236, Math.max(1, parseInt(e.target.value) || 6236)) })}
                />
              </div>
            </div>

            {/* Ayah Count Display */}
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
              <AlertCircle className="h-4 w-4 text-primary" />
              <span className="text-sm">
                This will import <strong>{ayahCount.toLocaleString()} audio files</strong> (Ayah {importData.ayahFrom} to {importData.ayahTo})
              </span>
            </div>

            {/* Quality */}
            <div className="space-y-2">
              <Label>Audio Quality</Label>
              <div className="grid grid-cols-4 gap-2">
                {['low', 'medium', 'high', 'lossless'].map((q) => (
                  <Button
                    key={q}
                    variant={importData.quality === q ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setImportData({ ...importData, quality: q })}
                    className="capitalize"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>

            {/* Progress */}
            {isSubmitting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importing audio files...</span>
                  <span>{importStats.current} / {importStats.total}</span>
                </div>
                <Progress value={(importStats.current / importStats.total) * 100} />
                {importStats.surah && (
                  <p className="text-xs text-muted-foreground">Processing: {importStats.surah}</p>
                )}
              </div>
            )}

            {/* Preview */}
            <div className="space-y-2">
              <Label>URL Preview</Label>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs space-y-1 max-h-32 overflow-auto">
                <p className="text-muted-foreground">Ayah {importData.ayahFrom}:</p>
                <p className="text-primary truncate">{importData.urlPattern.replace('{ayah_id}', String(importData.ayahFrom))}</p>
                {ayahCount > 1 && (
                  <>
                    <p className="text-muted-foreground mt-2">Ayah {importData.ayahTo}:</p>
                    <p className="text-primary truncate">{importData.urlPattern.replace('{ayah_id}', String(importData.ayahTo))}</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleImportFromUrl} disabled={isSubmitting || ayahCount <= 0}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Import className="h-4 w-4 mr-2" />
              )}
              Import {ayahCount.toLocaleString()} Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Audio Dialog */}
      <Dialog open={isViewAudioDialogOpen} onOpenChange={setIsViewAudioDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Audio Files - {selectedReciter?.nameEnglish}
            </DialogTitle>
            <DialogDescription>
              {recitations.length} audio files uploaded
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            {loadingRecitations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : recitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audio files uploaded yet.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setIsViewAudioDialogOpen(false);
                    if (selectedReciter) openImportDialog(selectedReciter);
                  }}
                >
                  <Link className="h-4 w-4 mr-2" />
                  Import Audio from URL
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">#</TableHead>
                    <TableHead>Surah</TableHead>
                    <TableHead className="text-center">Ayah</TableHead>
                    <TableHead>Audio URL</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recitations.map((recitation) => (
                    <TableRow key={recitation.id}>
                      <TableCell className="text-center font-mono">
                        <Badge variant="outline" className="font-mono">
                          {recitation.verseGlobal || recitation.ayahId}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{recitation.surahName || `Surah ${recitation.surahId}`}</span>
                        {recitation.surahNameArabic && (
                          <span className="text-xs text-muted-foreground mr-2" dir="rtl">
                            {recitation.surahNameArabic}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {recitation.ayahNumber || '-'}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px] block">
                          {recitation.audioUrl ? recitation.audioUrl.split('/').pop() : '-'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{recitation.quality || 'high'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <a href={recitation.audioUrl} target="_blank" rel="noopener noreferrer">
                              <Play className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={recitation.audioUrl} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteRecitation(recitation.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          {recitations.length > 0 && (
            <div className="flex justify-between items-center pt-4 border-t">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteAllAudio}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Audio
              </Button>
              <Badge variant="outline">Total: {recitations.length} files</Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Reciter</DialogTitle>
            <DialogDescription>
              Update reciter information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nameArabic">Name (Arabic) *</Label>
              <Input 
                id="edit-nameArabic" 
                dir="rtl"
                value={formData.nameArabic}
                onChange={(e) => setFormData({ ...formData, nameArabic: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nameEnglish">Name (English) *</Label>
              <Input 
                id="edit-nameEnglish"
                value={formData.nameEnglish}
                onChange={(e) => setFormData({ ...formData, nameEnglish: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug *</Label>
              <Input 
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-country">Country</Label>
                <Input 
                  id="edit-country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-style">Style</Label>
                <Input 
                  id="edit-style"
                  value={formData.style}
                  onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="edit-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="edit-featured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                />
                <Label htmlFor="edit-featured">Featured</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Reciter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reciter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedReciter?.nameEnglish}</strong>? 
              This will also delete all {selectedReciter?.recitationsCount || 0} associated audio files.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <Button 
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
