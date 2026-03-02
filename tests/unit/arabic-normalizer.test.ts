/**
 * Unit Tests for Arabic Normalizer
 * 
 * Tests all functions in src/services/arabic-normalizer.ts
 * Following AAA Pattern (Arrange, Act, Assert)
 */

import { describe, it, expect } from 'vitest';
import {
  removeDiacritics,
  normalizeArabic,
  normalizeForSearch,
  extractRoot,
  tokenize,
  generateNgrams,
  generateEdgeNgrams,
  similarity,
  levenshteinDistance,
  fuzzyMatch,
  highlightMatch,
  parseReference,
} from '@/services/arabic-normalizer';

// =============================================================================
// removeDiacritics Tests
// =============================================================================

describe('removeDiacritics', () => {
  it('should remove fatha', () => {
    expect(removeDiacritics('بَسم')).toBe('بسم');
  });

  it('should remove damma', () => {
    expect(removeDiacritics('بُسم')).toBe('بسم');
  });

  it('should remove kasra', () => {
    expect(removeDiacritics('بِسم')).toBe('بسم');
  });

  it('should remove shadda', () => {
    expect(removeDiacritics('بّسم')).toBe('بسم');
  });

  it('should remove sukun', () => {
    expect(removeDiacritics('بْسم')).toBe('بسم');
  });

  it('should remove multiple diacritics from Bismillah', () => {
    const input = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
    const result = removeDiacritics(input);
    expect(result).toBe('بسم الله الرحمن الرحيم');
  });

  it('should remove tanwin (dammatan, kasratan, fathatan)', () => {
    expect(removeDiacritics('كتابٌ')).toBe('كتاب');
    expect(removeDiacritics('كتابٍ')).toBe('كتاب');
    expect(removeDiacritics('كتاباً')).toBe('كتابا');
  });

  it('should handle text without diacritics', () => {
    expect(removeDiacritics('بسم الله')).toBe('بسم الله');
  });

  it('should handle empty string', () => {
    expect(removeDiacritics('')).toBe('');
  });

  it('should preserve non-Arabic characters', () => {
    expect(removeDiacritics('Hello بِسْمِ World')).toBe('Hello بسم World');
  });
});

// =============================================================================
// normalizeArabic Tests
// =============================================================================

describe('normalizeArabic', () => {
  describe('Alef variants normalization', () => {
    it('should normalize alef with hamza above (أ) to plain alef', () => {
      expect(normalizeArabic('أحمد')).toBe('احمد');
    });

    it('should normalize alef with hamza below (إ) to plain alef', () => {
      expect(normalizeArabic('إسلام')).toBe('اسلام');
    });

    it('should normalize alef with madda (آ) to plain alef', () => {
      expect(normalizeArabic('آمن')).toBe('امن');
    });

    it('should normalize alef wasla (ٱ) to plain alef', () => {
      expect(normalizeArabic('ٱستغفر')).toBe('استغفر');
    });
  });

  describe('Teh marbuta normalization', () => {
    it('should normalize teh marbuta (ة) to heh (ه)', () => {
      expect(normalizeArabic('قراءة')).toBe('قراءه');
    });

    it('should normalize teh marbuta at end of word', () => {
      // Note: 'ك' is also normalized to 'ک'
      expect(normalizeArabic('مكة')).toBe('مکه');
    });
  });

  describe('Yeh variants normalization', () => {
    it('should normalize alef maksura (ى) to yeh', () => {
      expect(normalizeArabic('موسى')).toBe('موسي');
    });

    it('should normalize yeh with hamza (ئ) to yeh', () => {
      expect(normalizeArabic('سائل')).toBe('سايل');
    });
  });

  describe('Waw variants normalization', () => {
    it('should normalize waw with hamza (ؤ) to waw', () => {
      expect(normalizeArabic('مؤمن')).toBe('مومن');
    });
  });

  describe('Tatweel (kashida) removal', () => {
    it('should remove tatweel', () => {
      expect(normalizeArabic('الـرحمن')).toBe('الرحمن');
    });

    it('should remove multiple tatweels', () => {
      expect(normalizeArabic('الـــرحمن')).toBe('الرحمن');
    });
  });

  it('should handle empty string', () => {
    expect(normalizeArabic('')).toBe('');
  });

  it('should handle text without changes needed', () => {
    expect(normalizeArabic('سلام')).toBe('سلام');
  });
});

// =============================================================================
// normalizeForSearch Tests
// =============================================================================

