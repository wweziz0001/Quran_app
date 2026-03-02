/**
 * Tafsir AI Service
 * 
 * Provides AI-powered tafsir explanations and analysis.
 * Enhances traditional tafsir with modern AI capabilities.
 * 
 * @module tafsir-ai
 */

import { db } from '@quran/shared/db';
import { chatCompletion, generateTafsirExplanation } from '../lib/z-ai-client';
import { semanticSearch } from './semantic-search';

// Types
export interface TafsirExplanation {
  ayahId: number;
  ayahText: string;
  surahName: string;
  ayahNumber: number;
  explanation: string;
  keyPoints: string[];
  vocabulary: Array<{
    word: string;
    meaning: string;
    root?: string;
  }>;
  relatedThemes: string[];
  historicalContext?: string;
  practicalApplications: string[];
}

export interface TafsirComparison {
  ayahId: number;
  sources: Array<{
    name: string;
    text: string;
    keyPoints: string[];
  }>;
  consensus: string[];
  differences: string[];
  aiAnalysis: string;
}

export interface ThematicAnalysis {
  theme: string;
  ayahs: Array<{
    ayahId: number;
    reference: string;
    text: string;
    relevance: number;
  }>;
  overview: string;
  keyPoints: string[];
}

/**
 * Generate comprehensive tafsir explanation
 * 
 * @param ayahId - The ayah to explain
 * @param options - Explanation options
 * @returns Detailed tafsir explanation
 */
export async function generateComprehensiveTafsir(
  ayahId: number,
  options: {
    language?: 'ar' | 'en';
    includeVocabulary?: boolean;
    includeHistory?: boolean;
    includeApplications?: boolean;
  } = {}
): Promise<TafsirExplanation> {
  const { 
    language = 'ar', 
    includeVocabulary = true,
    includeHistory = true,
    includeApplications = true,
  } = options;
  
  // Get ayah with all related data
  const ayah = await db.ayah.findUnique({
    where: { id: ayahId },
    include: {
      Surah: true,
      TafsirEntry: {
        include: { TafsirSource: true },
        take: 5,
      },
      WordAnalysis: {
        take: 20,
        select: { word: true, root: true, meaning: true },
      },
    },
  });
  
  if (!ayah) {
    throw new Error(`Ayah ${ayahId} not found`);
  }
  
  // Get existing tafsirs
  const existingTafsirs = ayah.TafsirEntry.map(t => ({
    source: t.TafsirSource?.nameArabic || t.TafsirSource?.nameEnglish || 'مجهول',
    text: t.textArabic || '',
  }));
  
  // Generate AI explanation
  const { explanation, keyPoints } = await generateTafsirExplanation(
    ayah.textArabic,
    ayah.Surah?.nameArabic || '',
    ayah.ayahNumber,
    existingTafsirs
  );
  
  // Build vocabulary if requested
  let vocabulary: Array<{ word: string; meaning: string; root?: string }> = [];
  
  if (includeVocabulary && ayah.WordAnalysis.length > 0) {
    vocabulary = ayah.WordAnalysis.map(w => ({
      word: w.word,
      meaning: w.meaning || '',
      root: w.root || undefined,
    }));
    
    // If no meanings available, use AI to generate
    if (vocabulary.some(v => !v.meaning)) {
      const vocabPrompt = `أعط معاني الكلمات التالية من الآية "${ayah.textArabic}":
${vocabulary.filter(v => !v.meaning).map(v => v.word).join('، ')}

قدم المعاني بشكل مختصر، كل كلمة ومعناها في سطر.`;
      
      const vocabResponse = await chatCompletion({
        messages: [{ role: 'user', content: vocabPrompt }],
        temperature: 0.3,
      });
      
      // Parse vocabulary meanings
      const lines = vocabResponse.content.split('\n');
      lines.forEach(line => {
        const match = line.match(/^(.+?):\s*(.+)$/);
        if (match) {
          const word = match[1].trim();
          const meaning = match[2].trim();
          const vocab = vocabulary.find(v => v.word === word && !v.meaning);
          if (vocab) {
            vocab.meaning = meaning;
          }
        }
      });
    }
  }
  
  // Generate historical context if requested
  let historicalContext: string | undefined;
  
  if (includeHistory) {
    const historyPrompt = `ما سبب نزول هذه الآية؟ وهل هناك أحداث تاريخية مرتبطة بها؟
الآية: ${ayah.textArabic}
السورة: ${ayah.Surah?.nameArabic}

قدم الإجابة بشكل مختصر في 2-3 جمل.`;
    
    const historyResponse = await chatCompletion({
      messages: [{ role: 'user', content: historyPrompt }],
      temperature: 0.4,
    });
    
    historicalContext = historyResponse.content;
  }
  
  // Generate practical applications if requested
  let practicalApplications: string[] = [];
  
  if (includeApplications) {
    const appsPrompt = `كيف يمكن تطبيق هذه الآية في حياة المسلم المعاصر؟
الآية: ${ayah.textArabic}

قدم 3 تطبيقات عملية مختصرة.`;
    
    const appsResponse = await chatCompletion({
      messages: [{ role: 'user', content: appsPrompt }],
      temperature: 0.5,
    });
    
    practicalApplications = appsResponse.content
      .split('\n')
      .filter(line => line.trim().match(/^[-•*\d.]\s/))
      .map(line => line.replace(/^[-•*\d.]\s*/, '').trim())
      .slice(0, 5);
  }
  
  // Extract related themes
  const themesPrompt = `ما هي الموضوعات الرئيسية في هذه الآية؟ اذكر 3-5 كلمات مفتاحية فقط:
${ayah.textArabic}`;
  
  const themesResponse = await chatCompletion({
    messages: [{ role: 'user', content: themesPrompt }],
    temperature: 0.3,
  });
  
  const relatedThemes = themesResponse.content
    .split(/[،,\n]/)
    .map(word => word.trim())
    .filter(word => word.length > 0)
    .slice(0, 5);
  
  return {
    ayahId,
    ayahText: ayah.textArabic,
    surahName: ayah.Surah?.nameArabic || '',
    ayahNumber: ayah.ayahNumber,
    explanation,
    keyPoints,
    vocabulary,
    relatedThemes,
    historicalContext,
    practicalApplications,
  };
}

