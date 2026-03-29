/**
 * Qdrant Client for Universal Dev Runtime 2.0
 *
 * Manages vector storage and search across multiple collections:
 * - decisions: team decisions and architecture choices
 * - patterns: conventions, best practices, corrections
 * - artifacts: file paths, code context, dependencies
 * - tasks: current/past tasks with embeddings
 * - team: team members, roles, expertise
 */

import { QdrantClient } from '@qdrant/js-client-rest';

// ============================================================================
// Configuration
// ============================================================================

const COLLECTIONS = ['decisions', 'patterns', 'artifacts', 'tasks', 'team'];
const VECTOR_SIZE = 384; // all-MiniLM-L6-v2 embedding size
const DISTANCE = 'Cosine';

// ============================================================================
// Qdrant Client Manager
// ============================================================================

class QdrantManager {
  constructor(options = {}) {
    this.client = null;
    this.url = options.url || process.env.QDRANT_URL || 'http://localhost:6333';
    this.apiKey = options.apiKey || process.env.QDRANT_API_KEY || null;
    this.initialized = false;
    this.useLocal = options.useLocal !== false; // Default to local mode if Qdrant unavailable
  }

  async initialize() {
    if (this.initialized) return true;

    try {
      this.client = new QdrantClient({
        url: this.url,
        apiKey: this.apiKey,
      });

      // Test connection
      await this.client.getClusters();
      this.initialized = true;
      console.log('[Qdrant] Connected to', this.url);

      // Create collections if not exist
      for (const collection of COLLECTIONS) {
        await this.ensureCollection(collection);
      }

      return true;
    } catch (error) {
      console.warn('[Qdrant] Connection failed, falling back to local mode:', error.message);
      this.useLocal = true;
      this.initialized = true;
      return false;
    }
  }

  async ensureCollection(name) {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === name);

      if (!exists) {
        await this.client.createCollection(name, {
          vectors: {
            size: VECTOR_SIZE,
            distance: DISTANCE,
          },
        });

        // Create payload indexes for faster filtering
        await this.client.createPayloadIndex(name, {
          field_name: 'type',
          field_schema: 'keyword',
        });

        await this.client.createPayloadIndex(name, {
          field_name: 'projectId',
          field_schema: 'keyword',
        });

        console.log('[Qdrant] Created collection:', name);
      }
    } catch (error) {
      console.error(`[Qdrant] Error ensuring collection ${name}:`, error.message);
    }
  }

  isAvailable() {
    return this.initialized && !this.useLocal;
  }

  getClient() {
    return this.client;
  }

  getCollections() {
    return COLLECTIONS;
  }
}

// ============================================================================
// Document Operations
// ============================================================================

class QdrantDocumentStore {
  constructor(qdrantManager, projectId) {
    this.qdrant = qdrantManager;
    this.projectId = projectId;
  }