describe('normalizeForSearch', () => {
  it('should fully normalize Bismillah', () => {
    const input = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ';
    const result = normalizeForSearch(input);
    expect(result).toBe('بسم الله الرحمن');
  });

  it('should normalize ayat al-kursi verse', () => {
    const input = 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ';
    const result = normalizeForSearch(input);
    expect(result).toContain('الله');
    expect(result).toContain('الحي');
  });

  it('should handle mixed Arabic and English', () => {
    const result = normalizeForSearch('Hello العَرَبِية World');
    expect(result).toContain('hello');
    expect(result).toContain('العربيه');
  });

  it('should collapse multiple spaces', () => {
    const result = normalizeForSearch('بسم    الله   الرحمن');
    expect(result).toBe('بسم الله الرحمن');
  });

  it('should trim leading and trailing spaces', () => {
    expect(normalizeForSearch('   بسم الله   ')).toBe('بسم الله');
  });

  it('should handle empty string', () => {
    expect(normalizeForSearch('')).toBe('');
  });

  it('should handle whitespace only', () => {
    expect(normalizeForSearch('   ')).toBe('');
  });
});

// =============================================================================
// extractRoot Tests
// =============================================================================

describe('extractRoot', () => {
  it('should remove definite article (ال)', () => {
    // Note: 'ك' is normalized to 'ک' (Persian/Urdu variant)
    expect(extractRoot('الكتاب')).toBe('کتاب');
  });

  it('should remove prefix و (waw)', () => {
    // Note: 'ك' is normalized to 'ک'
    expect(extractRoot('وكتاب')).toBe('کتاب');
  });

  it('should remove suffix ة (teh marbuta)', () => {
    // Note: 'ك' is normalized to 'ک', 'ة' is normalized to 'ه', then suffix is removed
    expect(extractRoot('كتابة')).toBe('کتاب');
  });

  it('should remove plural suffix ون', () => {
    // Note: removes 'ون' suffix
    expect(extractRoot('مسلمون')).toBe('مسلم');
  });

  it('should handle words without affixes', () => {
    // Note: 'ك' is normalized to 'ک' (Persian/Urdu variant)
    const result = extractRoot('كتاب');
    expect(result).toBe('کتاب');
  });

  it('should handle empty string', () => {
    expect(extractRoot('')).toBe('');
  });
});

// =============================================================================
// tokenize Tests
// =============================================================================

describe('tokenize', () => {
  it('should tokenize simple Arabic text', () => {
    const result = tokenize('بسم الله الرحمن');
    expect(result).toEqual(['بسم', 'الله', 'الرحمن']);
  });

  it('should tokenize text with diacritics', () => {
    const result = tokenize('بِسْمِ اللَّهِ');
    expect(result).toEqual(['بسم', 'الله']);
  });

  it('should handle multiple spaces', () => {
    const result = tokenize('بسم    الله');
    expect(result).toEqual(['بسم', 'الله']);
  });

  it('should return empty array for empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('should return empty array for whitespace only', () => {
    expect(tokenize('   ')).toEqual([]);
  });

  it('should tokenize mixed text', () => {
    const result = tokenize('Hello السلام World');
    expect(result).toEqual(['hello', 'السلام', 'world']);
  });
});

// =============================================================================
// generateNgrams Tests
// =============================================================================

describe('generateNgrams', () => {
  it('should generate 3-grams by default', () => {
    const result = generateNgrams('محمد');
    expect(result).toEqual(['محم', 'حمد']);
  });

  it('should generate 2-grams', () => {
    const result = generateNgrams('محمد', 2);
    expect(result).toEqual(['مح', 'حم', 'مد']);
  });

  it('should generate 4-grams', () => {
    const result = generateNgrams('محمد', 4);
    expect(result).toEqual(['محمد']);
  });

  it('should return empty array for text shorter than n', () => {
    const result = generateNgrams('مح', 3);
    expect(result).toEqual([]);
  });

  it('should handle empty string', () => {
    expect(generateNgrams('')).toEqual([]);
  });
});

// =============================================================================
// generateEdgeNgrams Tests
// =============================================================================

describe('generateEdgeNgrams', () => {
  it('should generate edge n-grams with default parameters', () => {
    const result = generateEdgeNgrams('محمد');
    expect(result[0]).toBe('مح');
    expect(result).toContain('محم');
    expect(result).toContain('محمد');
  });

  it('should generate edge n-grams with custom min and max', () => {
    const result = generateEdgeNgrams('محمد', 1, 3);
    expect(result).toEqual(['م', 'مح', 'محم']);
  });

  it('should handle text shorter than maxGram', () => {
    const result = generateEdgeNgrams('مح', 2, 10);
    expect(result).toEqual(['مح']);
  });

  it('should handle empty string', () => {
    expect(generateEdgeNgrams('')).toEqual([]);
  });
});