/**
 * Compare tafsir from different sources
 * 
 * @param ayahId - The ayah to analyze
 * @returns Comparative analysis
 */
export async function compareTafsirSources(
  ayahId: number
): Promise<TafsirComparison> {
  // Get all tafsir entries
  const tafsirEntries = await db.tafsirEntry.findMany({
    where: { ayahId },
    include: { TafsirSource: true },
  });
  
  if (tafsirEntries.length === 0) {
    throw new Error('No tafsir entries found for this ayah');
  }
  
  // Extract key points from each tafsir
  const sources = await Promise.all(
    tafsirEntries.map(async (entry) => {
      const keyPointsPrompt = `استخرج 3 نقاط رئيسية من هذا التفسير:
${entry.textArabic}

قدم النقاط كقائمة مختصرة.`;
      
      const keyPointsResponse = await chatCompletion({
        messages: [{ role: 'user', content: keyPointsPrompt }],
        temperature: 0.3,
      });
      
      const keyPoints = keyPointsResponse.content
        .split('\n')
        .filter(line => line.trim().match(/^[-•*\d.]\s/))
        .map(line => line.replace(/^[-•*\d.]\s*/, '').trim())
        .slice(0, 5);
      
      return {
        name: entry.TafsirSource?.nameArabic || entry.TafsirSource?.nameEnglish || 'مجهول',
        text: entry.textArabic || '',
        keyPoints,
      };
    })
  );
  
  // Generate comparison analysis
  const comparisonPrompt = `قارن بين التفاسير التالية للآية:
${sources.map(s => `${s.name}:\n${s.text.substring(0, 500)}...`).join('\n\n')}

1. ما النقاط المتفق عليها؟
2. ما الفروقات بين التفاسير؟`;
  
  const comparisonResponse = await chatCompletion({
    messages: [{ role: 'user', content: comparisonPrompt }],
    temperature: 0.4,
  });
  
  // Parse consensus and differences
  const lines = comparisonResponse.content.split('\n');
  const consensus: string[] = [];
  const differences: string[] = [];
  
  let currentSection = '';
  lines.forEach(line => {
    if (line.includes('المتفق عليه') || line.includes('النقاط المشتركة')) {
      currentSection = 'consensus';
    } else if (line.includes('الفروق') || line.includes('الاختلافات')) {
      currentSection = 'differences';
    } else if (line.trim().match(/^[-•*\d.]\s/)) {
      const point = line.replace(/^[-•*\d.]\s*/, '').trim();
      if (currentSection === 'consensus') {
        consensus.push(point);
      } else if (currentSection === 'differences') {
        differences.push(point);
      }
    }
  });
  
  return {
    ayahId,
    sources,
    consensus,
    differences,
    aiAnalysis: comparisonResponse.content,
  };
}

