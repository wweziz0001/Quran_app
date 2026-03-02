#!/usr/bin/env bun
/**
 * Generate Embeddings for All Ayahs
 * 
 * This script generates embeddings for all ayahs in the database.
 * Run with: bun run scripts/generate-embeddings.ts
 */

import '../src/lib/db';
import { generateAllEmbeddings, getEmbeddingStats } from '../src/services/ai/embeddings';

async function main() {
  console.log('🚀 Starting Embedding Generation Script');
  console.log('========================================\n');
  
  // Show current stats
  const beforeStats = await getEmbeddingStats();
  console.log('📊 Current State:');
  console.log(`   - Total Ayahs: ${beforeStats.totalAyahs}`);
  console.log(`   - Already Indexed: ${beforeStats.indexedAyahs}`);
  console.log(`   - Pending: ${beforeStats.pendingAyahs}`);
  console.log(`   - Model: ${beforeStats.model}\n`);
  
  if (beforeStats.pendingAyahs === 0) {
    console.log('✅ All ayahs are already indexed!');
    process.exit(0);
  }
  
  // Generate embeddings
  console.log('⏳ Starting embedding generation...\n');
  
  const result = await generateAllEmbeddings();
  
  console.log('\n========================================');
  console.log('✅ Embedding Generation Complete!');
  console.log('========================================');
  console.log(`   - Total Ayahs: ${result.total}`);
  console.log(`   - Newly Processed: ${result.processed}`);
  console.log(`   - Previously Cached: ${result.cached}`);
  console.log(`   - Errors: ${result.errors}`);
  
  // Show final stats
  const afterStats = await getEmbeddingStats();
  console.log('\n📊 Final State:');
  console.log(`   - Indexed Ayahs: ${afterStats.indexedAyahs}`);
  console.log(`   - Coverage: ${((afterStats.indexedAyahs / afterStats.totalAyahs) * 100).toFixed(1)}%`);
  
  process.exit(result.errors > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
