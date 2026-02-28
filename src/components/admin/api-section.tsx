'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Code, Lock, Unlock, Copy, CheckCheck } from 'lucide-react';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  auth: boolean;
  roles?: string[];
  request?: string;
  response?: string;
}

const apiGroups = {
  auth: {
    title: 'Authentication',
    description: 'User authentication and session management',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/login',
        description: 'User login with email and password',
        auth: false,
        request: JSON.stringify({
          email: 'user@example.com',
          password: 'SecurePassword123'
        }, null, 2),
        response: JSON.stringify({
          success: true,
          data: {
            accessToken: 'eyJhbGciOiJIUzI1NiIs...',
            refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
            user: {
              id: 'clx123abc',
              email: 'user@example.com',
              name: 'John Doe',
              role: 'user'
            }
          }
        }, null, 2)
      },
      {
        method: 'POST',
        path: '/api/auth/register',
        description: 'Register a new user account',
        auth: false,
        request: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecurePassword123',
          name: 'Jane Doe'
        }, null, 2),
        response: JSON.stringify({
          success: true,
          message: 'Registration successful. Please verify your email.'
        }, null, 2)
      },
      {
        method: 'POST',
        path: '/api/auth/refresh',
        description: 'Refresh access token using refresh token',
        auth: false,
        request: JSON.stringify({
          refreshToken: 'eyJhbGciOiJIUzI1NiIs...'
        }, null, 2),
        response: JSON.stringify({
          success: true,
          data: {
            accessToken: 'eyJhbGciOiJIUzI1NiIs...',
            refreshToken: 'eyJhbGciOiJIUzI1NiIs...'
          }
        }, null, 2)
      },
      {
        method: 'POST',
        path: '/api/auth/logout',
        description: 'Logout and invalidate session',
        auth: true,
        response: JSON.stringify({
          success: true,
          message: 'Logged out successfully'
        }, null, 2)
      }
    ]
  },
  quran: {
    title: 'Quran Data',
    description: 'Surah and Ayah data endpoints',
    endpoints: [
      {
        method: 'GET',
        path: '/api/quran/surahs',
        description: 'Get all 114 surahs',
        auth: false,
        response: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              number: 1,
              nameArabic: 'الفاتحة',
              nameEnglish: 'Al-Fatihah',
              nameTranslation: 'The Opening',
              totalAyahs: 7,
              revelationType: 'Meccan'
            }
          ]
        }, null, 2)
      },
      {
        method: 'GET',
        path: '/api/quran/surahs/:id',
        description: 'Get a specific surah with ayahs',
        auth: false,
        response: JSON.stringify({
          success: true,
          data: {
            surah: { id: 1, number: 1, nameEnglish: 'Al-Fatihah' },
            ayahs: [
              {
                id: 1,
                number: 1,
                textArabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
                textSimple: 'بسم الله الرحمن الرحيم'
              }
            ]
          }
        }, null, 2)
      },
      {
        method: 'GET',
        path: '/api/quran/ayahs/:id',
        description: 'Get a specific ayah by ID',
        auth: false,
        response: JSON.stringify({
          success: true,
          data: {
            id: 1,
            surahId: 1,
            number: 1,
            numberInQuran: 1,
            textArabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
            pageNumber: 1,
            juzNumber: 1
          }
        }, null, 2)
      },
      {
        method: 'GET',
        path: '/api/quran/search?q={query}',
        description: 'Search ayahs by text',
        auth: false,
        response: JSON.stringify({
          success: true,
          data: {
            results: [
              {
                ayahId: 1,
                surahId: 1,
                surahName: 'Al-Fatihah',
                ayahNumber: 1,
                textArabic: '...',
                highlight: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'
              }
            ],
            total: 5
          }
        }, null, 2)
      },
      {
        method: 'GET',
        path: '/api/quran/page/:number',
        description: 'Get all ayahs on a specific page (1-604)',
        auth: false,
        response: JSON.stringify({
          success: true,
          data: {
            pageNumber: 1,
            ayahs: []
          }
        }, null, 2)
      },
      {
        method: 'GET',
        path: '/api/quran/juz/:number',
        description: 'Get all ayahs in a specific juz (1-30)',
        auth: false
      }
    ]
  },
  recitations: {
    title: 'Recitations',
    description: 'Audio recitation endpoints',
    endpoints: [
      {
        method: 'GET',
        path: '/api/recitations/reciters',
        description: 'Get all available reciters',
        auth: false,
        response: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              nameEnglish: 'Abdul Basit Abdul Samad',
              slug: 'abdul-basit',
              style: 'Hafs',
              isFeatured: true
            }
          ]
        }, null, 2)
      },
      {
        method: 'GET',
        path: '/api/recitations/reciter/:id/surah/:surahId',
        description: 'Get all recitations for a surah by a reciter',
        auth: false,
        response: JSON.stringify({
          success: true,
          data: {
            reciter: { id: 1, nameEnglish: 'Abdul Basit' },
            surah: { id: 1, nameEnglish: 'Al-Fatihah' },
            recitations: [
              {
                ayahNumber: 1,
                audioUrl: 'https://cdn.quran.app/audio/abdul-basit/1/1.mp3',
                duration: 15
              }
            ]
          }
        }, null, 2)
      },
      {
        method: 'GET',
        path: '/api/recitations/stream/:id',
        description: 'Stream audio with Range header support',
        auth: false,
        response: 'Audio stream (206 Partial Content)'
      },
      {
        method: 'GET',
        path: '/api/recitations/download/:id',
        description: 'Get download URL for offline use',
        auth: true,
        response: JSON.stringify({
          success: true,
          data: {
            downloadUrl: 'https://cdn.quran.app/download/...',
            expiresAt: '2024-01-01T00:00:00Z'
          }
        }, null, 2)
      }
    ]
  },
  tafsir: {
    title: 'Tafsir',
    description: 'Quranic commentary endpoints',
    endpoints: [
      {
        method: 'GET',
        path: '/api/tafsir/sources',
        description: 'Get all available tafsir sources',
        auth: false,
        response: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              nameEnglish: 'Tafsir Ibn Kathir',
              slug: 'ibn-kathir',
              language: 'ar',
              isDefault: true
            }
          ]
        }, null, 2)
      },
      {
        method: 'GET',
        path: '/api/tafsir/ayah/:ayahId?source={slug}',
        description: 'Get tafsir for a specific ayah',
        auth: false,
        response: JSON.stringify({
          success: true,
          data: {
            ayahId: 1,
            source: 'ibn-kathir',
            textArabic: 'تفسير ابن كثير...',
            textEnglish: 'Ibn Kathir\'s commentary...'
          }
        }, null, 2)
      }
    ]
  },
  bookmarks: {
    title: 'Bookmarks',
    description: 'User bookmark management',
    endpoints: [
      {
        method: 'GET',
        path: '/api/bookmarks',
        description: 'Get user\'s bookmarks',
        auth: true,
        response: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              ayahId: 255,
              surahId: 2,
              ayahNumber: 255,
              note: 'Ayatul Kursi',
              color: '#FFD700',
              createdAt: '2024-01-01T00:00:00Z'
            }
          ]
        }, null, 2)
      },
      {
        method: 'POST',
        path: '/api/bookmarks',
        description: 'Create a new bookmark',
        auth: true,
        request: JSON.stringify({
          ayahId: 255,
          note: 'Important verse',
          color: '#FFD700'
        }, null, 2),
        response: JSON.stringify({
          success: true,
          data: {
            id: 1,
            ayahId: 255,
            note: 'Important verse'
          }
        }, null, 2)
      },
      {
        method: 'DELETE',
        path: '/api/bookmarks/:id',
        description: 'Delete a bookmark',
        auth: true,
        response: JSON.stringify({
          success: true,
          message: 'Bookmark deleted'
        }, null, 2)
      }
    ]
  },
  admin: {
    title: 'Admin',
    description: 'Admin-only management endpoints',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/reciters',
        description: 'List all reciters with pagination',
        auth: true,
        roles: ['admin', 'editor'],
        response: JSON.stringify({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 25,
            totalPages: 2
          }
        }, null, 2)
      },
      {
        method: 'POST',
        path: '/api/admin/reciters',
        description: 'Create a new reciter',
        auth: true,
        roles: ['admin'],
        request: JSON.stringify({
          nameArabic: 'أحمد العجمي',
          nameEnglish: 'Ahmed Al-Ajmy',
          slug: 'ahmed-alajmy',
          country: 'Saudi Arabia',
          style: 'Hafs'
        }, null, 2)
      },
      {
        method: 'PUT',
        path: '/api/admin/reciters/:id',
        description: 'Update a reciter',
        auth: true,
        roles: ['admin', 'editor']
      },
      {
        method: 'DELETE',
        path: '/api/admin/reciters/:id',
        description: 'Delete a reciter',
        auth: true,
        roles: ['admin']
      },
      {
        method: 'GET',
        path: '/api/admin/users',
        description: 'List all users',
        auth: true,
        roles: ['admin']
      },
      {
        method: 'GET',
        path: '/api/admin/settings',
        description: 'Get all app settings',
        auth: true,
        roles: ['admin']
      },
      {
        method: 'PUT',
        path: '/api/admin/settings/:key',
        description: 'Update an app setting',
        auth: true,
        roles: ['admin']
      },
      {
        method: 'GET',
        path: '/api/admin/audit-logs',
        description: 'Get audit logs',
        auth: true,
        roles: ['admin']
      }
    ]
  }
};

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  POST: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  PUT: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  PATCH: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  DELETE: 'bg-destructive/10 text-destructive border-destructive/20',
};

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? (
          <CheckCheck className="h-3 w-3 text-emerald-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

export function ApiSection() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            REST API Documentation
          </CardTitle>
          <CardDescription>
            Complete API reference for the Quran Application backend
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-mono">Base URL:</span>
              <code className="bg-muted px-2 py-1 rounded">https://api.quran.app</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono">Version:</span>
              <Badge variant="secondary">v1.0.0</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono">Format:</span>
              <Badge variant="outline">JSON</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Groups */}
      <Tabs defaultValue="auth" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          {Object.entries(apiGroups).map(([key, group]) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              {group.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(apiGroups).map(([key, group]) => (
          <TabsContent key={key} value={key} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{group.title}</CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {group.endpoints.map((endpoint, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`font-mono text-xs ${methodColors[endpoint.method]}`}
                        >
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm font-mono">{endpoint.path}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        {endpoint.auth ? (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Auth Required
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Unlock className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        )}
                        {endpoint.roles && (
                          <Badge variant="outline" className="text-xs">
                            {endpoint.roles.join(', ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                    
                    {endpoint.request && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Request Body</p>
                        <CodeBlock code={endpoint.request} />
                      </div>
                    )}
                    
                    {endpoint.response && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Response</p>
                        <CodeBlock code={endpoint.response} />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
