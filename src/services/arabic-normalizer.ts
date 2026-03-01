/**
 * Arabic Text Normalizer for Quran Search
 * 
 * Handles normalization, diacritics removal, and text processing
 * for Arabic Quran text search.
 * 
 * @module arabic-normalizer
 */

// Character normalization mappings
const CHAR_NORMALIZATIONS: Record<string, string> = {
  // Alef variants -> plain Alef
  'أ': 'ا',
  'إ': 'ا',
  'آ': 'ا',
  'ٱ': 'ا',
  
  // Teh marbuta -> Heh
  'ة': 'ه',
  'ۀ': 'ه',
  
  // Yeh variants -> plain Yeh
  'ى': 'ي',
  'ئ': 'ي',
  'ي': 'ي',
  
  // Waw variants -> plain Waw
  'ؤ': 'و',
  
  // Persian/Urdu variants
  'ك': 'ک',
  'گ': 'ك',
};

// Diacritics (Tashkeel) to remove
// These are the Arabic vowel marks and other diacritical marks
const DIACRITICS = [
  '\u064E', // Fatha ( َ )
  '\u064F', // Damma ( ُ )
  '\u0650', // Kasra ( ِ )
  '\u064B', // Fathatan ( ً )
  '\u064C', // Dammatan ( ٌ )
  '\u064D', // Kasratan ( ٍ )
  '\u0651', // Shadda ( ّ )
  '\u0652', // Sukun ( ْ )
  '\u0653', // Maddah above ( ٓ )
  '\u0654', // Hamza above ( ٔ )
  '\u0655', // Hamza below ( ٕ )
  '\u0670', // Alef wasla ( ٰ )
  '\u0656', // Subscript alef ( ٖ )
  '\u0657', // Inverted damma ( ٗ )
  '\u0658', // Mark noon ghunna ( ٘ )
  '\u0659', // Zwarakay ( ٙ )
  '\u065A', // Vowel sign small v above ( ٚ )
  '\u065B', // Vowel sign inverted small v above ( ٝ )
  '\u065C', // Vowel sign dot below ( ٜ )
  '\u065D', // Reversed rounded high stop
  '\u065E', // Rounded high stop
  '\u065F', // Hamza below
  '\u0671', // Alef wasla
  '\u06DC', // Small high rounded zero
  '\u06DF', // Small high rounded zero with filled centre
  '\u06E0', // Small high rounded zero with dot
  '\u06E1', // Small high yeh
  '\u06E2', // Small high meem
  '\u06E3', // Small low seen
  '\u06E4', // Small high madda
  '\u06E7', // Small high yeh
  '\u06E8', // Small high noon
  '\u06EA', // Empty centre low stop
  '\u06EB', // Empty centre high stop
  '\u06EC', // Rounded high stop with filled centre
  '\u06ED', // Small low seen
  '\uFC5E', // Shadda + damma ligature
  '\uFC5F', // Shadda + kasra ligature
  '\uFC60', // Shadda + fatha ligature
  '\uFC61', // Shadda + dammatan ligature
  '\uFC62', // Shadda + kasratan ligature
  '\uFC63', // Shadda + fathatan ligature
];

// Tatweel (kashida) to remove
const TATWEEL = '\u0640';

// Common Arabic prefixes for root extraction
const ARABIC_PREFIXES = [
  'وال', 'فال', 'بال', 'كال', 'لل',
  'ال', 'وا', 'فب', 'بـ', 'كـ', 'لـ', 'وا',
  'و', 'ف', 'ل', 'ب', 'ك', 'ي', 'ت', 'أ', 'ن',
];

// Common Arabic suffixes for root extraction
const ARABIC_SUFFIXES = [
  'ات', 'ون', 'ين', 'ان', 'تم', 'تن', 'وا', 'ها', 'هم', 'هن', 'كم', 'نا',
  'ية', 'يه', 'ة', 'ه', 'ي', 'ك', 'ا', 'ن', 'ت', 'و',
];

/**
 * Remove all diacritics (Tashkeel) from Arabic text
 * 
 * @param text - The Arabic text to process
 * @returns Text with all diacritics removed
 * 
 * @example
 * ```typescript
 * removeDiacritics('بِسْمِ اللَّهِ') // 'بسم الله'
 * ```
 */