  /**
   * Upsert document with semantic replacement logic
   * - If similar document exists (similarity > threshold), update it
   * - Otherwise, create new document
   */
  async upsert(collection, document, embedding, options = {}) {
    const threshold = options.similarityThreshold || 0.85;

    // If Qdrant not available, use local fallback
    if (!this.qdrant.isAvailable()) {
      return this.upsertLocal(collection, document, options);
    }

    try {
      const client = this.qdrant.getClient();

      // Search for similar documents
      const searchResults = await client.search(collection, {
        vector: embedding,
        limit: 1,
        filter: {
          must: [
            { key: 'projectId', match: { value: this.projectId } },
          ],
        },
      });

      if (searchResults.length > 0 && searchResults[0].score >= threshold) {
        // Update existing document
        const existingId = searchResults[0].id;
        const existingPayload = searchResults[0].payload;

        // Merge metadata
        const updatedPayload = {
          ...existingPayload,
          ...document,
          updatedAt: new Date().toISOString(),
          version: (existingPayload.version || 1) + 1,
        };

        await client.upsert(collection, {
          points: [
            {
              id: existingId,
              vector: embedding,
              payload: updatedPayload,
            },
          ],
        });

        return {
          action: 'updated',
          id: existingId,
          previousVersion: existingPayload.version || 1,
        };
      }

      // Create new document
      const newId = document.id || `${collection}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newPayload = {
        ...document,
        projectId: this.projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      };

      await client.upsert(collection, {
        points: [
          {
            id: newId,
            vector: embedding,
            payload: newPayload,
          },
        ],
      });

      return {
        action: 'created',
        id: newId,
      };
    } catch (error) {
      console.error(`[Qdrant] Upsert error in ${collection}:`, error.message);
      throw error;
    }
  }

  /**
   * Search for documents with semantic similarity
   */
  async search(collection, queryEmbedding, options = {}) {
    const limit = options.limit || 10;
    const minScore = options.minScore || 0.0;
    const filter = options.filter || {};

    // If Qdrant not available, use local fallback
    if (!this.qdrant.isAvailable()) {
      return this.searchLocal(collection, options);
    }

    try {
      const client = this.qdrant.getClient();

      const payloadFilter = {
        must: [
          { key: 'projectId', match: { value: this.projectId } },
          ...Object.entries(filter).map(([key, value]) => ({
            key,
            match: { value },
          })),
        ],
      };

      const results = await client.search(collection, {
        vector: queryEmbedding,
        limit,
        filter: payloadFilter,
        score_threshold: minScore,
      });

      return results.map(r => ({
        id: r.id,
        score: r.score,
        payload: r.payload,
      }));
    } catch (error) {
      console.error(`[Qdrant] Search error in ${collection}:`, error.message);
      return [];
    }
  }

  /**
   * Get document by ID
   */
  async get(collection, id) {
    if (!this.qdrant.isAvailable()) {
      return this.getLocal(collection, id);
    }

    try {
      const client = this.qdrant.getClient();
      const points = await client.retrieve(collection, {
        ids: [id],
      });

      if (points.length === 0) return null;

      return {
        id: points[0].id,
        payload: points[0].payload,
      };
    } catch (error) {
      console.error(`[Qdrant] Get error in ${collection}:`, error.message);
      return null;
    }
  }

  /**
   * Delete document by ID
   */
  async delete(collection, id) {
    if (!this.qdrant.isAvailable()) {
      return this.deleteLocal(collection, id);
    }

    try {
      const client = this.qdrant.getClient();
      await client.delete(collection, {
        points: [id],
      });

      return { success: true, id };
    } catch (error) {
      console.error(`[Qdrant] Delete error in ${collection}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all documents in collection
   */
  async list(collection, filter = {}) {
    if (!this.qdrant.isAvailable()) {
      return this.listLocal(collection, filter);
    }

    try {
      const client = this.qdrant.getClient();

      const payloadFilter = {
        must: [
          { key: 'projectId', match: { value: this.projectId } },
          ...Object.entries(filter).map(([key, value]) => ({
            key,
            match: { value },
          })),
        ],
      };

      const results = await client.scroll(collection, {
        filter: payloadFilter,
        limit: 1000,
      });

      return results.points.map(p => ({
        id: p.id,
        payload: p.payload,
      }));
    } catch (error) {
      console.error(`[Qdrant] List error in ${collection}:`, error.message);
      return [];
    }
  }

  // ============================================================================
  // Local Fallback (when Qdrant is unavailable)
  // ============================================================================

  async upsertLocal(collection, document, options = {}) {
    // In local mode, just return the document with generated ID
    const id = document.id || `${collection}_${Date.now()}`;
    return {
      action: 'created',
      id,
      local: true,
    };
  }

  async searchLocal(collection, options = {}) {
    return [];
  }

  async getLocal(collection, id) {
    return null;
  }

  async deleteLocal(collection, id) {
    return { success: false, error: 'Local mode does not support delete' };
  }

  async listLocal(collection, filter = {}) {
    return [];
  }
}

// ============================================================================
// Exports
// ============================================================================

export { QdrantManager, QdrantDocumentStore, COLLECTIONS, VECTOR_SIZE };
