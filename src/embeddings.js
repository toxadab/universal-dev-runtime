/**
 * Embeddings Module for Universal Dev Runtime 2.0
 *
 * Uses @xenova/transformers.js for local embedding generation
 * Model: all-MiniLM-L6-v2 (384 dimensions, sentence embeddings)
 *
 * Features:
 * - Local embedding generation (no API required)
 * - Caching for performance
 * - Batch processing support
 */

import { pipeline } from '@xenova/transformers';

// ============================================================================
// Configuration
// ============================================================================

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_SIZE = 384;
const CACHE_ENABLED = true;
const CACHE_TTL = 3600000; // 1 hour in ms

// ============================================================================
// Embedding Pipeline
// ============================================================================

class EmbeddingPipeline {
  constructor() {
    this.pipe = null;
    this.initialized = false;
    this.cache = new Map();
    this.initializing = false;
  }

  /**
   * Initialize the embedding pipeline
   * Downloads and loads the model on first call
   */
  async initialize() {
    if (this.initialized) return true;
    if (this.initializing) {
      // Wait for ongoing initialization
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return true;
    }

    this.initializing = true;

    try {
      console.log('[Embeddings] Loading model:', MODEL_NAME);
      this.pipe = await pipeline('feature-extraction', MODEL_NAME, {
        quantized: true, // Use quantized model for faster loading
        progress_callback: (progress) => {
          if (progress.status === 'progress' && progress.progress <= 1.0) {
            const percent = Math.round(progress.progress * 100);
            console.log(`[Embeddings] Loading: ${percent}%`);
          }
        },
      });
      this.initialized = true;
      console.log('[Embeddings] Model loaded successfully');
      return true;
    } catch (error) {
      console.error('[Embeddings] Failed to load model:', error.message);
      this.initializing = false;
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - Input text
   * @returns {Promise<number[]>} - Embedding vector
   */
  async embed(text) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check cache
    const cacheKey = this.getCacheKey(text);
    if (CACHE_ENABLED && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.embedding;
      }
      this.cache.delete(cacheKey);
    }

    // Generate embedding
    const output = await this.pipe(text, {
      pooling: 'mean',
      normalize: true,
    });

    const embedding = Array.from(output.data);

    // Cache result
    if (CACHE_ENABLED) {
      this.cache.set(cacheKey, {
        embedding,
        timestamp: Date.now(),
      });

      // Limit cache size
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   * @param {string[]} texts - Array of input texts
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async embedBatch(texts) {
    if (!this.initialized) {
      await this.initialize();
    }

    const results = [];
    const uncachedTexts = [];
    const uncachedIndices = [];

    // Check cache for each text
    texts.forEach((text, index) => {
      const cacheKey = this.getCacheKey(text);
      if (CACHE_ENABLED && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          results[index] = cached.embedding;
          return;
        }
      }
      uncachedTexts.push(text);
      uncachedIndices.push(index);
    });

    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      const outputs = await this.pipe(uncachedTexts, {
        pooling: 'mean',
        normalize: true,
      });

      // Process batch results
      for (let i = 0; i < uncachedTexts.length; i++) {
        const embedding = Array.from(outputs[i].data);
        const originalIndex = uncachedIndices[i];
        results[originalIndex] = embedding;

        // Cache result
        if (CACHE_ENABLED) {
          const cacheKey = this.getCacheKey(uncachedTexts[i]);
          this.cache.set(cacheKey, {
            embedding,
            timestamp: Date.now(),
          });
        }
      }
    }

    return results;
  }

  /**
   * Generate cache key from text
   */
  getCacheKey(text) {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `emb_${hash}`;
  }

  /**
   * Clear the embedding cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: 1000,
    };
  }
}

// ============================================================================
// Similarity Functions
// ============================================================================

/**
 * Compute cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} - Cosine similarity (-1 to 1)
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find most similar vector from a list
 * @param {number[]} queryVec - Query vector
 * @param {Array<{id: string, vector: number[]}>} candidates - Candidate vectors
 * @returns {{id: string, score: number}} - Best match
 */
function findMostSimilar(queryVec, candidates) {
  let bestMatch = null;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const score = cosineSimilarity(queryVec, candidate.vector);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { id: candidate.id, score };
    }
  }

  return bestMatch;
}

/**
 * Find all similar vectors above threshold
 * @param {number[]} queryVec - Query vector
 * @param {Array<{id: string, vector: number[]}>} candidates - Candidate vectors
 * @param {number} threshold - Similarity threshold
 * @returns {Array<{id: string, score: number}>} - Similar matches
 */
function findAllSimilar(queryVec, candidates, threshold = 0.7) {
  const results = [];

  for (const candidate of candidates) {
    const score = cosineSimilarity(queryVec, candidate.vector);
    if (score >= threshold) {
      results.push({ id: candidate.id, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

// ============================================================================
// Singleton Instance
// ============================================================================

const embeddingPipeline = new EmbeddingPipeline();

/**
 * Get the singleton embedding pipeline instance
 */
function getEmbeddingPipeline() {
  return embeddingPipeline;
}

// ============================================================================
// Exports
// ============================================================================

export {
  EmbeddingPipeline,
  getEmbeddingPipeline,
  cosineSimilarity,
  findMostSimilar,
  findAllSimilar,
  EMBEDDING_SIZE,
};