export function removeDiacritics(text: string): string {
  let result = text;
  for (const diacritic of DIACRITICS) {
    result = result.split(diacritic).join('');
  }
  return result;
}

/**
 * Normalize Arabic characters (Alef, Yeh, Teh Marbuta, etc.)
 * 
 * Converts variant forms to their standard forms:
 * - أ, إ, آ, ٱ -> ا
 * - ى, ئ -> ي
 * - ة, ۀ -> ه
 * - ؤ -> و
 * 
 * @param text - The Arabic text to normalize
 * @returns Normalized text
 * 
 * @example
 * ```typescript
 * normalizeArabic('أحمد') // 'احمد'
 * normalizeArabic('قراءة') // 'قراءه'
 * ```
 */
export function normalizeArabic(text: string): string {
  let result = text;
  
  // Remove tatweel (kashida)
  result = result.split(TATWEEL).join('');
  
  // Apply character normalizations
  for (const [from, to] of Object.entries(CHAR_NORMALIZATIONS)) {
    result = result.split(from).join(to);
  }
  
  return result;
}

/**
 * Full normalization for search
 * 
 * Performs complete normalization:
 * 1. Remove diacritics (Tashkeel)
 * 2. Normalize characters (Alef variants, Yeh variants, etc.)
 * 3. Convert to lowercase (for any Latin characters)
 * 4. Remove extra whitespace
 * 
 * @param text - The text to normalize
 * @returns Fully normalized text ready for search
 * 
 * @example
 * ```typescript
 * normalizeForSearch('بِسْمِ اللَّهِ الرَّحْمَٰنِ') // 'بسم الله الرحمن'
 * ```
 */
