import { sendDirectChat } from "@tombcato/ai-selector-core";
import type { Bookmark } from "../fetcher/types.js";
import type {
  AIClassifier,
  AIProvider,
  ClassifierOptions,
  ClassificationResult,
  ClassifiedBookmark,
} from "./types.js";

export interface CreateClassifierOptions {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

const PROVIDER_DEFAULTS: Record<
  string,
  { apiFormat: string; baseUrl: string; model: string }
> = {
  claude: {
    apiFormat: "anthropic",
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-4-5-20250514",
  },
  openai: {
    apiFormat: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  ollama: {
    apiFormat: "openai",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.2",
  },
  deepseek: {
    apiFormat: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  gemini: {
    apiFormat: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.0-flash",
  },
};

export function createClassifier(
  options: CreateClassifierOptions,
): AIClassifier {
  return new UnifiedClassifier(options);
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

class UnifiedClassifier implements AIClassifier {
  private apiFormat: string;
  private baseUrl: string;
  private model: string;
  private apiKey: string;

  constructor(options: CreateClassifierOptions) {
    const defaults = PROVIDER_DEFAULTS[options.provider] ?? {
      apiFormat: "openai",
      baseUrl: options.baseUrl ?? "https://api.openai.com/v1",
      model: options.model ?? "gpt-4o-mini",
    };

    this.apiFormat = defaults.apiFormat;
    this.baseUrl = options.baseUrl ?? defaults.baseUrl;
    this.model = options.model ?? defaults.model;
    this.apiKey = options.apiKey ?? "";
  }

  async classify(
    bookmarks: Bookmark[],
    options?: ClassifierOptions,
  ): Promise<ClassificationResult> {
    const batchSize =
      options?.batchSize ?? (this.apiFormat === "ollama" ? 10 : 20);
    const allItems: ClassifiedBookmark[] = [];
    const allCategories = new Set<string>();

    for (let i = 0; i < bookmarks.length; i += batchSize) {
      const batch = bookmarks.slice(i, i + batchSize);
      const result = await this.classifyBatch(batch, options);
      allItems.push(...result.items);
      result.categories.forEach((c) => allCategories.add(c));
    }

    return { items: allItems, categories: [...allCategories] };
  }

  private async classifyBatch(
    bookmarks: Bookmark[],
    options?: ClassifierOptions,
  ): Promise<ClassificationResult> {
    const tweetsText = bookmarks
      .map(
        (b) =>
          `[ID: ${b.id}] @${b.authorHandle}: ${b.text.slice(0, 500)}`,
      )
      .join("\n\n");

    let prompt = CLASSIFICATION_PROMPT + tweetsText;
    if (options?.categories?.length) {
      prompt += `\n\nUse these categories: ${options.categories.join(", ")}`;
    }
    if (options?.language) {
      prompt += `\n\nRespond with summaries in ${options.language}.`;
    }

    const response = await sendDirectChat({
      apiFormat: this.apiFormat as "openai" | "anthropic" | "gemini" | "cohere",
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      model: this.model,
      messages: [{ role: "user", content: prompt }],
    });

    return this.parseResponse(response.content ?? "", bookmarks);
  }

  private parseResponse(
    text: string,
    bookmarks: Bookmark[],
  ): ClassificationResult {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response as JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      items: Array<{
        id: string;
        category: string;
        subcategory?: string;
        tags: string[];
        summary: string;
      }>;
      categories: string[];
    };

    const bookmarkMap = new Map(bookmarks.map((b) => [b.id, b]));

    const items: ClassifiedBookmark[] = [];
    for (const item of parsed.items) {
      const bookmark = bookmarkMap.get(item.id);
      if (!bookmark) continue;
      items.push({
        bookmark,
        category: item.category,
        subcategory: item.subcategory,
        tags: item.tags,
        summary: item.summary,
      });
    }

    return { items, categories: parsed.categories };
  }
}
