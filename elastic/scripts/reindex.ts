#!/usr/bin/env bun

/**
 * Reindex Quran Data
 * 
 * This script reindexes all data (useful after settings changes).
 * Run with: bun run elastic/scripts/reindex.ts
 */

const ES_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const OLD_INDEX = process.env.OLD_INDEX || 'quran_ayahs_old';
const NEW_INDEX = process.env.NEW_INDEX || 'quran_ayahs';

async function reindex(): Promise<void> {
  console.log('🔄 Reindexing Quran data...\n');
  console.log(`📍 Elasticsearch URL: ${ES_URL}`);
  console.log(`📦 Source index: ${OLD_INDEX}`);
  console.log(`📦 Target index: ${NEW_INDEX}\n`);

  try {
    // Check if old index exists
    console.log('🔍 Checking source index...');
    const oldIndexResponse = await fetch(`${ES_URL}/${OLD_INDEX}`);
    if (!oldIndexResponse.ok) {
      throw new Error(`Source index '${OLD_INDEX}' does not exist`);
    }
    console.log('✅ Source index exists\n');

    // Check if new index exists
    console.log('🔍 Checking target index...');
    const newIndexResponse = await fetch(`${ES_URL}/${NEW_INDEX}`);
    if (!newIndexResponse.ok) {
      throw new Error(`Target index '${NEW_INDEX}' does not exist. Create it first.`);
    }
    console.log('✅ Target index exists\n');

    // Start reindex
    console.log('🚀 Starting reindex operation...');
    const reindexResponse = await fetch(`${ES_URL}/_reindex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: {
          index: OLD_INDEX,
        },
        dest: {
          index: NEW_INDEX,
        },
      }),
    });

    if (!reindexResponse.ok) {
      const error = await reindexResponse.text();
      throw new Error(`Reindex failed: ${error}`);
    }

    const result = await reindexResponse.json();
    console.log(`✅ Reindexed ${result.total} documents`);
    console.log(`   - Took: ${result.took}ms`);
    console.log(`   - Created: ${result.created}`);
    console.log(`   - Updated: ${result.updated}`);
    console.log(`   - Deleted: ${result.deleted}\n`);

    console.log('🎉 Reindex completed successfully!');

  } catch (error) {
    console.error('\n❌ Error reindexing:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
reindex();
