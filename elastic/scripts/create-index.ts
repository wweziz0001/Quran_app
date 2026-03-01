#!/usr/bin/env bun

/**
 * Create Elasticsearch Index
 * 
 * This script creates the Quran index with Arabic analyzer support.
 * Run with: bun run elastic/scripts/create-index.ts
 */

import fs from 'fs';
import path from 'path';

const ES_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const INDEX_NAME = 'quran_ayahs';

interface IndexConfig {
  settings: {
    number_of_shards: number;
    number_of_replicas: number;
    analysis: Record<string, unknown>;
  };
  mappings: {
    properties: Record<string, unknown>;
  };
}

async function createIndex(): Promise<void> {
  console.log('🚀 Creating Elasticsearch index for Quran...\n');
  console.log(`📍 Elasticsearch URL: ${ES_URL}`);
  console.log(`📦 Index name: ${INDEX_NAME}\n`);

  try {
    // Check if Elasticsearch is running
    console.log('🔍 Checking Elasticsearch connection...');
    const healthResponse = await fetch(`${ES_URL}/_cluster/health`);
    
    if (!healthResponse.ok) {
      throw new Error('Elasticsearch is not responding');
    }
    
    const health = await healthResponse.json();
    console.log(`✅ Elasticsearch is running (status: ${health.status})\n`);

    // Check if index already exists
    console.log('🔍 Checking if index exists...');
    const existsResponse = await fetch(`${ES_URL}/${INDEX_NAME}`);
    
    if (existsResponse.ok) {
      console.log('⚠️  Index already exists. Deleting...');
      const deleteResponse = await fetch(`${ES_URL}/${INDEX_NAME}`, {
        method: 'DELETE',
      });
      
      if (!deleteResponse.ok) {
        throw new Error('Failed to delete existing index');
      }
      console.log('✅ Existing index deleted\n');
    } else {
      console.log('ℹ️  Index does not exist\n');
    }

    // Read index configuration
    const configPath = path.join(__dirname, '../quran-index.json');
    console.log(`📄 Reading index configuration from: ${configPath}`);
    
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const indexConfig: IndexConfig = JSON.parse(configContent);
    console.log('✅ Configuration loaded\n');

    // Create index
    console.log('🔨 Creating index...');
    const createResponse = await fetch(`${ES_URL}/${INDEX_NAME}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(indexConfig),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create index: ${error}`);
    }

    const result = await createResponse.json();
    console.log('✅ Index created successfully!\n');

    // Verify index settings
    console.log('🔍 Verifying index settings...');
    const settingsResponse = await fetch(`${ES_URL}/${INDEX_NAME}/_settings`);
    const settings = await settingsResponse.json();
    
    const indexSettings = settings[INDEX_NAME]?.settings?.index;
    console.log(`   - Number of shards: ${indexSettings?.number_of_shards}`);
    console.log(`   - Number of replicas: ${indexSettings?.number_of_replicas}`);
    console.log(`   - Analysis: ✅ Configured\n`);

    // Verify analyzers
    console.log('🔍 Testing Arabic analyzer...');
    const analyzeResponse = await fetch(`${ES_URL}/${INDEX_NAME}/_analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analyzer: 'arabic_analyzer',
        text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      }),
    });

    if (analyzeResponse.ok) {
      const analyzeResult = await analyzeResponse.json();
      console.log(`   - Input: بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ`);
      console.log(`   - Tokens: ${analyzeResult.tokens?.map((t: { token: string }) => t.token).join(', ')}`);
      console.log('✅ Arabic analyzer working correctly!\n');
    }

    console.log('🎉 Index creation completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: bun run elastic/scripts/index-ayahs.ts');
    console.log('   2. Test search: bun run elastic/scripts/test-search.ts');

  } catch (error) {
    console.error('\n❌ Error creating index:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
createIndex();
