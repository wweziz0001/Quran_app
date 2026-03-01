'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Settings as SettingsIcon,
  Volume2,
  Monitor,
  Key,
  Shield,
  Save,
  RotateCcw,
  Loader2,
  Trash2
} from 'lucide-react';

interface SettingItem {
  id: string;
  key: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  value: string | number | boolean;
  isPublic: boolean;
}

interface SettingGroup {
  category: string;
  label: string;
  icon: React.ElementType;
  settings: SettingItem[];
}

// Default settings configuration
const defaultSettings: SettingGroup[] = [
  {
    category: 'general',
    label: 'General',
    icon: SettingsIcon,
    settings: [
      { id: '1', key: 'app_name', label: 'App Name', description: 'Application display name', type: 'string', value: 'Quran App', isPublic: true },
      { id: '2', key: 'app_version', label: 'App Version', description: 'Current app version', type: 'string', value: '1.0.0', isPublic: true },
      { id: '3', key: 'maintenance_mode', label: 'Maintenance Mode', description: 'Enable maintenance mode', type: 'boolean', value: false, isPublic: false },
      { id: '4', key: 'force_update_version', label: 'Force Update Version', description: 'Minimum required app version', type: 'string', value: '1.0.0', isPublic: true },
    ]
  },
  {
    category: 'audio',
    label: 'Audio',
    icon: Volume2,
    settings: [
      { id: '5', key: 'default_reciter', label: 'Default Reciter', description: 'Default reciter slug', type: 'string', value: 'mishary-rashid-al-afasy', isPublic: true },
      { id: '6', key: 'default_audio_quality', label: 'Default Quality', description: 'Default audio quality level', type: 'string', value: 'high', isPublic: true },
      { id: '7', key: 'max_concurrent_downloads', label: 'Max Downloads', description: 'Maximum concurrent downloads', type: 'number', value: 3, isPublic: false },
      { id: '8', key: 'streaming_buffer_size', label: 'Buffer Size', description: 'Streaming buffer in KB', type: 'number', value: 64, isPublic: false },
    ]
  },
  {
    category: 'display',
    label: 'Display',
    icon: Monitor,
    settings: [
      { id: '9', key: 'default_tafsir', label: 'Default Tafsir', description: 'Default tafsir source', type: 'string', value: 'ibn-kathir', isPublic: true },
      { id: '10', key: 'default_translation', label: 'Default Translation', description: 'Default translation source', type: 'string', value: 'en-sahih', isPublic: true },
      { id: '11', key: 'show_arabic_text', label: 'Show Arabic', description: 'Show Arabic text by default', type: 'boolean', value: true, isPublic: true },
      { id: '12', key: 'arabic_font_size', label: 'Arabic Font Size', description: 'Arabic font size in sp', type: 'number', value: 24, isPublic: true },
      { id: '13', key: 'translation_font_size', label: 'Translation Font Size', description: 'Translation font size in sp', type: 'number', value: 16, isPublic: true },
    ]
  },
  {
    category: 'api',
    label: 'API',
    icon: Key,
    settings: [
      { id: '14', key: 'api_rate_limit', label: 'Rate Limit', description: 'API requests per minute', type: 'number', value: 100, isPublic: false },
      { id: '15', key: 'cdn_base_url', label: 'CDN Base URL', description: 'CDN base URL for audio files', type: 'string', value: 'https://cdn.quran.com', isPublic: false },
      { id: '16', key: 'api_timeout', label: 'API Timeout', description: 'API request timeout in ms', type: 'number', value: 30000, isPublic: false },
    ]
  },
  {
    category: 'security',
    label: 'Security',
    icon: Shield,
    settings: [
      { id: '17', key: 'jwt_expiration', label: 'JWT Expiration', description: 'JWT token expiration in seconds', type: 'number', value: 3600, isPublic: false },
      { id: '18', key: 'refresh_token_expiration', label: 'Refresh Expiration', description: 'Refresh token expiration in seconds', type: 'number', value: 604800, isPublic: false },
      { id: '19', key: 'password_min_length', label: 'Password Min Length', description: 'Minimum password length', type: 'number', value: 8, isPublic: false },
      { id: '20', key: 'require_email_verification', label: 'Require Verification', description: 'Require email verification', type: 'boolean', value: false, isPublic: true },
    ]
  },
];