// =============================================================================
// similarity Tests
// =============================================================================

describe('similarity', () => {
  it('should return 1 for identical texts', () => {
    expect(similarity('محمد', 'محمد')).toBe(1);
  });

  it('should return 0 for completely different texts', () => {
    expect(similarity('محمد', 'علي')).toBe(0);
  });

  it('should calculate partial similarity', () => {
    const result = similarity('محمد أحمد', 'محمد علي');
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it('should handle empty strings', () => {
    // When both are empty, they are equal (returns 1)
    expect(similarity('', '')).toBe(1);
    // When one is empty, returns 0
    expect(similarity('محمد', '')).toBe(0);
    expect(similarity('', 'محمد')).toBe(0);
  });

  it('should be case insensitive for Latin text', () => {
    expect(similarity('HELLO', 'hello')).toBe(1);
  });
});

// =============================================================================
// levenshteinDistance Tests
// =============================================================================

describe('levenshteinDistance', () => {
  it('should return 0 for identical strings', () => {
    expect(levenshteinDistance('محمد', 'محمد')).toBe(0);
  });

  it('should calculate single character difference', () => {
    expect(levenshteinDistance('محمد', 'ممد')).toBe(1);
  });

  it('should calculate insertion', () => {
    expect(levenshteinDistance('مد', 'ممد')).toBe(1);
  });

  it('should calculate deletion', () => {
    expect(levenshteinDistance('محمد', 'مد')).toBe(2);
  });

  it('should handle empty strings', () => {
    expect(levenshteinDistance('', 'محمد')).toBe(4);
    expect(levenshteinDistance('محمد', '')).toBe(4);
    expect(levenshteinDistance('', '')).toBe(0);
  });
});

// =============================================================================
// fuzzyMatch Tests
// =============================================================================

describe('fuzzyMatch', () => {
  it('should return 1 for identical texts', () => {
    expect(fuzzyMatch('محمد', 'محمد')).toBe(1);
  });

  it('should return high score for similar texts', () => {
    const result = fuzzyMatch('محمد', 'ممد');
    expect(result).toBeGreaterThan(0.7);
  });

  it('should return low score for different texts', () => {
    const result = fuzzyMatch('محمد', 'علي');
    expect(result).toBeLessThan(0.5);
  });
});

// =============================================================================
// highlightMatch Tests
// =============================================================================

describe('highlightMatch', () => {
  it('should highlight matched text with default tags', () => {
    const result = highlightMatch('بسم الله الرحمن', 'الله');
    expect(result).toBe('بسم <mark>الله</mark> الرحمن');
  });

  it('should highlight with custom tags', () => {
    const result = highlightMatch('بسم الله', 'الله', '**', '**');
    expect(result).toBe('بسم **الله**');
  });

  it('should return original text if no match', () => {
    const result = highlightMatch('بسم الله', 'محمد');
    expect(result).toBe('بسم الله');
  });

  it('should handle empty query', () => {
    const result = highlightMatch('بسم الله', '');
    expect(result).toBe('بسم الله');
  });

  it('should handle diacritics in both text and query', () => {
    const result = highlightMatch('بِسْمِ اللَّهِ', 'الله');
    expect(result).toContain('<mark>');
  });
});

// =============================================================================
// parseReference Tests
// =============================================================================

describe('parseReference', () => {
  it('should parse numeric reference', () => {
    const result = parseReference('2:255');
    expect(result).toEqual({ surah: 2, ayah: 255 });
  });

  it('should parse numeric reference with spaces', () => {
    const result = parseReference('2 : 255');
    expect(result).toEqual({ surah: 2, ayah: 255 });
  });

  it('should parse named reference', () => {
    const result = parseReference('البقرة:255');
    expect(result).toEqual({ surah: 'البقرة', ayah: 255 });
  });

  it('should parse named reference with spaces', () => {
    const result = parseReference('البقرة : 255');
    expect(result).toEqual({ surah: 'البقرة', ayah: 255 });
  });

  it('should return null for invalid format', () => {
    expect(parseReference('invalid')).toBeNull();
    expect(parseReference('2-255')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseReference('')).toBeNull();
  });
});
