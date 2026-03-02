#!/usr/bin/env bun
/**
 * Benchmark Semantic Search
 * 
 * Benchmark the performance of semantic search.
 * Run with: bun run scripts/benchmark-search.ts
 */

import '../src/lib/db';
import { semanticSearch, hybridSearch } from '../src/services/ai/semantic-search';

interface BenchmarkResult {
  query: string;
  type: string;
  resultsCount: number;
  timeMs: number;
}

async function benchmarkSearch(
  query: string,
  type: 'semantic' | 'hybrid' = 'semantic'
): Promise<BenchmarkResult> {
  const startTime = Date.now();
  
  let results;
  if (type === 'hybrid') {
    results = await hybridSearch(query, { limit: 10 });
  } else {
    results = await semanticSearch(query, { limit: 10 });
  }
  
  const timeMs = Date.now() - startTime;
  
  return {
    query,
    type,
    resultsCount: results.length,
    timeMs,
  };
}

async function main() {
  console.log('⏱️ Semantic Search Benchmark');
  console.log('============================\n');
  
  const testQueries = [
    'الله',
    'الرحمن',
    'الجنة',
    'النار',
    'الصلاة',
    'الصيام',
    'الحج',
    'الزكاة',
    'القيامة',
    'الرسول',
    'آية الكرسي',
    'يس والقرآن الحكيم',
  ];
  
  console.log('Running benchmarks...\n');
  
  const results: BenchmarkResult[] = [];
  
  // Run semantic search benchmarks
  for (const query of testQueries) {
    const result = await benchmarkSearch(query, 'semantic');
    results.push(result);
    console.log(`[${result.type.padEnd(8)}] "${query.padEnd(20)}" - ${result.resultsCount} results in ${result.timeMs}ms`);
  }
  
  console.log('\n--- Hybrid Search ---\n');
  
  // Run hybrid search benchmarks (subset)
  const hybridQueries = testQueries.slice(0, 5);
  for (const query of hybridQueries) {
    const result = await benchmarkSearch(query, 'hybrid');
    results.push(result);
    console.log(`[${result.type.padEnd(8)}] "${query.padEnd(20)}" - ${result.resultsCount} results in ${result.timeMs}ms`);
  }
  
  // Calculate statistics
  const semanticResults = results.filter(r => r.type === 'semantic');
  const hybridResults = results.filter(r => r.type === 'hybrid');
  
  const avgSemanticTime = semanticResults.reduce((sum, r) => sum + r.timeMs, 0) / semanticResults.length;
  const avgHybridTime = hybridResults.reduce((sum, r) => sum + r.timeMs, 0) / hybridResults.length;
  
  const minTime = Math.min(...results.map(r => r.timeMs));
  const maxTime = Math.max(...results.map(r => r.timeMs));
  
  // Summary
  console.log('\n============================');
  console.log('📊 Benchmark Summary');
  console.log('============================');
  console.log(`Total Queries: ${results.length}`);
  console.log(`Semantic Search Queries: ${semanticResults.length}`);
  console.log(`Hybrid Search Queries: ${hybridResults.length}`);
  console.log('\n⏱️ Timing:');
  console.log(`   - Min: ${minTime}ms`);
  console.log(`   - Max: ${maxTime}ms`);
  console.log(`   - Avg (Semantic): ${avgSemanticTime.toFixed(0)}ms`);
  console.log(`   - Avg (Hybrid): ${avgHybridTime.toFixed(0)}ms`);
  
  console.log('\n📈 Results:');
  const avgResults = results.reduce((sum, r) => sum + r.resultsCount, 0) / results.length;
  console.log(`   - Avg Results per Query: ${avgResults.toFixed(1)}`);
  
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});