export function SettingsSection() {
  const [settingGroups, setSettingGroups] = useState<SettingGroup[]>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [resettingSessions, setResettingSessions] = useState(false);

  // Fetch settings from API
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings');
      const result = await response.json();

      if (result.success && result.settings) {
        // Merge fetched settings with defaults
        const merged = defaultSettings.map(group => ({
          ...group,
          settings: group.settings.map(setting => {
            const fetched = result.settings.find((s: { key: string }) => s.key === setting.key);
            if (fetched) {
              return {
                ...setting,
                id: fetched.id,
                value: setting.type === 'boolean' 
                  ? fetched.value === 'true' 
                  : setting.type === 'number' 
                    ? parseInt(fetched.value) || 0 
                    : fetched.value,
              };
            }
            return setting;
          })
        }));
        setSettingGroups(merged);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update a setting value
  const updateSetting = (category: string, key: string, value: string | number | boolean) => {
    setSettingGroups(prev => prev.map(group => {
      if (group.category === category) {
        return {
          ...group,
          settings: group.settings.map(s => 
            s.key === key ? { ...s, value } : s
          )
        };
      }
      return group;
    }));
  };

  // Save all settings
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Collect all settings
      const allSettings = settingGroups.flatMap(group => 
        group.settings.map(s => ({
          key: s.key,
          value: String(s.value)
        }))
      );

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: allSettings }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('All settings saved successfully');
        fetchSettings();
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleResetDefaults = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) return;
    
    try {
      const response = await fetch('/api/settings/reset', {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        toast.success('Settings reset to defaults');
        setSettingGroups(defaultSettings);
        fetchSettings();
      } else {
        toast.error('Failed to reset settings');
      }
    } catch {
      toast.error('Failed to reset settings');
    }
  };

  // Clear cache
  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all cache?')) return;
    
    setClearingCache(true);
    try {
      const response = await fetch('/api/settings/cache', {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success('Cache cleared successfully');
      } else {
        toast.error('Failed to clear cache');
      }
    } catch {
      toast.error('Failed to clear cache');
    } finally {
      setClearingCache(false);
    }
  };

  // Reset sessions
  const handleResetSessions = async () => {
    if (!confirm('Are you sure you want to reset all user sessions? All users will need to login again.')) return;
    
    setResettingSessions(true);
    try {
      const response = await fetch('/api/settings/sessions', {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success('All user sessions have been reset');
      } else {
        toast.error('Failed to reset sessions');
      }
    } catch {
      toast.error('Failed to reset sessions');
    } finally {
      setResettingSessions(false);
    }
  };

  // Render input based on type
  const renderInput = (setting: SettingItem, category: string) => {
    switch (setting.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={setting.key}
              checked={setting.value as boolean}
              onCheckedChange={(checked) => updateSetting(category, setting.key, checked)}
            />
            <Label htmlFor={setting.key} className="cursor-pointer">
              {setting.value ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        );
      case 'number':
        return (
          <Input
            type="number"
            id={setting.key}
            value={setting.value as number}
            onChange={(e) => updateSetting(category, setting.key, parseInt(e.target.value) || 0)}
            className="max-w-32"
          />
        );
      case 'json':
        return (
          <Input
            type="text"
            id={setting.key}
            value={setting.value as string}
            onChange={(e) => updateSetting(category, setting.key, e.target.value)}
            className="font-mono text-sm"
          />
        );
      default:
        return (
          <Input
            type="text"
            id={setting.key}
            value={setting.value as string}
            onChange={(e) => updateSetting(category, setting.key, e.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">App Settings</h2>
          <p className="text-muted-foreground">Configure application settings and preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSaveAll} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            {settingGroups.map((group) => {
              const Icon = group.icon;
              return (
                <TabsTrigger key={group.category} value={group.category} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {group.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {settingGroups.map((group) => (
            <TabsContent key={group.category} value={group.category}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <group.icon className="h-5 w-5" />
                    {group.label} Settings
                  </CardTitle>
                  <CardDescription>
                    Configure {group.label.toLowerCase()} settings for the application
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {group.settings.map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between py-4 border-b last:border-0">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={setting.key} className="text-base font-medium">
                            {setting.label}
                          </Label>
                          {setting.isPublic ? (
                            <Badge variant="outline" className="text-xs">Public</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Private</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                        <code className="text-xs text-muted-foreground">{setting.key}</code>
                      </div>
                      <div className="flex-shrink-0">
                        {renderInput(setting, group.category)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect the entire system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
            <div>
              <p className="font-medium">Clear All Cache</p>
              <p className="text-sm text-muted-foreground">
                Remove all cached data from Redis
              </p>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleClearCache}
              disabled={clearingCache}
            >
              {clearingCache ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clear Cache
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
            <div>
              <p className="font-medium">Reset User Sessions</p>
              <p className="text-sm text-muted-foreground">
                Invalidate all user sessions and force re-login
              </p>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleResetSessions}
              disabled={resettingSessions}
            >
              {resettingSessions ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Reset Sessions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
