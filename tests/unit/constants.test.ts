/**
 * Unit Tests for Application Constants
 * 
 * Tests src/lib/constants.ts
 */

import { describe, it, expect } from 'vitest';
import {
  TECH_STACK,
  API_ENDPOINTS,
  USER_ROLES,
  QURAN_METADATA,
  SETTING_CATEGORIES,
  AUDIO_QUALITIES,
  REVELATION_TYPES,
  NAV_ITEMS,
} from '@/lib/constants';

// =============================================================================
// TECH_STACK Tests
// =============================================================================

describe('TECH_STACK', () => {
  it('should have mobile configuration', () => {
    expect(TECH_STACK.mobile).toBeDefined();
    expect(TECH_STACK.mobile.framework).toBe('Kotlin + Jetpack Compose');
    expect(TECH_STACK.mobile.minSdk).toBe(26);
    expect(TECH_STACK.mobile.targetSdk).toBe(34);
  });

  it('should have backend configuration', () => {
    expect(TECH_STACK.backend).toBeDefined();
    expect(TECH_STACK.backend.framework).toBe('NestJS (Node.js)');
    expect(TECH_STACK.backend.orm).toBe('Prisma');
  });

  it('should have admin configuration', () => {
    expect(TECH_STACK.admin).toBeDefined();
    expect(TECH_STACK.admin.framework).toBe('Next.js 16');
    expect(TECH_STACK.admin.components).toBe('shadcn/ui');
  });

  it('should have database configuration', () => {
    expect(TECH_STACK.database).toBeDefined();
    expect(TECH_STACK.database.primary).toBe('PostgreSQL 16');
  });

  it('should have CI configuration', () => {
    expect(TECH_STACK.ci).toBeDefined();
    expect(TECH_STACK.ci.platform).toBe('GitHub Actions');
  });
});

// =============================================================================
// API_ENDPOINTS Tests
// =============================================================================

describe('API_ENDPOINTS', () => {
  it('should have auth endpoints', () => {
    expect(API_ENDPOINTS.auth).toBeDefined();
    expect(API_ENDPOINTS.auth.login).toBe('POST /api/auth/login');
    expect(API_ENDPOINTS.auth.register).toBe('POST /api/auth/register');
    expect(API_ENDPOINTS.auth.logout).toBe('POST /api/auth/logout');
  });

  it('should have quran endpoints', () => {
    expect(API_ENDPOINTS.quran).toBeDefined();
    expect(API_ENDPOINTS.quran.surahs).toBe('GET /api/quran/surahs');
    expect(API_ENDPOINTS.quran.ayahs).toBe('GET /api/quran/ayahs');
    expect(API_ENDPOINTS.quran.search).toBe('GET /api/quran/search');
  });

  it('should have recitations endpoints', () => {
    expect(API_ENDPOINTS.recitations).toBeDefined();
    expect(API_ENDPOINTS.recitations.reciters).toBe('GET /api/recitations/reciters');
    expect(API_ENDPOINTS.recitations.stream).toBe('GET /api/recitations/stream/:id');
  });

  it('should have tafsir endpoints', () => {
    expect(API_ENDPOINTS.tafsir).toBeDefined();
    expect(API_ENDPOINTS.tafsir.sources).toBe('GET /api/tafsir/sources');
  });

  it('should have bookmarks endpoints', () => {
    expect(API_ENDPOINTS.bookmarks).toBeDefined();
    expect(API_ENDPOINTS.bookmarks.list).toBe('GET /api/bookmarks');
  });

  it('should have admin endpoints', () => {
    expect(API_ENDPOINTS.admin).toBeDefined();
    expect(API_ENDPOINTS.admin.users).toBe('GET /api/admin/users');
    expect(API_ENDPOINTS.admin.auditLogs).toBe('GET /api/admin/audit-logs');
  });
});

// =============================================================================
// USER_ROLES Tests
// =============================================================================

describe('USER_ROLES', () => {
  it('should have admin role', () => {
    expect(USER_ROLES.ADMIN).toBe('admin');
  });

  it('should have editor role', () => {
    expect(USER_ROLES.EDITOR).toBe('editor');
  });

  it('should have user role', () => {
    expect(USER_ROLES.USER).toBe('user');
  });

  it('should have exactly 3 roles', () => {
    const roles = Object.keys(USER_ROLES);
    expect(roles).toHaveLength(3);
  });
});

// =============================================================================
// QURAN_METADATA Tests
// =============================================================================

