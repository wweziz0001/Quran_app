/**
 * Elasticsearch Client for Quran Search
 * 
 * Provides connection management and search operations
 * for the Quran Ayahs index.
 * 
 * @module elasticsearch
 */

import {
  removeDiacritics,
  normalizeForSearch,
  tokenize,
  highlightMatch,
} from './arabic-normalizer';

// Elasticsearch configuration
const ES_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const ES_USERNAME = process.env.ELASTICSEARCH_USERNAME;
const ES_PASSWORD = process.env.ELASTICSEARCH_PASSWORD;
const ES_API_KEY = process.env.ELASTICSEARCH_API_KEY;

// Index names
export const INDICES = {
  QURAN_AYAHS: 'quran_ayahs',
  QURAN_WORDS: 'quran_words',
  QURAN_ROOTS: 'quran_roots',
  QURAN_TOPICS: 'quran_topics',
} as const;

// Types
export interface SearchHit {
  _id: string;
  _score: number;
  _source: QuranDocument;
  highlight?: Record<string, string[]>;
}

export interface QuranDocument {
  id: number;
  surahId: number;
  surahNumber: number;
  surahName?: string;
  surahNameArabic?: string;
  ayahNumber: number;
  ayahNumberGlobal: number;
  textArabic: string;
  textUthmani?: string;
  textIndopak?: string;
  pageNumber?: number;
  juzNumber?: number;
  hizbNumber?: number;
  sajdah: boolean;
  words?: string;
  roots?: string[];
  topics?: string[];
  translation?: string;
  translationSource?: string;
  tafsirText?: string;
  tafsirSource?: string;
  embedding?: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchResult {
  hits: QuranDocument[];
  total: number;
  took: number;
  maxScore: number;
  aggregations?: Record<string, unknown>;
}

export interface SearchOptions {
  index?: string;
  query: string;
  fields?: string[];
  filters?: {
    surahId?: number | number[];
    juzNumber?: number;
    hizbNumber?: number;
    pageNumber?: number;
    sajdah?: boolean;
  };
  from?: number;
  size?: number;
  sort?: string;
  fuzzy?: boolean;
  highlight?: boolean;
  explain?: boolean;
}

export interface AutocompleteOptions {
  prefix: string;
  field?: string;
  size?: number;
  fuzzy?: boolean;
}

// Request headers
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (ES_API_KEY) {
    headers['Authorization'] = `ApiKey ${ES_API_KEY}`;
  } else if (ES_USERNAME && ES_PASSWORD) {
    const credentials = Buffer.from(`${ES_USERNAME}:${ES_PASSWORD}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  return headers;
}

/**
 * Check Elasticsearch connection health
 */
export async function checkHealth(): Promise<{
  status: 'green' | 'yellow' | 'red';
  clusterName: string;
  numberOfNodes: number;
}> {
  const response = await fetch(`${ES_URL}/_cluster/health`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Elasticsearch health check failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    status: data.status,
    clusterName: data.cluster_name,
    numberOfNodes: data.number_of_nodes,
  };
}

/**
 * Check if an index exists
 */
export async function indexExists(index: string): Promise<boolean> {
  const response = await fetch(`${ES_URL}/${index}`, {
    method: 'HEAD',
    headers: getHeaders(),
  });

  return response.ok;
}

/**
 * Create an index with settings and mappings
 */
export async function createIndex(
  index: string,
  config: Record<string, unknown>
): Promise<void> {
  const response = await fetch(`${ES_URL}/${index}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create index: ${error}`);
  }
}

/**
 * Index a single document
 */
export async function indexDocument(
  index: string,
  id: string,
  document: Record<string, unknown>
): Promise<void> {
  const response = await fetch(`${ES_URL}/${index}/_doc/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(document),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to index document: ${error}`);
  }
}

/**
 * Bulk index documents
 */
export async function bulkIndex(
  index: string,
  documents: { id: string; source: Record<string, unknown> }[]
): Promise<{ took: number; errors: boolean; items: unknown[] }> {
  const body = documents
    .flatMap((doc) => [
      JSON.stringify({ index: { _index: index, _id: doc.id } }),
      JSON.stringify(doc.source),
    ])
    .join('\n') + '\n';

  const response = await fetch(`${ES_URL}/_bulk`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/x-ndjson',
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Bulk index failed: ${error}`);
  }

  const result = await response.json();
  return {
    took: result.took,
    errors: result.errors,
    items: result.items,
  };
}

/**
 * Search for Quran ayahs
 */
