'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Headphones, 
  Smartphone, 
  Globe, 
  ArrowRight,
  Users,
  Database,
  Shield,
  Code
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Quran App</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" className="gap-2">
                Admin Panel
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">v1.0.0 • Production Ready</Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Quran Application Platform
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          A comprehensive, production-ready platform for Quran recitation, tafsir, and Islamic content. 
          Built with modern technologies for 50,000-500,000 users.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/admin">
            <Button size="lg" className="gap-2">
              Access Admin Panel
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Button size="lg" variant="outline">
            View API Docs
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Platform Features</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <BookOpen className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Complete Quran Data</CardTitle>
              <CardDescription>
                All 114 Surahs, 6,236 Ayahs with multiple text formats (Uthmani, Indopak)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="secondary">114 Surahs</Badge>
                <Badge variant="secondary">6,236 Ayahs</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Headphones className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Audio Recitations</CardTitle>
              <CardDescription>
                Multiple reciters with gapless audio, timing data for word highlighting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="secondary">25+ Reciters</Badge>
                <Badge variant="secondary">HD Audio</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <BookOpen className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Tafsir Collection</CardTitle>
              <CardDescription>
                Comprehensive tafsir sources including Ibn Kathir, Al-Tabari, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="secondary">8+ Sources</Badge>
                <Badge variant="secondary">Multi-language</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Smartphone className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Android App</CardTitle>
              <CardDescription>
                Native Android application with offline support and modern UI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="secondary">Kotlin</Badge>
                <Badge variant="secondary">Jetpack Compose</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Code className="h-10 w-10 text-primary mb-2" />
              <CardTitle>RESTful API</CardTitle>
              <CardDescription>
                Complete API with authentication, rate limiting, and comprehensive endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="secondary">JWT Auth</Badge>
                <Badge variant="secondary">Rate Limited</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Enterprise Security</CardTitle>
              <CardDescription>
                Production-grade security with encryption, audit logs, and monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="secondary">AES-256</Badge>
                <Badge variant="secondary">TLS 1.3</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-card rounded-2xl p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-4 text-center">
            <div>
              <div className="flex items-center justify-center mb-2">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <p className="text-3xl font-bold">125K+</p>
              <p className="text-muted-foreground">Target Users</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Database className="h-8 w-8 text-primary" />
              </div>
              <p className="text-3xl font-bold">155K+</p>
              <p className="text-muted-foreground">Audio Files</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <p className="text-3xl font-bold">20+</p>
              <p className="text-muted-foreground">Languages</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <p className="text-3xl font-bold">99.9%</p>
              <p className="text-muted-foreground">Uptime SLA</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-12">
            <h2 className="text-2xl font-bold mb-4">Ready to Manage Your Platform?</h2>
            <p className="mb-6 opacity-90">
              Access the admin dashboard to manage reciters, tafsir, users, and more.
            </p>
            <Link href="/admin">
              <Button size="lg" variant="secondary" className="gap-2">
                Open Admin Dashboard
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Quran App Platform</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built with Next.js 16 • Prisma • TypeScript • Ready for Production
            </p>
            <div className="flex gap-4">
              <Badge variant="outline">v1.0.0</Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
