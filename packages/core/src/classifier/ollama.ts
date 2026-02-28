import type {
  Bookmark,
  AIClassifier,
  ClassifierOptions,
  ClassificationResult,
  ClassifiedBookmark,
} from "./types.js";
import { CLASSIFICATION_PROMPT } from "./base.js";

export class OllamaClassifier implements AIClassifier {
  constructor(
    private model: string = "llama3.2",
    private baseUrl: string = "http://localhost:11434",
  ) {}

  async classify(
    bookmarks: Bookmark[],
    options?: ClassifierOptions,
  ): Promise<ClassificationResult> {
    const batchSize = options?.batchSize ?? 10; // smaller batches for local models
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

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        format: "json",
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama API error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as { response: string };
    return this.parseResponse(data.response, bookmarks);
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

    const items: ClassifiedBookmark[] = parsed.items
      .map((item) => {
        const bookmark = bookmarkMap.get(item.id);
        if (!bookmark) return null;
        return {
          bookmark,
          category: item.category,
          subcategory: item.subcategory,
          tags: item.tags,
          summary: item.summary,
        };
      })
      .filter((x): x is ClassifiedBookmark => x !== null);

    return { items, categories: parsed.categories };
  }
}
