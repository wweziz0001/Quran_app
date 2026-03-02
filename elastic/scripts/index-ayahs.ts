#!/usr/bin/env bun

/**
 * Index All Quran Ayahs
 * 
 * This script indexes all ayahs from the database into Elasticsearch.
 * Run with: bun run elastic/scripts/index-ayahs.ts
 */

import fs from 'fs';
import path from 'path';

const ES_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const INDEX_NAME = 'quran_ayahs';
const BATCH_SIZE = 100;

// Database path
const DB_PATH = path.join(__dirname, '../../../db/custom.db');

interface Ayah {
  id: number;
  surahId: number;
  ayahNumber: number;
  ayahNumberGlobal: number;
  textArabic: string;
  textUthmani: string | null;
  textIndopak: string | null;
  pageNumber: number | null;
  juzNumber: number | null;
  hizbNumber: number | null;
  rubNumber: number | null;
  sajdah: boolean;
}

interface Surah {
  id: number;
  number: number;
  nameArabic: string;
  nameEnglish: string;
}

interface WordAnalysis {
  ayahId: number;
  word: string;
  root: string | null;
}

// Simple Arabic normalizer for text processing
function normalizeArabic(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // Remove diacritics
  const diacritics = ['َ', 'ُ', 'ِ', 'ً', 'ٌ', 'ٍ', 'ّ', 'ْ', 'ٰ', 'ۡ'];
  for (const d of diacritics) {
    result = result.split(d).join('');
  }
  
  // Normalize letters
  const normalizations: Record<string, string> = {
    'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
    'ى': 'ي', 'ة': 'ه',
  };
  
  for (const [from, to] of Object.entries(normalizations)) {
    result = result.split(from).join(to);
  }
  
  return result;
}

async function indexAyahs(): Promise<void> {
  console.log('📚 Indexing Quran Ayahs into Elasticsearch...\n');
  console.log(`📍 Elasticsearch URL: ${ES_URL}`);
  console.log(`📦 Index name: ${INDEX_NAME}`);
  console.log(`📊 Batch size: ${BATCH_SIZE}\n`);

  try {
    // Check Elasticsearch
    console.log('🔍 Checking Elasticsearch...');
    const healthResponse = await fetch(`${ES_URL}/_cluster/health`);
    if (!healthResponse.ok) {
      throw new Error('Elasticsearch is not running');
    }
    console.log('✅ Elasticsearch is running\n');

    // Check if index exists
    const indexResponse = await fetch(`${ES_URL}/${INDEX_NAME}`);
    if (!indexResponse.ok) {
      throw new Error(`Index '${INDEX_NAME}' does not exist. Run create-index.ts first.`);
    }
    console.log('✅ Index exists\n');

    // Load ayahs from database (using Prisma)
    console.log('📖 Loading ayahs from database...');
    
    // Import Prisma client
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Get all ayahs
    const ayahs = await prisma.ayah.findMany({
      orderBy: [{ surahId: 'asc' }, { ayahNumber: 'asc' }],
      include: {
        Surah: {
          select: {
            id: true,
            number: true,
            nameArabic: true,
            nameEnglish: true,
          },
        },
      },
    });
    
    console.log(`✅ Found ${ayahs.length} ayahs\n`);

    // Get word analyses for roots
    console.log('🔍 Loading word analyses...');
    const wordAnalyses = await prisma.wordAnalysis.findMany({
      select: {
        ayahId: true,
        word: true,
        root: true,
      },
    });
    
    // Group by ayahId
    const wordsByAyah = new Map<number, { words: string[]; roots: string[] }>();
    for (const wa of wordAnalyses) {
      if (!wordsByAyah.has(wa.ayahId)) {
        wordsByAyah.set(wa.ayahId, { words: [], roots: [] });
      }
      const entry = wordsByAyah.get(wa.ayahId)!;
      entry.words.push(wa.word);
      if (wa.root) {
        entry.roots.push(wa.root);
      }
    }
    console.log(`✅ Loaded word analyses\n`);

    // Index in batches
    console.log('🔨 Indexing ayahs...');
    let indexed = 0;
    const total = ayahs.length;
    
    for (let i = 0; i < ayahs.length; i += BATCH_SIZE) {
      const batch = ayahs.slice(i, i + BATCH_SIZE);
      
      // Build bulk request body
      const body: string[] = [];
      
      for (const ayah of batch) {
        const wordData = wordsByAyah.get(ayah.id) || { words: [], roots: [] };
        
        // Index action
        body.push(JSON.stringify({
          index: {
            _index: INDEX_NAME,
            _id: ayah.id.toString(),
          },
        }));
        
        // Document
        body.push(JSON.stringify({
          id: ayah.id,
          surahId: ayah.surahId,
          surahNumber: ayah.Surah?.number,
          surahName: ayah.Surah?.nameEnglish,
          surahNameArabic: ayah.Surah?.nameArabic,
          ayahNumber: ayah.ayahNumber,
          ayahNumberGlobal: ayah.ayahNumberGlobal,
          textArabic: ayah.textArabic,
          textUthmani: ayah.textUthmani,
          textIndopak: ayah.textIndopak,
          pageNumber: ayah.pageNumber,
          juzNumber: ayah.juzNumber,
          hizbNumber: ayah.hizbNumber,
          sajdah: ayah.sajdah,
          words: wordData.words.join(' '),
          roots: [...new Set(wordData.roots)],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
      
      // Send bulk request
      const bulkResponse = await fetch(`${ES_URL}/_bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-ndjson',
        },
        body: body.join('\n') + '\n',
      });
      
      if (!bulkResponse.ok) {
        const error = await bulkResponse.text();
        throw new Error(`Bulk indexing failed: ${error}`);
      }
      
      indexed += batch.length;
      const progress = Math.round((indexed / total) * 100);
      process.stdout.write(`\r📊 Progress: ${indexed}/${total} (${progress}%)`);
    }
    
    console.log('\n\n🔄 Refreshing index...');
    await fetch(`${ES_URL}/${INDEX_NAME}/_refresh`, { method: 'POST' });
    
    // Verify count
    const countResponse = await fetch(`${ES_URL}/${INDEX_NAME}/_count`);
    const count = await countResponse.json();
    console.log(`✅ Indexed ${count.count} documents\n`);

    await prisma.$disconnect();
    
    console.log('🎉 Indexing completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   - Test search: bun run elastic/scripts/test-search.ts');
    console.log('   - Open Kibana: http://localhost:5601');

  } catch (error) {
    console.error('\n❌ Error indexing ayahs:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
indexAyahs();
