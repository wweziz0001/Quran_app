'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutDashboard, Database, Code, Shield, Settings, 
  BookOpen, Headphones, Smartphone, Cloud, FolderOpen,
  Menu, Moon, Sun, Search
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'architecture', label: 'Architecture', href: '/admin/architecture', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'import', label: 'Import Data', href: '/admin/import', icon: <Cloud className="h-4 w-4" />, badge: 'NEW' },
  { id: 'api', label: 'API Docs', href: '/admin/api', icon: <Code className="h-4 w-4" /> },
  { id: 'quran', label: 'Quran', href: '/admin/quran', icon: <BookOpen className="h-4 w-4" />, badge: 'CRUD' },
  { id: 'mushafs', label: 'Mushafs', href: '/admin/mushafs', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'reciters', label: 'Reciters', href: '/admin/reciters', icon: <Headphones className="h-4 w-4" />, badge: 'CRUD' },
  { id: 'tafsir', label: 'Tafsir', href: '/admin/tafsir', icon: <BookOpen className="h-4 w-4" />, badge: 'CRUD' },
  { id: 'settings', label: 'Settings', href: '/admin/settings', icon: <Settings className="h-4 w-4" /> },
  { id: 'android', label: 'Android', href: '/admin/android', icon: <Smartphone className="h-4 w-4" /> },
  { id: 'deployment', label: 'Deployment', href: '/admin/deployment', icon: <Cloud className="h-4 w-4" /> },
  { id: 'security', label: 'Security', href: '/admin/security', icon: <Shield className="h-4 w-4" /> },
  { id: 'db-manager', label: 'DB Manager', href: '/admin/db-manager', icon: <Database className="h-4 w-4" />, badge: 'NEW' },
  { id: 'files', label: 'Files', href: '/admin/files', icon: <FolderOpen className="h-4 w-4" />, badge: 'EDITOR' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {sidebarOpen && (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold">Quran Admin</span>
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-1">
            {navItems.map((item) => (
              <Link key={item.id} href={item.href}>
                <Button
                  variant={isActive(item.href) ? 'default' : 'ghost'}
                  className={cn(
                    "w-full justify-start gap-3",
                    !sidebarOpen && "justify-center px-0"
                  )}
                >
                  {item.icon}
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">{item.badge}</Badge>
                      )}
                    </>
                  )}
                </Button>
              </Link>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {sidebarOpen && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 flex flex-col",
        sidebarOpen ? "ml-64" : "ml-16"
      )}>
        <header className="h-16 border-b bg-card/50 backdrop-blur sticky top-0 z-40 shrink-0">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="h-9 w-64 pl-9 pr-4 rounded-lg border bg-background text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                System Online
              </Badge>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full">
            {children}
          </div>
        </div>

        <footer className="h-12 border-t flex items-center justify-center text-xs text-muted-foreground shrink-0">
          <p>Quran App Admin Dashboard v1.4.0 • Built with Next.js 16 • Ready for Production</p>
        </footer>
      </main>
    </div>
  );
}