describe('QURAN_METADATA', () => {
  it('should have correct total surahs', () => {
    expect(QURAN_METADATA.totalSurahs).toBe(114);
  });

  it('should have correct total ayahs', () => {
    expect(QURAN_METADATA.totalAyahs).toBe(6236);
  });

  it('should have correct total pages', () => {
    expect(QURAN_METADATA.totalPages).toBe(604);
  });

  it('should have correct total juz', () => {
    expect(QURAN_METADATA.totalJuz).toBe(30);
  });

  it('should have correct total hizb', () => {
    expect(QURAN_METADATA.totalHizb).toBe(60);
  });

  it('should have correct manzils', () => {
    expect(QURAN_METADATA.manzils).toBe(7);
  });

  it('should have correct sajdah verses count', () => {
    expect(QURAN_METADATA.sajdahVerses).toBe(15);
  });
});

// =============================================================================
// SETTING_CATEGORIES Tests
// =============================================================================

describe('SETTING_CATEGORIES', () => {
  it('should have GENERAL category', () => {
    expect(SETTING_CATEGORIES.GENERAL).toBe('general');
  });

  it('should have AUDIO category', () => {
    expect(SETTING_CATEGORIES.AUDIO).toBe('audio');
  });

  it('should have DISPLAY category', () => {
    expect(SETTING_CATEGORIES.DISPLAY).toBe('display');
  });

  it('should have API category', () => {
    expect(SETTING_CATEGORIES.API).toBe('api');
  });

  it('should have SECURITY category', () => {
    expect(SETTING_CATEGORIES.SECURITY).toBe('security');
  });
});

// =============================================================================
// AUDIO_QUALITIES Tests
// =============================================================================

describe('AUDIO_QUALITIES', () => {
  it('should have LOW quality', () => {
    expect(AUDIO_QUALITIES.LOW.bitrate).toBe(64);
    expect(AUDIO_QUALITIES.LOW.label).toContain('Low');
  });

  it('should have MEDIUM quality', () => {
    expect(AUDIO_QUALITIES.MEDIUM.bitrate).toBe(128);
    expect(AUDIO_QUALITIES.MEDIUM.label).toContain('Medium');
  });

  it('should have HIGH quality', () => {
    expect(AUDIO_QUALITIES.HIGH.bitrate).toBe(256);
    expect(AUDIO_QUALITIES.HIGH.label).toContain('High');
  });

  it('should have LOSSLESS quality', () => {
    expect(AUDIO_QUALITIES.LOSSLESS.bitrate).toBe(320);
    expect(AUDIO_QUALITIES.LOSSLESS.label).toContain('Lossless');
  });

  it('should have increasing bitrates', () => {
    expect(AUDIO_QUALITIES.LOW.bitrate).toBeLessThan(AUDIO_QUALITIES.MEDIUM.bitrate);
    expect(AUDIO_QUALITIES.MEDIUM.bitrate).toBeLessThan(AUDIO_QUALITIES.HIGH.bitrate);
    expect(AUDIO_QUALITIES.HIGH.bitrate).toBeLessThan(AUDIO_QUALITIES.LOSSLESS.bitrate);
  });
});

// =============================================================================
// REVELATION_TYPES Tests
// =============================================================================

describe('REVELATION_TYPES', () => {
  it('should have MECCAN type', () => {
    expect(REVELATION_TYPES.MECCAN).toBe('Meccan');
  });

  it('should have MEDINAN type', () => {
    expect(REVELATION_TYPES.MEDINAN).toBe('Medinan');
  });

  it('should have exactly 2 types', () => {
    const types = Object.keys(REVELATION_TYPES);
    expect(types).toHaveLength(2);
  });
});

// =============================================================================
// NAV_ITEMS Tests
// =============================================================================

describe('NAV_ITEMS', () => {
  it('should have dashboard item', () => {
    const dashboard = NAV_ITEMS.find(item => item.id === 'dashboard');
    expect(dashboard).toBeDefined();
    expect(dashboard?.label).toBe('Dashboard');
  });

  it('should have database item', () => {
    const database = NAV_ITEMS.find(item => item.id === 'database');
    expect(database).toBeDefined();
    expect(database?.label).toBe('Database');
  });

  it('should have settings item', () => {
    const settings = NAV_ITEMS.find(item => item.id === 'settings');
    expect(settings).toBeDefined();
    expect(settings?.label).toBe('Settings');
  });

  it('should have correct number of items', () => {
    expect(NAV_ITEMS.length).toBe(10);
  });

  it('should all have required properties', () => {
    NAV_ITEMS.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('icon');
    });
  });
});