export async function search(options: SearchOptions): Promise<SearchResult> {
  const {
    index = INDICES.QURAN_AYAHS,
    query,
    fields = ['textArabic', 'textArabic.exact', 'textArabic.autocomplete'],
    filters = {},
    from = 0,
    size = 20,
    sort,
    fuzzy = false,
    highlight = true,
    explain = false,
  } = options;

  // Normalize the query for Arabic search
  const normalizedQuery = normalizeForSearch(query);
  const exactQuery = removeDiacritics(query);

  // Build the query
  const must: Record<string, unknown>[] = [];
  const filter: Record<string, unknown>[] = [];

  // Multi-match query
  must.push({
    bool: {
      should: [
        // Exact match (highest priority)
        {
          match: {
            'textArabic.exact': {
              query: exactQuery,
              boost: 3,
            },
          },
        },
        // Normalized match
        {
          match: {
            textArabic: {
              query: normalizedQuery,
              boost: 2,
            },
          },
        },
        // Fuzzy match (if enabled)
        ...(fuzzy
          ? [
              {
                match: {
                  textArabic: {
                    query: normalizedQuery,
                    fuzziness: 'AUTO',
                    boost: 1,
                  },
                },
              },
            ]
          : []),
        // Phrase match
        {
          match_phrase: {
            textArabic: {
              query: normalizedQuery,
              boost: 2.5,
            },
          },
        },
        // Search in roots
        {
          terms: {
            roots: tokenize(normalizedQuery),
            boost: 1.5,
          },
        },
      ],
      minimum_should_match: 1,
    },
  });

  // Add filters
  if (filters.surahId) {
    const surahIds = Array.isArray(filters.surahId)
      ? filters.surahId
      : [filters.surahId];
    filter.push({ terms: { surahId: surahIds } });
  }
  if (filters.juzNumber) {
    filter.push({ term: { juzNumber: filters.juzNumber } });
  }
  if (filters.hizbNumber) {
    filter.push({ term: { hizbNumber: filters.hizbNumber } });
  }
  if (filters.pageNumber) {
    filter.push({ term: { pageNumber: filters.pageNumber } });
  }
  if (filters.sajdah !== undefined) {
    filter.push({ term: { sajdah: filters.sajdah } });
  }

  // Build the search body
  const searchBody: Record<string, unknown> = {
    query: {
      bool: {
        must,
        filter: filter.length > 0 ? filter : undefined,
      },
    },
    from,
    size,
    track_total_hits: true,
    explain,
  };

  // Add sorting
  if (sort) {
    searchBody.sort = [{ [sort]: 'asc' }];
  }

  // Add highlighting
  if (highlight) {
    searchBody.highlight = {
      fields: {
        textArabic: {},
        'textArabic.exact': {},
      },
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
      fragment_size: 200,
      number_of_fragments: 1,
    };
  }

  // Execute the search
  const response = await fetch(`${ES_URL}/${index}/_search`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(searchBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Search failed: ${error}`);
  }

  const result = await response.json();

  // Process results
  const hits: QuranDocument[] = result.hits.hits.map(
    (hit: { _id: string; _score: number; _source: QuranDocument; highlight?: Record<string, string[]> }) => ({
      ...hit._source,
      id: parseInt(hit._id),
      score: hit._score,
      highlight: hit.highlight,
    })
  );

  return {
    hits,
    total: typeof result.hits.total === 'number'
      ? result.hits.total
      : result.hits.total?.value || 0,
    took: result.took,
    maxScore: result.hits.max_score || 0,
    aggregations: result.aggregations,
  };
}

/**
 * Autocomplete suggestions
 */
export async function autocomplete(options: AutocompleteOptions): Promise<
  { text: string; surah: string; reference: string; score: number }[]
> {
  const { prefix, field = 'textArabic.autocomplete', size = 10, fuzzy = true } = options;

  if (prefix.length < 2) {
    return [];
  }

  const normalizedPrefix = normalizeForSearch(prefix);

  const searchBody = {
    query: {
      bool: {
        should: [
          {
            match: {
              [field]: {
                query: normalizedPrefix,
                ...(fuzzy && { fuzziness: 'AUTO' }),
              },
            },
          },
          {
            match_phrase_prefix: {
              textArabic: normalizedPrefix,
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
    _source: ['textArabic', 'surahNameArabic', 'surahNumber', 'ayahNumber'],
    size,
  };

  const response = await fetch(`${ES_URL}/${INDICES.QURAN_AYAHS}/_search`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(searchBody),
  });

  if (!response.ok) {
    return [];
  }

  const result = await response.json();

  return result.hits.hits.map(
    (hit: { _source: QuranDocument; _score: number }) => ({
      text: hit._source.textArabic?.substring(0, 100) + '...',
      surah: hit._source.surahNameArabic || '',
      reference: `${hit._source.surahNumber}:${hit._source.ayahNumber}`,
      score: hit._score,
    })
  );
}

/**
 * Get a document by ID
 */
export async function getDocument(index: string, id: string): Promise<QuranDocument | null> {
  const response = await fetch(`${ES_URL}/${index}/_doc/${id}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to get document: ${response.statusText}`);
  }

  const result = await response.json();
  return result._source;
}

/**
 * Get multiple documents by IDs
 */
export async function getDocuments(
  index: string,
  ids: string[]
): Promise<QuranDocument[]> {
  const response = await fetch(`${ES_URL}/${index}/_mget`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get documents: ${response.statusText}`);
  }

  const result = await response.json();
  return result.docs
    .filter((doc: { found: boolean }) => doc.found)
    .map((doc: { _source: QuranDocument }) => doc._source);
}

/**
 * Count documents in an index
 */
export async function countDocuments(index: string): Promise<number> {
  const response = await fetch(`${ES_URL}/${index}/_count`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to count documents: ${response.statusText}`);
  }

  const result = await response.json();
  return result.count;
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(index: string, id: string): Promise<void> {
  const response = await fetch(`${ES_URL}/${index}/_doc/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete document: ${response.statusText}`);
  }
}

/**
 * Delete an index
 */
export async function deleteIndex(index: string): Promise<void> {
  const response = await fetch(`${ES_URL}/${index}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete index: ${response.statusText}`);
  }
}

/**
 * Refresh an index
 */
export async function refreshIndex(index: string): Promise<void> {
  await fetch(`${ES_URL}/${index}/_refresh`, {
    method: 'POST',
    headers: getHeaders(),
  });
}

// Export all functions as default
export default {
  checkHealth,
  indexExists,
  createIndex,
  indexDocument,
  bulkIndex,
  search,
  autocomplete,
  getDocument,
  getDocuments,
  countDocuments,
  deleteDocument,
  deleteIndex,
  refreshIndex,
  highlightMatch,
  INDICES,
};
