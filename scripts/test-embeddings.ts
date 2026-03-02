#!/usr/bin/env bun
/**
 * Test Embeddings
 * 
 * Test embedding generation and similarity search.
 * Run with: bun run scripts/test-embeddings.ts
 */

import '../src/lib/db';
import { getAyahEmbedding, cosineSimilarity, findSimilarAyahs } from '../src/services/ai/embeddings';
import { generateEmbedding } from '../src/lib/z-ai-client';

async function main() {
  console.log('🧪 Testing Embeddings System');
  console.log('=============================\n');
  
  // Test 1: Generate embedding for a sample text
  console.log('Test 1: Generate Embedding for Text');
  console.log('-----------------------------------');
  
  const sampleText = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
  console.log(`Input: ${sampleText}`);
  
  const embedding = await generateEmbedding(sampleText);
  console.log(`Dimensions: ${embedding.dimensions}`);
  console.log(`Model: ${embedding.model}`);
  console.log(`Sample values: [${embedding.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
  console.log('✅ Embedding generated successfully\n');
  
  // Test 2: Get ayah embedding from database
  console.log('Test 2: Get Ayah Embedding');
  console.log('--------------------------');
  
  const ayahId = 1; // First ayah
  const ayahEmbedding = await getAyahEmbedding(ayahId);
  console.log(`Ayah ID: ${ayahEmbedding.ayahId}`);
  console.log(`Cached: ${ayahEmbedding.cached}`);
  console.log(`Dimensions: ${ayahEmbedding.embedding.length}`);
  console.log('✅ Ayah embedding retrieved\n');
  
  // Test 3: Cosine similarity
  console.log('Test 3: Cosine Similarity');
  console.log('-------------------------');
  
  const text1 = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
  const text2 = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ';
  const text3 = 'بسم الله الرحمن الرحيم'; // Same as text1 without diacritics
  
  const emb1 = await generateEmbedding(text1);
  const emb2 = await generateEmbedding(text2);
  const emb3 = await generateEmbedding(text3);
  
  const sim12 = cosineSimilarity(emb1.embedding, emb2.embedding);
  const sim13 = cosineSimilarity(emb1.embedding, emb3.embedding);
  
  console.log(`Text 1: ${text1}`);
  console.log(`Text 2: ${text2}`);
  console.log(`Text 3: ${text3}`);
  console.log(`\nSimilarity (1 vs 2): ${sim12.toFixed(4)}`);
  console.log(`Similarity (1 vs 3): ${sim13.toFixed(4)}`);
  console.log('✅ Similarity calculated\n');
  
  // Test 4: Find similar ayahs
  console.log('Test 4: Find Similar Ayahs');
  console.log('--------------------------');
  
  const queryEmbedding = await generateEmbedding('الله أكبر');
  const similar = await findSimilarAyahs(queryEmbedding.embedding, {
    limit: 5,
    threshold: 0.5,
  });
  
  console.log(`Query: الله أكبر`);
  console.log(`Found ${similar.length} similar ayahs:\n`);
  
  similar.forEach((ayah, index) => {
    console.log(`${index + 1}. Surah ${ayah.surahName} (${ayah.surahId}:${ayah.ayahNumber})`);
    console.log(`   Similarity: ${ayah.similarity.toFixed(4)}`);
    console.log(`   Text: ${ayah.textArabic.substring(0, 60)}...`);
  });
  
  console.log('\n✅ Similar ayahs found\n');
  
  // Summary
  console.log('=============================');
  console.log('✅ All Tests Passed!');
  console.log('=============================');
  
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
