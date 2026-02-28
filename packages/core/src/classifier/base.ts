import type { AIClassifier, AIProvider } from "./types.js";
import { ClaudeClassifier } from "./claude.js";
import { OpenAIClassifier } from "./openai.js";
import { OllamaClassifier } from "./ollama.js";

export interface CreateClassifierOptions {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export function createClassifier(
  options: CreateClassifierOptions,
): AIClassifier {
  switch (options.provider) {
    case "claude":
      return new ClaudeClassifier(options.apiKey!, options.model);
    case "openai":
      return new OpenAIClassifier(
        options.apiKey!,
        options.model,
        options.baseUrl,
      );
    case "ollama":
      return new OllamaClassifier(options.model, options.baseUrl);
    default:
      throw new Error(`Unknown AI provider: ${options.provider}`);
  }
}

export const CLASSIFICATION_PROMPT = `You are a bookmark classifier. Given a list of tweets/posts, classify each one into a category and subcategory, assign relevant tags, and write a brief summary.

Respond in JSON format:
{
  "items": [
    {
      "id": "tweet_id",
      "category": "Main Category",
      "subcategory": "Sub Category (optional)",
      "tags": ["tag1", "tag2"],
      "summary": "One sentence summary"
    }
  ],
  "categories": ["Category1", "Category2"]
}

Categories should be broad topics like: Tech, AI/ML, Design, Business, Life, Science, Programming, etc.
Keep categories concise and reusable. Aim for 5-15 total categories.

Tweets to classify:
`;