export function normalizeForSearch(text: string): string {
  let result = text;
  
  // Remove diacritics
  result = removeDiacritics(result);
  
  // Normalize characters
  result = normalizeArabic(result);
  
  // Lowercase (for any Latin characters)
  result = result.toLowerCase();
  
  // Remove extra spaces
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

/**
 * Extract root letters from an Arabic word
 * 
 * This is a simplified version that removes common prefixes and suffixes.
 * For production, consider using a proper Arabic stemmer like ISRI or Khoja.
 * 
 * @param word - The Arabic word to process
 * @returns The extracted root (approximate)
 * 
 * @example
 * ```typescript
 * extractRoot('الكتاب') // 'كتاب'
 * extractRoot('المسلمين') // 'سلم'
 * ```
 */
export function extractRoot(word: string): string {
  const normalized = normalizeForSearch(word);
  
  let root = normalized;
  
  // Remove prefixes (longest first)
  for (const prefix of ARABIC_PREFIXES) {
    if (root.startsWith(prefix)) {
      root = root.slice(prefix.length);
      break;
    }
  }
  
  // Remove suffixes (longest first)
  for (const suffix of ARABIC_SUFFIXES) {
    if (root.endsWith(suffix)) {
      root = root.slice(0, -suffix.length);
      break;
    }
  }
  
  return root;
}

/**
 * Tokenize Arabic text into words
 * 
 * @param text - The text to tokenize
 * @returns Array of words
 * 
 * @example
 * ```typescript
 * tokenize('بسم الله الرحمن') // ['بسم', 'الله', 'الرحمن']
 * ```
 */
export function tokenize(text: string): string[] {
  return normalizeForSearch(text)
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Generate n-grams from text
 * 
 * Useful for fuzzy matching and autocomplete
 * 
 * @param text - The text to process
 * @param n - The size of n-grams (default: 3)
 * @returns Array of n-grams
 * 
 * @example
 * ```typescript
 * generateNgrams('محمد', 2) // ['مح', 'حم', 'مد']
 * ```
 */
export function generateNgrams(text: string, n: number = 3): string[] {
  const normalized = normalizeForSearch(text);
  const ngrams: string[] = [];
  
  for (let i = 0; i <= normalized.length - n; i++) {
    ngrams.push(normalized.slice(i, i + n));
  }
  
  return ngrams;
}

/**
 * Generate edge n-grams from text (prefix n-grams)
 * 
 * Useful for autocomplete functionality
 * 
 * @param text - The text to process
 * @param minGram - Minimum gram size (default: 2)
 * @param maxGram - Maximum gram size (default: 10)
 * @returns Array of edge n-grams
 * 
 * @example
 * ```typescript
 * generateEdgeNgrams('محمد') // ['مح', 'محمد', 'محم', 'محمد']
 * ```
 */
export function generateEdgeNgrams(
  text: string,
  minGram: number = 2,
  maxGram: number = 10
): string[] {
  const normalized = normalizeForSearch(text);
  const ngrams: string[] = [];
  
  for (let i = minGram; i <= Math.min(maxGram, normalized.length); i++) {
    ngrams.push(normalized.slice(0, i));
  }
  
  return ngrams;
}

/**
 * Calculate similarity between two Arabic texts using Jaccard similarity
 * 
 * @param text1 - First text
 * @param text2 - Second text
 * @returns Similarity score (0-1)
 * 
 * @example
 * ```typescript
 * similarity('محمد', 'محمد') // 1
 * similarity('محمد', 'أحمد') // 0.33
 * ```
 */
export function similarity(text1: string, text2: string): number {
  const norm1 = normalizeForSearch(text1);
  const norm2 = normalizeForSearch(text2);
  
  if (norm1 === norm2) return 1;
  if (norm1.length === 0 || norm2.length === 0) return 0;
  
  // Jaccard similarity on words
  const words1 = new Set(tokenize(norm1));
  const words2 = new Set(tokenize(norm2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate Levenshtein distance between two strings
 * 
 * Useful for fuzzy matching
 * 
 * @param str1 - First string
 * @param str2 - Second string
 * @returns The edit distance
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Calculate fuzzy match score between two Arabic texts
 * 
 * @param text1 - First text
 * @param text2 - Second text
 * @returns Fuzzy match score (0-1)
 */
export function fuzzyMatch(text1: string, text2: string): number {
  const norm1 = normalizeForSearch(text1);
  const norm2 = normalizeForSearch(text2);
  
  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  
  return 1 - distance / maxLength;
}

/**
 * Highlight matched text in search results
 * 
 * @param text - Original text
 * @param query - Search query
 * @param preTag - Tag to insert before match (default: <mark>)
 * @param postTag - Tag to insert after match (default: </mark>)
 * @returns Text with highlighted matches
 * 
 * @example
 * ```typescript
 * highlightMatch('بسم الله الرحمن', 'الله')
 * // 'بسم <mark>الله</mark> الرحمن'
 * ```
 */
export function highlightMatch(
  text: string,
  query: string,
  preTag: string = '<mark>',
  postTag: string = '</mark>'
): string {
  const normalizedText = removeDiacritics(text);
  const normalizedQuery = removeDiacritics(query);
  
  // Find match positions in normalized text
  const regex = new RegExp(normalizedQuery, 'gi');
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(normalizedText)) !== null) {
    // Add text before match
    result += text.slice(lastIndex, match.index);
    
    // Add highlighted match
    result += preTag + text.slice(match.index, match.index + match[0].length) + postTag;
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  result += text.slice(lastIndex);
  
  return result || text;
}

/**
 * Extract Surah and Ayah reference from text (e.g., "2:255" or "البقرة:255")
 * 
 * @param text - Text containing reference
 * @returns Parsed reference or null
 */
export function parseReference(text: string): { surah: number | string; ayah: number } | null {
  // Try numeric reference (e.g., "2:255")
  const numericMatch = text.match(/^(\d+)\s*:\s*(\d+)$/);
  if (numericMatch) {
    return {
      surah: parseInt(numericMatch[1]),
      ayah: parseInt(numericMatch[2]),
    };
  }
  
  // Try named reference (e.g., "البقرة:255")
  const namedMatch = text.match(/^(.+?)\s*:\s*(\d+)$/);
  if (namedMatch) {
    return {
      surah: namedMatch[1],
      ayah: parseInt(namedMatch[2]),
    };
  }
  
  return null;
}

// Export all functions as default object
export default {
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
};
