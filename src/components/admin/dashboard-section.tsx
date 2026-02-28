'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Mic, 
  BookOpen, 
  Bookmark, 
  Database, 
  HardDrive,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Tag
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

function StatCard({ title, value, description, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'bg-card',
    primary: 'bg-primary/5 border-primary/20',
    success: 'bg-emerald-500/5 border-emerald-500/20',
    warning: 'bg-amber-500/5 border-amber-500/20',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${iconStyles[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.value > 0 ? (
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-destructive" />
            )}
            <span className={`text-xs ${trend.value > 0 ? 'text-emerald-500' : 'text-destructive'}`}>
              {Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardSection() {
  const [version, setVersion] = useState<string>('1.0.0');
  
  useEffect(() => {
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setVersion(data.version);
        }
      })
      .catch(() => {
        // Use default version
      });
  }, []);

  const stats = {
    totalUsers: 125847,
    activeUsers: 34562,
    totalReciters: 25,
    totalTafsirSources: 8,
    totalAyahs: 6236,
    totalRecitations: 155900,
    storageUsed: 45.7,
    bandwidthUsed: 234.5,
  };

  const recentActivity = [
    { action: 'Reciter Added', entity: 'Ahmed Al-Ajmy', time: '5 min ago', type: 'create' },
    { action: 'Tafsir Updated', entity: 'Ibn Kathir - Surah 2', time: '15 min ago', type: 'update' },
    { action: 'Settings Changed', entity: 'Audio Quality Default', time: '1 hour ago', type: 'update' },
    { action: 'User Registered', entity: 'user@example.com', time: '2 hours ago', type: 'create' },
    { action: 'Audio Uploaded', entity: 'Surah 1 - Al-Fatihah', time: '3 hours ago', type: 'upload' },
  ];

  return (
    <div className="space-y-6">
      {/* Version Badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">لوحة التحكم</h2>
        <Badge variant="outline" className="gap-1 text-sm">
          <Tag className="h-3 w-3" />
          v{version}
        </Badge>
      </div>
      
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={Users}
          trend={{ value: 12.5, label: 'from last month' }}
          variant="primary"
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers.toLocaleString()}
          description="Last 30 days"
          icon={Activity}
          trend={{ value: 8.2, label: 'from last week' }}
          variant="success"
        />
        <StatCard
          title="Total Reciters"
          value={stats.totalReciters}
          icon={Mic}
          description="Active reciters"
        />
        <StatCard
          title="Total Recitations"
          value={stats.totalRecitations.toLocaleString()}
          icon={Database}
          trend={{ value: 5.1, label: 'new uploads' }}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{stats.storageUsed} GB</span>
              <Badge variant="secondary">100 GB Plan</Badge>
            </div>
            <Progress value={stats.storageUsed} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round(stats.storageUsed)}% of storage used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Bandwidth (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{stats.bandwidthUsed} GB</span>
              <Badge variant="secondary">500 GB Limit</Badge>
            </div>
            <Progress value={(stats.bandwidthUsed / 500) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round((stats.bandwidthUsed / 500) * 100)}% of monthly bandwidth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quran Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-sm">Surahs</span>
              </div>
              <span className="font-semibold">114</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-primary" />
                <span className="text-sm">Ayahs</span>
              </div>
              <span className="font-semibold">6,236</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-primary" />
                <span className="text-sm">Pages</span>
              </div>
              <span className="font-semibold">604</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest admin actions in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`mt-0.5 h-2 w-2 rounded-full ${
                    activity.type === 'create' ? 'bg-emerald-500' :
                    activity.type === 'update' ? 'bg-amber-500' :
                    'bg-primary'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.entity}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system health and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">API Server</span>
              <Badge variant="default" className="bg-emerald-500">Operational</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <Badge variant="default" className="bg-emerald-500">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">CDN</span>
              <Badge variant="default" className="bg-emerald-500">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Redis Cache</span>
              <Badge variant="default" className="bg-emerald-500">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Background Jobs</span>
              <Badge variant="default" className="bg-emerald-500">Running</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
