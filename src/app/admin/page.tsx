'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutDashboard, Database, Code, Shield, Settings, 
  BookOpen, Headphones, Smartphone, Cloud, FolderOpen,
  Menu, Moon, Sun, Search, Globe, Download
} from 'lucide-react';
import { useTheme } from 'next-themes';

// Import section components
import { ArchitectureSection } from '@/components/admin/architecture-section';
import { DatabaseBrowser } from '@/components/admin/database-browser';
import { DatabaseManager } from '@/components/admin/database/database-manager';
import { AndroidSection } from '@/components/admin/android-section';
import { FilesSection } from '@/components/admin/files-section';
import { ApiSection } from '@/components/admin/api-section';
import { DeploymentSection } from '@/components/admin/deployment-section';
import { RecitersSection } from '@/components/admin/reciters-section';
import { TafsirSection } from '@/components/admin/tafsir-section';
import { SettingsSection } from '@/components/admin/settings-section';
import { SecuritySection } from '@/components/admin/security-section';
import { DashboardSection } from '@/components/admin/dashboard-section';
import { QuranManagementSection } from '@/components/admin/quran-management-section';
import { MushafEditionsSection } from '@/components/admin/mushaf-editions-section';
import { ImportSection } from '@/components/admin/import-section';

type Section = 'dashboard' | 'architecture' | 'database' | 'db-manager' | 'api' | 'reciters' | 'tafsir' | 'quran' | 'mushafs' | 'import' | 'settings' | 'android' | 'deployment' | 'security' | 'files';

interface NavItem {
  id: Section;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'architecture', label: 'Architecture', icon: <Globe className="h-4 w-4" /> },
  { id: 'import', label: 'Import Data', icon: <Download className="h-4 w-4" />, badge: 'NEW' },
  { id: 'api', label: 'API Docs', icon: <Code className="h-4 w-4" /> },
  { id: 'quran', label: 'Quran', icon: <BookOpen className="h-4 w-4" />, badge: 'CRUD' },
  { id: 'mushafs', label: 'Mushafs', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'reciters', label: 'Reciters', icon: <Headphones className="h-4 w-4" />, badge: 'CRUD' },
  { id: 'tafsir', label: 'Tafsir', icon: <BookOpen className="h-4 w-4" />, badge: 'CRUD' },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  { id: 'android', label: 'Android', icon: <Smartphone className="h-4 w-4" /> },
  { id: 'deployment', label: 'Deployment', icon: <Cloud className="h-4 w-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
  { id: 'db-manager', label: 'DB Manager', icon: <Database className="h-4 w-4" />, badge: 'NEW' },
  { id: 'database', label: 'Database', icon: <Database className="h-4 w-4" />, badge: 'BROWSER' },
  { id: 'files', label: 'Files', icon: <FolderOpen className="h-4 w-4" />, badge: 'EDITOR'  },
];

// Main Admin Dashboard Component
export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, setTheme } = useTheme();

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardSection />;
      case 'architecture': return <ArchitectureSection />;
      case 'database': return <DatabaseBrowser />;
      case 'db-manager': return <DatabaseManager />;
      case 'api': return <ApiSection />;
      case 'quran': return <QuranManagementSection />;
      case 'mushafs': return <MushafEditionsSection />;
      case 'import': return <ImportSection />;
      case 'reciters': return <RecitersSection />;
      case 'tafsir': return <TafsirSection />;
      case 'settings': return <SettingsSection />;
      case 'android': return <AndroidSection />;
      case 'deployment': return <DeploymentSection />;
      case 'security': return <SecuritySection />;
      case 'files': return <FilesSection />;
      default: return <DashboardSection />;
    }
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
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold">Quran Admin</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-1">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? 'default' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-3",
                  !sidebarOpen && "justify-center px-0"
                )}
                onClick={() => setActiveSection(item.id)}
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
            {renderSection()}
          </div>
        </div>

        <footer className="h-12 border-t flex items-center justify-center text-xs text-muted-foreground shrink-0">
          <p>Quran App Admin Dashboard v1.0.0 • Built with Next.js 16 • Ready for Production</p>
        </footer>
      </main>
    </div>
  );
}
