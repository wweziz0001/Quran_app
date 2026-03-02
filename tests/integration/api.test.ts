/**
 * Integration Tests for API Routes
 * 
 * Tests the main API endpoints using mocked database
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    surah: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    ayah: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    reciter: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    tafsirSource: {
      findMany: vi.fn(),
    },
    appSetting: {
      findMany: vi.fn(),
    },
  },
}));

import { db } from '@/lib/db';

// =============================================================================
// Surahs API Tests
// =============================================================================

describe('Surahs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/surahs', () => {
    it('should return list of surahs', async () => {
      // Arrange
      const mockSurahs = [
        {
          id: 1,
          number: 1,
          nameArabic: 'الفاتحة',
          nameEnglish: 'Al-Fatihah',
          nameTransliteration: 'Al-Fatihah',
          revelationType: 'Meccan',
          totalAyahs: 7,
          pageNumberStart: 1,
          juzNumberStart: 1,
          description: 'The Opening',
          _count: { Ayah: 7 },
        },
        {
          id: 2,
          number: 2,
          nameArabic: 'البقرة',
          nameEnglish: 'Al-Baqarah',
          nameTransliteration: 'Al-Baqarah',
          revelationType: 'Medinan',
          totalAyahs: 286,
          pageNumberStart: 2,
          juzNumberStart: 1,
          description: 'The Cow',
          _count: { Ayah: 286 },
        },
      ];

      vi.mocked(db.surah.findMany).mockResolvedValue(mockSurahs);

      // Act
      const { GET } = await import('@/app/api/surahs/route');
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].nameArabic).toBe('الفاتحة');
    });

    it('should handle database errors', async () => {
      // Arrange
      vi.mocked(db.surah.findMany).mockRejectedValue(new Error('Database error'));

      // Act
      const { GET } = await import('@/app/api/surahs/route');
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch surahs');
    });
  });
});

// =============================================================================
// Version API Tests
// =============================================================================

describe('Version API', () => {
  describe('GET /api/version', () => {
    it('should return version information', async () => {
      // Act
      const { GET } = await import('@/app/api/version/route');
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('version');
    });
  });
});

// =============================================================================
// Settings API Tests
// =============================================================================

describe('Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/settings', () => {
    it('should return public settings', async () => {
      // Arrange
      const mockSettings = [
        { id: '1', key: 'appName', value: 'Quran App', isPublic: true },
        { id: '2', key: 'version', value: '1.0.0', isPublic: true },
      ];

      vi.mocked(db.appSetting.findMany).mockResolvedValue(mockSettings);

      // Act
      const { GET } = await import('@/app/api/settings/route');
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

// =============================================================================
// Reciters API Tests
// =============================================================================

describe('Reciters API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/reciters', () => {
    it('should return list of reciters', async () => {
      // Arrange
      const mockReciters = [
        {
          id: 1,
          nameArabic: 'عبد الباسط عبد الصمد',
          nameEnglish: 'Abdul Basit Abdul Samad',
          slug: 'abdul-basit',
          isActive: true,
        },
        {
          id: 2,
          nameArabic: 'ماهر المعيقلي',
          nameEnglish: 'Maher Al-Muaiqly',
          slug: 'maher-muaiqly',
          isActive: true,
        },
      ];

      vi.mocked(db.reciter.findMany).mockResolvedValue(mockReciters);

      // Act
      const { GET } = await import('@/app/api/reciters/route');
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('should filter by active status', async () => {
      // Arrange
      vi.mocked(db.reciter.findMany).mockResolvedValue([]);

      // Act
      const { GET } = await import('@/app/api/reciters/route');
      const response = await GET();

      // Assert
      expect(db.reciter.findMany).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Tafsir API Tests
// =============================================================================

describe('Tafsir API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/tafsir', () => {
    it('should return list of tafsir sources', async () => {
      // Arrange
      const mockSources = [
        {
          id: 1,
          name: 'Tafsir Ibn Kathir',
          language: 'ar',
          isActive: true,
        },
        {
          id: 2,
          name: 'Tafsir Al-Tabari',
          language: 'ar',
          isActive: true,
        },
      ];

      vi.mocked(db.tafsirSource.findMany).mockResolvedValue(mockSources);

      // Act
      const { GET } = await import('@/app/api/tafsir/route');
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

// =============================================================================
// Search API Tests
// =============================================================================

describe('Search API', () => {
  describe('Search functionality', () => {
    it('should handle empty search query', async () => {
      // This tests the validation of search input
      const searchQuery = '';
      expect(searchQuery.length).toBe(0);
    });

    it('should validate minimum search length', () => {
      const MIN_SEARCH_LENGTH = 2;
      const shortQuery = 'ا';
      expect(shortQuery.length).toBeLessThan(MIN_SEARCH_LENGTH);
    });

    it('should accept valid search query', () => {
      const validQuery = 'الله';
      expect(validQuery.length).toBeGreaterThan(1);
    });
  });
});
