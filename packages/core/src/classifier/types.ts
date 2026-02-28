import type { Bookmark } from "../fetcher/types.js";

export interface ClassifiedBookmark {
  bookmark: Bookmark;
  category: string;
  subcategory?: string;
  tags: string[];
  summary: string;
}

export interface ClassificationResult {
  items: ClassifiedBookmark[];
  categories: string[];
}

export interface ClassifierOptions {
  /** Custom categories to use (otherwise AI decides) */
  categories?: string[];
  /** Language for classification output */
  language?: string;
  /** Max bookmarks per AI request batch */
  batchSize?: number;
}

export interface AIClassifier {
  classify(
    bookmarks: Bookmark[],
    options?: ClassifierOptions,
  ): Promise<ClassificationResult>;
}

export type AIProvider = "claude" | "openai" | "ollama";
