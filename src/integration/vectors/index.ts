import { loadEnv } from "@config/env.js";
import { OllamaEmbeddings } from "@langchain/ollama";
import { supabaseClient } from "../database/index.js";

let embeddingsInstance: OllamaEmbeddings | null = null;

export function getEmbeddingsInstance(): OllamaEmbeddings {
  if (!embeddingsInstance) {
    const env = loadEnv();
    const model = env.OLLAMA_EMBED_MODEL;
    const baseUrl = env.OLLAMA_LOCAL ? env.OLLAMA_HOST_LOCAL : env.OLLAMA_HOST;

    embeddingsInstance = new OllamaEmbeddings({
      model,
      baseUrl,
    });
  }
  return embeddingsInstance;
}

export const vectorEmbeddings = {
  get instance() {
    return getEmbeddingsInstance();
  },
};

export interface VectorDocument {
  content: string;
  metadata: Record<string, any>;
  embedding: number[];
}

export class SupabaseVectorDB {
  private get supabase() {
    return supabaseClient.instance;
  }

  constructor(
    private tableName = "documents",
    private queryName = "match_documents",
  ) {}

  async insert(documents: VectorDocument[]) {
    const { error } = await this.supabase.from(this.tableName).insert(
      documents.map((doc) => ({
        content: doc.content,
        metadata: doc.metadata,
        embedding: doc.embedding,
      })),
    );
    if (error) throw error;
  }

  async insertTexts(texts: string[], metadatas?: Record<string, any>[]) {
    const embeddings = await vectorEmbeddings.instance.embedDocuments(texts);
    const documents: VectorDocument[] = [];

    for (let i = 0; i < texts.length; i++) {
      const content = texts[i];
      const embedding = embeddings[i];
      if (content !== undefined && embedding !== undefined) {
        documents.push({
          content,
          metadata: metadatas?.[i] || {},
          embedding,
        });
      }
    }
    await this.insert(documents);
  }

  async similaritySearch(queryEmbedding: number[], matchCount = 5, similarityThreshold = 0.7) {
    const { data, error } = await this.supabase.rpc(this.queryName, {
      query_embedding: queryEmbedding,
      match_threshold: similarityThreshold,
      match_count: matchCount,
    });
    if (error) throw error;
    return data;
  }

  async searchByText(queryText: string, matchCount = 5, similarityThreshold = 0.7) {
    const queryEmbedding = await vectorEmbeddings.instance.embedQuery(queryText);
    return this.similaritySearch(queryEmbedding, matchCount, similarityThreshold);
  }
}
