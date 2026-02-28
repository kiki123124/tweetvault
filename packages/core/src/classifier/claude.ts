import type {
  Bookmark,
  AIClassifier,
  ClassifierOptions,
  ClassificationResult,
  ClassifiedBookmark,
} from "./types.js";
import { CLASSIFICATION_PROMPT } from "./base.js";

export class ClaudeClassifier implements AIClassifier {
  constructor(
    private apiKey: string,
    private model: string = "claude-sonnet-4-5-20250514",
  ) {}

  async classify(
    bookmarks: Bookmark[],
    options?: ClassifierOptions,
  ): Promise<ClassificationResult> {
    const batchSize = options?.batchSize ?? 20;
    const allItems: ClassifiedBookmark[] = [];
    const allCategories = new Set<string>();

    for (let i = 0; i < bookmarks.length; i += batchSize) {
      const batch = bookmarks.slice(i, i + batchSize);
      const result = await this.classifyBatch(batch, options);
      allItems.push(...result.items);
      result.categories.forEach((c) => allCategories.add(c));
    }

    return {
      items: allItems,
      categories: [...allCategories],
    };
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

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const text = data.content[0]?.text ?? "";
    return this.parseResponse(text, bookmarks);
  }

  private parseResponse(
    text: string,
    bookmarks: Bookmark[],
  ): ClassificationResult {
    // Extract JSON from response (might be wrapped in markdown code blocks)
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
