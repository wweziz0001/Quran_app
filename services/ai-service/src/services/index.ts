/**
 * AI Services Index
 * 
 * Main entry point for AI-powered services.
 * Exports all AI-related services and utilities.
 * 
 * @module ai
 */

// Core services
export { generateEmbedding, chatCompletion, answerQuranQuestion } from '../lib/z-ai-client';
export type { ChatMessage, ChatCompletionResponse, EmbeddingResponse } from '../lib/z-ai-client';

// Embeddings
export {
  getAyahEmbedding,
  generateAyahEmbeddings,
  generateAllEmbeddings,
  cosineSimilarity,
  findSimilarAyahs,
  getEmbeddingStats,
} from './embeddings';

// Semantic Search
export {
  semanticSearch,
  hybridSearch,
  findRelatedAyahs,
  searchByTheme,
} from './semantic-search';
export type { SemanticSearchResult, HybridSearchResult } from './semantic-search';

// Question Answering
export {
  answerQuestion,
  explainAyah,
  compareAyahs,
  getContextualAnswer,
} from './question-answering';
export type { QAResult, ExplanationResult } from './question-answering';

// Tafsir AI
export {
  generateComprehensiveTafsir,
  compareTafsirSources,
  analyzeTheme,
  getDailyTafsir,
} from './tafsir-ai';
export type { TafsirExplanation, TafsirComparison, ThematicAnalysis } from './tafsir-ai';

// Recommendations
export {
  getRecommendations,
  getSequentialRecommendations,
  getPersonalizedRecommendations,
} from './recommendations';
export type { Recommendation, RecommendationContext } from './recommendations';

// Re-export types
export type { SimilarAyah } from './embeddings';
