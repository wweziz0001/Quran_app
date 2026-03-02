#!/usr/bin/env bun

/**
 * Test Search Queries
 * 
 * This script tests various search queries against the Quran index.
 * Run with: bun run elastic/scripts/test-search.ts
 */

const ES_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const INDEX_NAME = 'quran_ayahs';

interface SearchResult {
  hits: {
    total: { value: number };
    hits: Array<{
      _id: string;
      _score: number;
      _source: Record<string, unknown>;
      highlight?: Record<string, string[]>;
    }>;
  };
  took: number;
}

async function testSearch(
  query: string,
  options: {
    analyzer?: string;
    fuzzy?: boolean;
    surahId?: number;
    size?: number;
  } = {}
): Promise<void> {
  const { analyzer = 'arabic_search_analyzer', fuzzy = false, surahId, size = 5 } = options;

  console.log(`\n🔍 Testing search: "${query}"`);
  console.log(`   Analyzer: ${analyzer}`);
  console.log(`   Fuzzy: ${fuzzy}`);
  if (surahId) console.log(`   Surah: ${surahId}`);

  const searchBody: Record<string, unknown> = {
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query,
              fields: ['textArabic', 'textArabic.exact', 'textArabic.autocomplete'],
              type: 'best_fields',
              ...(fuzzy && { fuzziness: 'AUTO' }),
            },
          },
        ],
        ...(surahId && {
          filter: [{ term: { surahId } }],
        }),
      },
    },
    size,
    highlight: {
      fields: {
        textArabic: {},
        'textArabic.exact': {},
      },
      pre_tags: ['\x1b[33m'],
      post_tags: ['\x1b[0m'],
    },
  };

  try {
    const response = await fetch(`${ES_URL}/${INDEX_NAME}/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ Error: ${error}`);
      return;
    }

    const result: SearchResult = await response.json();
    
    console.log(`   ✅ Found ${result.hits.total.value} results (${result.took}ms)\n`);

    for (const hit of result.hits.hits) {
      const source = hit._source as {
        surahNameArabic?: string;
        surahNumber?: number;
        ayahNumber?: number;
        textArabic?: string;
      };
      
      console.log(`   📖 Surah ${source.surahNumber}, Ayah ${source.ayahNumber}`);
      console.log(`      ${source.surahNameArabic}`);
      
      if (hit.highlight?.textArabic) {
        console.log(`      "${hit.highlight.textArabic[0]}"`);
      } else {
        const text = source.textArabic || '';
        console.log(`      "${text.substring(0, 80)}..."`);
      }
      console.log(`      Score: ${hit._score}\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }
}

async function testAutocomplete(prefix: string): Promise<void> {
  console.log(`\n💡 Testing autocomplete: "${prefix}"`);

  const searchBody = {
    query: {
      match: {
        'textArabic.autocomplete': prefix,
      },
    },
    _source: ['textArabic', 'surahNameArabic', 'surahNumber', 'ayahNumber'],
    size: 5,
  };

  try {
    const response = await fetch(`${ES_URL}/${INDEX_NAME}/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      console.log(`   ❌ Error`);
      return;
    }

    const result: SearchResult = await response.json();
    
    console.log(`   ✅ Found ${result.hits.total.value} suggestions\n`);

    for (const hit of result.hits.hits) {
      const source = hit._source as {
        surahNameArabic?: string;
        surahNumber?: number;
        ayahNumber?: number;
        textArabic?: string;
      };
      console.log(`   → ${source.surahNumber}:${source.ayahNumber} - ${source.textArabic?.substring(0, 50)}...`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }
}

async function testAnalyzers(): Promise<void> {
  console.log('\n🧪 Testing Analyzers...\n');

  const testText = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
  
  const analyzers = [
    'arabic_analyzer',
    'arabic_search_analyzer',
    'arabic_exact_analyzer',
    'autocomplete_analyzer',
  ];

  for (const analyzer of analyzers) {
    console.log(`   Analyzer: ${analyzer}`);
    
    const response = await fetch(`${ES_URL}/${INDEX_NAME}/_analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analyzer,
        text: testText,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      const tokens = result.tokens?.map((t: { token: string }) => t.token).join(', ');
      console.log(`   Tokens: ${tokens}\n`);
    }
  }
}

async function main(): Promise<void> {
  console.log('🧪 Testing Elasticsearch Search Queries...\n');
  console.log(`📍 Elasticsearch URL: ${ES_URL}`);
  console.log(`📦 Index name: ${INDEX_NAME}\n`);

  try {
    // Check connection
    console.log('🔍 Checking connection...');
    const healthResponse = await fetch(`${ES_URL}/_cluster/health`);
    if (!healthResponse.ok) {
      throw new Error('Elasticsearch is not running');
    }
    console.log('✅ Connected\n');

    // Check index
    const indexResponse = await fetch(`${ES_URL}/${INDEX_NAME}`);
    if (!indexResponse.ok) {
      throw new Error(`Index '${INDEX_NAME}' does not exist. Run index-ayahs.ts first.`);
    }

    // Get document count
    const countResponse = await fetch(`${ES_URL}/${INDEX_NAME}/_count`);
    const countResult = await countResponse.json();
    console.log(`📊 Index contains ${countResult.count} documents\n`);

    // Test analyzers
    await testAnalyzers();

    // Test various searches
    console.log('\n' + '='.repeat(60));
    console.log('SEARCH TESTS');
    console.log('='.repeat(60));

    // Test 1: Simple Arabic search
    await testSearch('الله');

    // Test 2: Search with diacritics
    await testSearch('بِسْمِ');

    // Test 3: Normalized search (without diacritics)
    await testSearch('بسم');

    // Test 4: Synonym search (رحمن should match رحيم)
    await testSearch('الرحمن');

    // Test 5: Fuzzy search
    await testSearch('اللمه', { fuzzy: true });

    // Test 6: Filter by surah
    await testSearch('الله', { surahId: 1 });

    // Test 7: Multiple words
    await testSearch('الحمد لله');

    // Test autocomplete
    console.log('\n' + '='.repeat(60));
    console.log('AUTOCOMPLETE TESTS');
    console.log('='.repeat(60));

    await testAutocomplete('بسم');
    await testAutocomplete('الحمد');
    await testAutocomplete('قل هو');

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('\n❌ Error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
main();
