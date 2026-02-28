'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Key, Link, Search } from 'lucide-react';

interface ColumnDef {
  name: string;
  type: string;
  constraints: string[];
  description?: string;
}

interface TableDef {
  name: string;
  displayName: string;
  description: string;
  columns: ColumnDef[];
  indexes: string[];
}

const databaseTables: TableDef[] = [
  {
    name: 'surahs',
    displayName: 'Surahs',
    description: 'Stores information about the 114 chapters of the Quran',
    columns: [
      { name: 'id', type: 'INT', constraints: ['PRIMARY KEY', 'AUTO INCREMENT'], description: 'Auto-generated ID' },
      { name: 'number', type: 'INT', constraints: ['UNIQUE', 'NOT NULL'], description: 'Surah number (1-114)' },
      { name: 'name_arabic', type: 'VARCHAR(100)', constraints: ['NOT NULL'], description: 'Arabic name' },
      { name: 'name_english', type: 'VARCHAR(100)', constraints: ['NOT NULL'], description: 'English name' },
      { name: 'name_translation', type: 'VARCHAR(100)', constraints: ['NOT NULL'], description: 'Translated name' },
      { name: 'revelation_type', type: 'VARCHAR(20)', constraints: ['NOT NULL'], description: 'Meccan or Medinan' },
      { name: 'total_ayahs', type: 'INT', constraints: ['NOT NULL'], description: 'Total verses count' },
      { name: 'page_number', type: 'INT', constraints: ['NOT NULL'], description: 'Starting page in Mushaf' },
      { name: 'ruku_count', type: 'INT', constraints: ['NOT NULL'], description: 'Number of rukus' },
      { name: 'manzil_number', type: 'INT', constraints: ['NOT NULL'], description: 'Manzil division (1-7)' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Update timestamp' },
    ],
    indexes: ['idx_surahs_number', 'idx_surahs_revelation_type']
  },
  {
    name: 'ayahs',
    displayName: 'Ayahs',
    description: 'Stores all 6,236 verses of the Quran',
    columns: [
      { name: 'id', type: 'INT', constraints: ['PRIMARY KEY', 'AUTO INCREMENT'], description: 'Auto-generated ID' },
      { name: 'surah_id', type: 'INT', constraints: ['NOT NULL', 'FK → surahs.id'], description: 'Reference to surah' },
      { name: 'number', type: 'INT', constraints: ['NOT NULL'], description: 'Ayah number in surah' },
      { name: 'number_in_quran', type: 'INT', constraints: ['UNIQUE', 'NOT NULL'], description: 'Global ayah number (1-6236)' },
      { name: 'text_arabic', type: 'TEXT', constraints: ['NOT NULL'], description: 'Arabic text with diacritics' },
      { name: 'text_simple', type: 'TEXT', constraints: ['NOT NULL'], description: 'Simplified Arabic without diacritics' },
      { name: 'page_number', type: 'INT', constraints: ['NOT NULL'], description: 'Page number in Mushaf' },
      { name: 'juz_number', type: 'INT', constraints: ['NOT NULL'], description: 'Juz number (1-30)' },
      { name: 'hizb_number', type: 'INT', constraints: ['NOT NULL'], description: 'Hizb number (1-60)' },
      { name: 'rub_number', type: 'INT', constraints: ['NOT NULL'], description: 'Rub number (1-240)' },
      { name: 'sajdah', type: 'BOOLEAN', constraints: ['DEFAULT FALSE'], description: 'Has sajdah' },
      { name: 'sajdah_number', type: 'INT', constraints: ['NULL'], description: 'Sajdah number if applicable' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Update timestamp' },
    ],
    indexes: ['idx_ayahs_surah_number', 'idx_ayahs_number_in_quran', 'idx_ayahs_page', 'idx_ayahs_juz']
  },
  {
    name: 'reciters',
    displayName: 'Reciters',
    description: 'Information about Quran reciters (Qaris)',
    columns: [
      { name: 'id', type: 'INT', constraints: ['PRIMARY KEY', 'AUTO INCREMENT'], description: 'Auto-generated ID' },
      { name: 'name_arabic', type: 'VARCHAR(100)', constraints: ['NOT NULL'], description: 'Arabic name' },
      { name: 'name_english', type: 'VARCHAR(100)', constraints: ['NOT NULL'], description: 'English name' },
      { name: 'slug', type: 'VARCHAR(100)', constraints: ['UNIQUE', 'NOT NULL'], description: 'URL-friendly identifier' },
      { name: 'biography', type: 'TEXT', constraints: ['NULL'], description: 'Biographical information' },
      { name: 'country', type: 'VARCHAR(100)', constraints: ['NULL'], description: 'Country of origin' },
      { name: 'style', type: 'VARCHAR(50)', constraints: ['NULL'], description: 'Recitation style (Hafs, Warsh, etc.)' },
      { name: 'image_url', type: 'VARCHAR(500)', constraints: ['NULL'], description: 'Profile image URL' },
      { name: 'is_active', type: 'BOOLEAN', constraints: ['DEFAULT TRUE'], description: 'Active status' },
      { name: 'is_featured', type: 'BOOLEAN', constraints: ['DEFAULT FALSE'], description: 'Featured status' },
      { name: 'sort_order', type: 'INT', constraints: ['DEFAULT 0'], description: 'Display order' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Update timestamp' },
    ],
    indexes: ['idx_reciters_slug', 'idx_reciters_active_featured']
  },
  {
    name: 'recitations',
    displayName: 'Recitations',
    description: 'Audio file mappings for recitations',
    columns: [
      { name: 'id', type: 'INT', constraints: ['PRIMARY KEY', 'AUTO INCREMENT'], description: 'Auto-generated ID' },
      { name: 'reciter_id', type: 'INT', constraints: ['NOT NULL', 'FK → reciters.id'], description: 'Reference to reciter' },
      { name: 'ayah_id', type: 'INT', constraints: ['NOT NULL', 'FK → ayahs.id'], description: 'Reference to ayah' },
      { name: 'surah_id', type: 'INT', constraints: ['NOT NULL', 'FK → surahs.id'], description: 'Reference to surah' },
      { name: 'audio_url', type: 'VARCHAR(500)', constraints: ['NOT NULL'], description: 'CDN URL for audio file' },
      { name: 'audio_format', type: 'VARCHAR(10)', constraints: ['DEFAULT \'mp3\''], description: 'Audio format' },
      { name: 'file_size', type: 'INT', constraints: ['NULL'], description: 'File size in bytes' },
      { name: 'duration', type: 'INT', constraints: ['NULL'], description: 'Duration in seconds' },
      { name: 'bit_rate', type: 'INT', constraints: ['NULL'], description: 'Bit rate in kbps' },
      { name: 'sample_rate', type: 'INT', constraints: ['NULL'], description: 'Sample rate in Hz' },
      { name: 'quality', type: 'VARCHAR(20)', constraints: ['DEFAULT \'high\''], description: 'Quality level' },
      { name: 'is_active', type: 'BOOLEAN', constraints: ['DEFAULT TRUE'], description: 'Active status' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Update timestamp' },
    ],
    indexes: ['idx_recitations_reciter_surah', 'idx_recitations_ayah', 'UNIQUE(reciter_id, ayah_id)']
  },
  {
    name: 'tafsir_sources',
    displayName: 'Tafsir Sources',
    description: 'Available tafsir (commentary) sources',
    columns: [
      { name: 'id', type: 'INT', constraints: ['PRIMARY KEY', 'AUTO INCREMENT'], description: 'Auto-generated ID' },
      { name: 'name_arabic', type: 'VARCHAR(100)', constraints: ['NOT NULL'], description: 'Arabic name' },
      { name: 'name_english', type: 'VARCHAR(100)', constraints: ['NOT NULL'], description: 'English name' },
      { name: 'slug', type: 'VARCHAR(100)', constraints: ['UNIQUE', 'NOT NULL'], description: 'URL-friendly identifier' },
      { name: 'author_name', type: 'VARCHAR(100)', constraints: ['NOT NULL'], description: 'Author name' },
      { name: 'author_bio', type: 'TEXT', constraints: ['NULL'], description: 'Author biography' },
      { name: 'language', type: 'VARCHAR(10)', constraints: ['DEFAULT \'ar\''], description: 'Language code' },
      { name: 'description', type: 'TEXT', constraints: ['NULL'], description: 'Description' },
      { name: 'is_default', type: 'BOOLEAN', constraints: ['DEFAULT FALSE'], description: 'Default source' },
      { name: 'is_active', type: 'BOOLEAN', constraints: ['DEFAULT TRUE'], description: 'Active status' },
      { name: 'sort_order', type: 'INT', constraints: ['DEFAULT 0'], description: 'Display order' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Update timestamp' },
    ],
    indexes: ['idx_tafsir_sources_slug', 'idx_tafsir_sources_active_default']
  },
  {
    name: 'tafsir_entries',
    displayName: 'Tafsir Entries',
    description: 'Individual tafsir commentary entries',
    columns: [
      { name: 'id', type: 'INT', constraints: ['PRIMARY KEY', 'AUTO INCREMENT'], description: 'Auto-generated ID' },
      { name: 'source_id', type: 'INT', constraints: ['NOT NULL', 'FK → tafsir_sources.id'], description: 'Reference to source' },
      { name: 'surah_id', type: 'INT', constraints: ['NOT NULL', 'FK → surahs.id'], description: 'Reference to surah' },
      { name: 'ayah_id', type: 'INT', constraints: ['NOT NULL', 'FK → ayahs.id'], description: 'Reference to ayah' },
      { name: 'ayah_number_from', type: 'INT', constraints: ['NOT NULL'], description: 'Start ayah number' },
      { name: 'ayah_number_to', type: 'INT', constraints: ['NOT NULL'], description: 'End ayah number' },
      { name: 'text_arabic', type: 'TEXT', constraints: ['NULL'], description: 'Arabic commentary' },
      { name: 'text_english', type: 'TEXT', constraints: ['NULL'], description: 'English translation' },
      { name: 'text_transliteration', type: 'TEXT', constraints: ['NULL'], description: 'Transliteration' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Update timestamp' },
    ],
    indexes: ['idx_tafsir_entries_source_ayah', 'idx_tafsir_entries_surah', 'UNIQUE(source_id, surah_id, ayah_from, ayah_to)']
  },
  {
    name: 'users',
    displayName: 'Users',
    description: 'User accounts with role-based access',
    columns: [
      { name: 'id', type: 'VARCHAR(50)', constraints: ['PRIMARY KEY'], description: 'CUID identifier' },
      { name: 'email', type: 'VARCHAR(255)', constraints: ['UNIQUE', 'NOT NULL'], description: 'Email address' },
      { name: 'password_hash', type: 'VARCHAR(255)', constraints: ['NOT NULL'], description: 'Hashed password' },
      { name: 'name', type: 'VARCHAR(100)', constraints: ['NULL'], description: 'Display name' },
      { name: 'avatar_url', type: 'VARCHAR(500)', constraints: ['NULL'], description: 'Avatar image URL' },
      { name: 'role', type: 'VARCHAR(20)', constraints: ['DEFAULT \'user\''], description: 'User role (admin/editor/user)' },
      { name: 'is_active', type: 'BOOLEAN', constraints: ['DEFAULT TRUE'], description: 'Active status' },
      { name: 'email_verified', type: 'TIMESTAMP', constraints: ['NULL'], description: 'Email verification time' },
      { name: 'last_login_at', type: 'TIMESTAMP', constraints: ['NULL'], description: 'Last login timestamp' },
      { name: 'last_login_ip', type: 'VARCHAR(45)', constraints: ['NULL'], description: 'Last login IP' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Update timestamp' },
    ],
    indexes: ['idx_users_email', 'idx_users_role_active']
  },
  {
    name: 'bookmarks',
    displayName: 'Bookmarks',
    description: 'User bookmarks for verses',
    columns: [
      { name: 'id', type: 'INT', constraints: ['PRIMARY KEY', 'AUTO INCREMENT'], description: 'Auto-generated ID' },
      { name: 'user_id', type: 'VARCHAR(50)', constraints: ['NOT NULL', 'FK → users.id'], description: 'Reference to user' },
      { name: 'ayah_id', type: 'INT', constraints: ['NOT NULL', 'FK → ayahs.id'], description: 'Reference to ayah' },
      { name: 'surah_id', type: 'INT', constraints: ['NOT NULL', 'FK → surahs.id'], description: 'Reference to surah' },
      { name: 'ayah_number', type: 'INT', constraints: ['NOT NULL'], description: 'Ayah number' },
      { name: 'note', type: 'TEXT', constraints: ['NULL'], description: 'User note' },
      { name: 'color', type: 'VARCHAR(7)', constraints: ['DEFAULT \'#FFD700\''], description: 'Bookmark color' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Update timestamp' },
    ],
    indexes: ['idx_bookmarks_user_surah', 'UNIQUE(user_id, ayah_id)']
  },
];

export function DatabaseSection() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Database className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">Total Tables</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">Primary Keys</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Link className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">18</p>
                <p className="text-xs text-muted-foreground">Foreign Keys</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/10">
                <Search className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">24</p>
                <p className="text-xs text-muted-foreground">Indexes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Details */}
      <Tabs defaultValue="surahs" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          {databaseTables.map((table) => (
            <TabsTrigger key={table.name} value={table.name} className="text-xs">
              {table.displayName}
            </TabsTrigger>
          ))}
        </TabsList>

        {databaseTables.map((table) => (
          <TabsContent key={table.name} value={table.name}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-mono">{table.name}</CardTitle>
                    <CardDescription>{table.description}</CardDescription>
                  </div>
                  <Badge variant="secondary">{table.columns.length} columns</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Column</TableHead>
                      <TableHead className="w-40">Type</TableHead>
                      <TableHead>Constraints</TableHead>
                      <TableHead className="w-64">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.columns.map((col) => (
                      <TableRow key={col.name}>
                        <TableCell className="font-mono text-sm">
                          {col.constraints.includes('PRIMARY KEY') && (
                            <Key className="inline h-3 w-3 mr-1 text-amber-500" />
                          )}
                          {col.constraints.some(c => c.includes('FK')) && (
                            <Link className="inline h-3 w-3 mr-1 text-emerald-500" />
                          )}
                          {col.name}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {col.type}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {col.constraints.map((c, i) => (
                              <Badge 
                                key={i} 
                                variant={
                                  c.includes('PRIMARY') ? 'default' :
                                  c.includes('FK') ? 'outline' :
                                  c.includes('UNIQUE') ? 'secondary' :
                                  'outline'
                                }
                                className="text-xs"
                              >
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {col.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {table.indexes.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Indexes</h4>
                    <div className="flex flex-wrap gap-2">
                      {table.indexes.map((idx, i) => (
                        <Badge key={i} variant="outline" className="font-mono text-xs">
                          {idx}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}