/**
 * Analyze a theme across multiple ayahs
 * 
 * @param theme - Theme to analyze
 * @param options - Analysis options
 * @returns Thematic analysis
 */
export async function analyzeTheme(
  theme: string,
  options: { limit?: number } = {}
): Promise<ThematicAnalysis> {
  const { limit = 10 } = options;
  
  // Find relevant ayahs
  const ayahs = await semanticSearch(`آيات عن ${theme}`, { limit });
  
  if (ayahs.length === 0) {
    throw new Error(`No ayahs found for theme: ${theme}`);
  }
  
  // Generate overview
  const overviewPrompt = `قدم ملخصاً شاملاً عن موضوع "${theme}" في القرآن الكريم.
استند على الآيات التالية:
${ayahs.slice(0, 5).map(a => a.textArabic).join('\n')}

قدم الملخص في 3-5 جمل.`;
  
  const overviewResponse = await chatCompletion({
    messages: [{ role: 'user', content: overviewPrompt }],
    temperature: 0.5,
  });
  
  // Extract key points
  const keyPointsPrompt = `ما أهم النقاط حول موضوع "${theme}" في القرآن؟
قدم 5 نقاط رئيسية.`;
  
  const keyPointsResponse = await chatCompletion({
    messages: [{ role: 'user', content: keyPointsPrompt }],
    temperature: 0.4,
  });
  
  const keyPoints = keyPointsResponse.content
    .split('\n')
    .filter(line => line.trim().match(/^[-•*\d.]\s/))
    .map(line => line.replace(/^[-•*\d.]\s*/, '').trim())
    .slice(0, 5);
  
  return {
    theme,
    ayahs: ayahs.map(a => ({
      ayahId: a.ayahId,
      reference: `${a.surahName} (${a.surahId}:${a.ayahNumber})`,
      text: a.textArabic,
      relevance: a.similarity,
    })),
    overview: overviewResponse.content,
    keyPoints,
  };
}

/**
 * Get daily tafsir recommendation
 */
export async function getDailyTafsir(): Promise<{
  ayahId: number;
  surahName: string;
  ayahNumber: number;
  text: string;
  briefExplanation: string;
  reflection: string;
}> {
  // Get a random meaningful ayah
  const count = await db.ayah.count();
  const randomId = Math.floor(Math.random() * count) + 1;
  
  const ayah = await db.ayah.findUnique({
    where: { id: randomId },
    include: { Surah: true },
  });
  
  if (!ayah) {
    throw new Error('Failed to get daily tafsir');
  }
  
  // Generate brief explanation and reflection
  const reflectionPrompt = `قدم تأملاً قصيراً ومؤثراً لهذه الآية:
${ayah.textArabic}

التفكير اليومي، وليس شرحاً علمياً. اجعله ملهمة وقصيرة (2-3 جمل).`;
  
  const reflectionResponse = await chatCompletion({
    messages: [{ role: 'user', content: reflectionPrompt }],
    temperature: 0.6,
  });
  
  const explanationPrompt = `قدم شرحاً مختصراً لهذه الآية (جملة واحدة):
${ayah.textArabic}`;
  
  const explanationResponse = await chatCompletion({
    messages: [{ role: 'user', content: explanationPrompt }],
    temperature: 0.4,
  });
  
  return {
    ayahId: ayah.id,
    surahName: ayah.Surah?.nameArabic || '',
    ayahNumber: ayah.ayahNumber,
    text: ayah.textArabic,
    briefExplanation: explanationResponse.content,
    reflection: reflectionResponse.content,
  };
}

// Export all functions
export default {
  generateComprehensiveTafsir,
  compareTafsirSources,
  analyzeTheme,
  getDailyTafsir,
};
