'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  BookOpen,
  Languages,
  Star,
  FileText,
  Loader2,
  Download,
  Upload
} from 'lucide-react';

interface TafsirSourceData {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  slug: string;
  authorArabic?: string;
  authorEnglish?: string;
  language: string;
  isDefault: boolean;
  isActive: boolean;
  entriesCount: number;
}

const initialFormState = {
  nameArabic: '',
  nameEnglish: '',
  slug: '',
  authorArabic: '',
  authorEnglish: '',
  language: 'ar',
  description: '',
  isDefault: false,
  isActive: true,
};

export function TafsirSection() {
  const [sources, setSources] = useState<TafsirSourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<TafsirSourceData | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch tafsir sources
  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('all', 'true');
      if (searchQuery) params.set('search', searchQuery);
      
      const response = await fetch(`/api/tafsir?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setSources(result.data);
      }
    } catch (error) {
      toast.error('Failed to load tafsir sources');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Create tafsir source
  const handleCreate = async () => {
    if (!formData.nameArabic || !formData.nameEnglish || !formData.slug) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tafsir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();

      if (result.success) {
        toast.success('Tafsir source created successfully');
        setIsAddDialogOpen(false);
        setFormData(initialFormState);
        fetchSources();
      } else {
        toast.error(result.error || 'Failed to create tafsir source');
      }
    } catch (error) {
      toast.error('Failed to create tafsir source');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update tafsir source
  const handleUpdate = async () => {
    if (!selectedSource) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tafsir/${selectedSource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();

      if (result.success) {
        toast.success('Tafsir source updated successfully');
        setIsEditDialogOpen(false);
        setSelectedSource(null);
        setFormData(initialFormState);
        fetchSources();
      } else {
        toast.error(result.error || 'Failed to update tafsir source');
      }
    } catch (error) {
      toast.error('Failed to update tafsir source');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete tafsir source
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedSource) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tafsir/${selectedSource.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success('Tafsir source deleted successfully');
        setIsDeleteDialogOpen(false);
        setSelectedSource(null);
        fetchSources();
      } else {
        toast.error(result.error || 'Failed to delete tafsir source');
      }
    } catch (error) {
      toast.error('Failed to delete tafsir source');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (source: TafsirSourceData) => {
    setSelectedSource(source);
    setFormData({
      nameArabic: source.nameArabic,
      nameEnglish: source.nameEnglish,
      slug: source.slug,
      authorArabic: source.authorArabic || '',
      authorEnglish: source.authorEnglish || '',
      language: source.language,
      description: '',
      isDefault: source.isDefault,
      isActive: source.isActive,
    });
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (source: TafsirSourceData) => {
    setSelectedSource(source);
    setIsDeleteDialogOpen(true);
  };

  // Generate slug
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  // Export handlers
  const handleExportJSON = async () => {
    try {
      const response = await fetch('/api/tafsir/export?format=json');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tafsir-export.json';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export completed');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/tafsir/export?format=csv');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tafsir-export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export completed');
    } catch {
      toast.error('Export failed');
    }
  };

  // Stats
  const stats = {
    total: sources.length,
    active: sources.filter(s => s.isActive).length,
    languages: new Set(sources.map(s => s.language)).size,
    defaultSource: sources.find(s => s.isDefault)?.nameEnglish || 'None',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tafsir Management</h2>
          <p className="text-muted-foreground">Manage tafsir sources and commentary entries</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(initialFormState)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tafsir Source
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Tafsir Source</DialogTitle>
              <DialogDescription>
                Add a new tafsir source to the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tafsirNameArabic">Name (Arabic) *</Label>
                <Input 
                  id="tafsirNameArabic" 
                  placeholder="تفسير ..." 
                  dir="rtl"
                  value={formData.nameArabic}
                  onChange={(e) => setFormData({ ...formData, nameArabic: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tafsirNameEnglish">Name (English) *</Label>
                <Input 
                  id="tafsirNameEnglish" 
                  placeholder="Tafsir ..."
                  value={formData.nameEnglish}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    nameEnglish: e.target.value,
                    slug: generateSlug(e.target.value)
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tafsirSlug">Slug *</Label>
                <Input 
                  id="tafsirSlug" 
                  placeholder="tafsir-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="authorArabic">Author (Arabic)</Label>
                  <Input 
                    id="authorArabic" 
                    placeholder="ابن كثير"
                    dir="rtl"
                    value={formData.authorArabic}
                    onChange={(e) => setFormData({ ...formData, authorArabic: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authorEnglish">Author (English)</Label>
                  <Input 
                    id="authorEnglish" 
                    placeholder="Ibn Kathir"
                    value={formData.authorEnglish}
                    onChange={(e) => setFormData({ ...formData, authorEnglish: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input 
                  id="language" 
                  placeholder="ar"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Brief description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="tafsirActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="tafsirActive">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="tafsirDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  />
                  <Label htmlFor="tafsirDefault">Default</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Source
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
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Sources</p>
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
                <Languages className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.languages}</p>
                <p className="text-xs text-muted-foreground">Languages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/10">
                <Star className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <p className="text-lg font-bold truncate">{stats.defaultSource}</p>
                <p className="text-xs text-muted-foreground">Default Source</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sources">Tafsir Sources</TabsTrigger>
          <TabsTrigger value="entries">Recent Entries</TabsTrigger>
          <TabsTrigger value="import">Import/Export</TabsTrigger>
        </TabsList>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Tafsir Sources</CardTitle>
                  <CardDescription>Manage available tafsir sources</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search sources..."
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
              ) : sources.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tafsir sources found. Add your first source to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map((source) => (
                      <TableRow key={source.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{source.nameEnglish}</span>
                            <span className="text-sm text-muted-foreground" dir="rtl">{source.nameArabic}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{source.authorEnglish || '-'}</span>
                            {source.authorArabic && (
                              <span className="text-sm text-muted-foreground" dir="rtl">{source.authorArabic}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase">{source.language}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {source.isActive ? (
                              <Badge variant="default" className="bg-emerald-500">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            {source.isDefault && (
                              <Badge variant="outline" className="text-amber-500 border-amber-500">
                                Default
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{source.entriesCount?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(source)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(source)}
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
        </TabsContent>

        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <CardTitle>Recent Tafsir Entries</CardTitle>
              <CardDescription>Recently added or updated tafsir entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { surah: 'Al-Fatihah', ayah: 1, source: 'Ibn Kathir', text: 'بسم الله الرحمن الرحيم: أي أبدأ قراءة القرآن...' },
                  { surah: 'Al-Baqarah', ayah: 255, source: 'Al-Qurtubi', text: 'آية الكرسي أعظم آية في القرآن...' },
                  { surah: 'Ya-Sin', ayah: 1, source: 'Al-Tabari', text: 'يس: حروف مقطعة في افتتاح السورة...' },
                ].map((entry, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge>{entry.surah}</Badge>
                        <span className="text-sm text-muted-foreground">Ayah {entry.ayah}</span>
                      </div>
                      <Badge variant="outline">{entry.source}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2" dir="rtl">{entry.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import / Export</CardTitle>
              <CardDescription>Bulk import or export tafsir data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-2">Import Tafsir</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Import tafsir entries from JSON or CSV files
                  </p>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
                <div className="border rounded-lg p-6 text-center">
                  <Download className="h-8 w-8 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-2">Export Tafsir</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export all tafsir data as JSON or CSV
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={handleExportJSON}>
                      <Download className="h-4 w-4 mr-2" />
                      Export JSON
                    </Button>
                    <Button variant="outline" onClick={handleExportCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tafsir Source</DialogTitle>
            <DialogDescription>
              Update tafsir source information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tafsirNameArabic">Name (Arabic) *</Label>
              <Input 
                id="edit-tafsirNameArabic" 
                dir="rtl"
                value={formData.nameArabic}
                onChange={(e) => setFormData({ ...formData, nameArabic: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tafsirNameEnglish">Name (English) *</Label>
              <Input 
                id="edit-tafsirNameEnglish"
                value={formData.nameEnglish}
                onChange={(e) => setFormData({ ...formData, nameEnglish: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tafsirSlug">Slug *</Label>
              <Input 
                id="edit-tafsirSlug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-authorArabic">Author (Arabic)</Label>
                <Input 
                  id="edit-authorArabic"
                  dir="rtl"
                  value={formData.authorArabic}
                  onChange={(e) => setFormData({ ...formData, authorArabic: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-authorEnglish">Author (English)</Label>
                <Input 
                  id="edit-authorEnglish"
                  value={formData.authorEnglish}
                  onChange={(e) => setFormData({ ...formData, authorEnglish: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-language">Language</Label>
              <Input 
                id="edit-language"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="edit-tafsirActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="edit-tafsirActive">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="edit-tafsirDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
                <Label htmlFor="edit-tafsirDefault">Default</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tafsir Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedSource?.nameEnglish}</strong>? 
              This action cannot be undone and will also delete all associated tafsir entries.
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
