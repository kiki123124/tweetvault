/**
 * TweetVault sync pipeline — runs entirely in the Tauri webview.
 * No Node.js dependency. Uses Tauri plugins for file I/O and CORS-free HTTP.
 */

import { mkdir, writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { join, homeDir } from "@tauri-apps/api/path";
import { sendDirectChat } from "@tombcato/ai-selector-core";
import { resolveBookmarkQueryId } from "./query-id-resolver";

// ─── Types ───────────────────────────────────────────────────────

export interface Bookmark {
  id: string;
  text: string;
  authorName: string;
  authorHandle: string;
  createdAt: string;
  url: string;
  media: { type: "photo" | "video" | "gif"; url: string; altText?: string }[];
  metrics?: { likes: number; retweets: number; replies: number };
}

export interface ClassifiedBookmark {
  bookmark: Bookmark;
  category: string;
  subcategory?: string;
  tags: string[];
  summary: string;
}

export interface SyncConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  inputPath?: string;
  cookie?: string;
  outputDir: string;
  limit?: number;
}

export interface SyncProgress {
  step: number;
  detail: string;
}

export interface SyncResult {
  filesCreated: number;
  categories: string[];
  outputDir: string;
  bookmarkCount: number;
}

// ─── Main Pipeline ───────────────────────────────────────────────

export async function syncBookmarks(
  config: SyncConfig,
  onProgress?: (p: SyncProgress) => void,
): Promise<SyncResult> {
  // Step 1: Fetch bookmarks
  onProgress?.({ step: 1, detail: "正在获取书签..." });
  let bookmarks: Bookmark[];

  if (config.inputPath) {
    const raw = await readTextFile(config.inputPath);
    const data = JSON.parse(raw);
    bookmarks = Array.isArray(data) ? data : data.bookmarks ?? [];
    onProgress?.({ step: 1, detail: `读取到 ${bookmarks.length} 条书签` });
  } else if (config.cookie) {
    bookmarks = await fetchBookmarks(config.cookie, config.limit ?? 100, onProgress);
  } else {
    throw new Error("请提供 Cookie 或 JSON 文件");
  }

  if (bookmarks.length === 0) {
    throw new Error("未获取到任何书签");
  }

  // Step 2: AI Classification
  onProgress?.({ step: 2, detail: `正在用 AI 分类 ${bookmarks.length} 条书签...` });
  const classified = await classifyBookmarks(bookmarks, config);
  onProgress?.({ step: 2, detail: `分类完成，${classified.categories.length} 个类别` });

  // Step 3: Generate Obsidian vault
  onProgress?.({ step: 3, detail: "正在生成 Obsidian 知识库..." });
  const result = await generateVault(classified.items, config.outputDir);

  return {
    filesCreated: result.filesCreated,
    categories: classified.categories,
    outputDir: config.outputDir,
    bookmarkCount: bookmarks.length,
  };
}

// ─── Bookmark Fetching (from CookieFetcher) ──────────────────────

const BEARER_TOKEN =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

const FEATURES = {
  graphql_timeline_v2_bookmark_timeline: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_media_download_video_enabled: false,
  responsive_web_enhance_cards_enabled: false,
};

async function fetchBookmarks(
  cookie: string,
  limit: number,
  onProgress?: (p: SyncProgress) => void,
): Promise<Bookmark[]> {
  const csrfMatch = cookie.match(/ct0=([^;]+)/);
  if (!csrfMatch) {
    throw new Error("Cookie 中缺少 ct0（CSRF token），请确保复制了完整的 Cookie");
  }
  const csrfToken = csrfMatch[1];

  const queryId = await resolveBookmarkQueryId();
  const bookmarks: Bookmark[] = [];
  let cursor: string | undefined;

  while (bookmarks.length < limit) {
    const variables: Record<string, unknown> = {
      count: Math.min(20, limit - bookmarks.length),
      includePromotedContent: false,
    };
    if (cursor) variables.cursor = cursor;

    const params = new URLSearchParams({
      variables: JSON.stringify(variables),
      features: JSON.stringify(FEATURES),
    });

    const url = `https://x.com/i/api/graphql/${queryId}/Bookmarks?${params}`;
    const res = await fetch(url, {
      headers: {
        authorization: `Bearer ${BEARER_TOKEN}`,
        cookie: cookie,
        "x-csrf-token": csrfToken,
        "x-twitter-active-user": "yes",
        "x-twitter-auth-type": "OAuth2Session",
        "content-type": "application/json",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`X API 错误 ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const { items, nextCursor } = parseBookmarkResponse(json);
    bookmarks.push(...items);
    onProgress?.({ step: 1, detail: `已获取 ${bookmarks.length} 条书签...` });

    if (!nextCursor || items.length === 0) break;
    cursor = nextCursor;
  }

  return bookmarks;
}

function parseBookmarkResponse(json: any): { items: Bookmark[]; nextCursor?: string } {
  const timeline =
    json?.data?.bookmark_timeline_v2?.timeline?.instructions ??
    json?.data?.search_by_raw_query?.bookmarks_search_timeline?.timeline?.instructions;

  if (!timeline) return { items: [] };

  const addEntries = timeline.find((i: any) => i.type === "TimelineAddEntries");
  const entries = addEntries?.entries ?? [];

  const items: Bookmark[] = [];
  let nextCursor: string | undefined;

  for (const entry of entries) {
    const entryId = entry.entryId ?? "";

    if (entryId.startsWith("tweet-")) {
      let result = entry?.content?.itemContent?.tweet_results?.result;
      if (!result) continue;

      // Handle TweetWithVisibilityResults wrapper
      if (result.__typename === "TweetWithVisibilityResults") {
        result = result.tweet;
      }

      const legacy = result?.legacy;
      if (!legacy) continue;

      // X API 2025: user info moved from legacy to core
      const userResult = result?.core?.user_results?.result;
      const userCore = userResult?.core ?? {};
      const userLegacy = userResult?.legacy ?? {};
      const screenName = userCore.screen_name ?? userLegacy.screen_name ?? "";
      const name = userCore.name ?? userLegacy.name ?? "";
      const restId = result.rest_id ?? "";

      const media = (legacy.extended_entities?.media ?? []).map((m: any) => ({
        type: m.type === "video" ? "video" : m.type === "animated_gif" ? "gif" : "photo",
        url: m.media_url_https ?? "",
        altText: m.ext_alt_text ?? undefined,
      }));

      items.push({
        id: restId,
        text: legacy.full_text ?? "",
        authorName: name,
        authorHandle: screenName,
        createdAt: legacy.created_at ?? "",
        url: screenName
          ? `https://x.com/${screenName}/status/${restId}`
          : `https://x.com/i/status/${restId}`,
        media,
        metrics: {
          likes: legacy.favorite_count ?? 0,
          retweets: legacy.retweet_count ?? 0,
          replies: legacy.reply_count ?? 0,
        },
      });
    } else if (entryId.startsWith("cursor-bottom-")) {
      nextCursor = entry?.content?.value ?? "";
    }
  }

  return { items, nextCursor };
}

// ─── AI Classification ───────────────────────────────────────────

const PROVIDER_DEFAULTS: Record<string, { apiFormat: string; baseUrl: string; model: string }> = {
  claude: { apiFormat: "anthropic", baseUrl: "https://api.anthropic.com", model: "claude-sonnet-4-5-20250514" },
  openai: { apiFormat: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  ollama: { apiFormat: "openai", baseUrl: "http://localhost:11434/v1", model: "llama3.2" },
  deepseek: { apiFormat: "openai", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  gemini: { apiFormat: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.0-flash" },
  moonshot: { apiFormat: "openai", baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" },
  qwen: { apiFormat: "openai", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-turbo" },
  zhipu: { apiFormat: "openai", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash" },
  groq: { apiFormat: "openai", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.1-8b-instant" },
  mistral: { apiFormat: "openai", baseUrl: "https://api.mistral.ai/v1", model: "mistral-small-latest" },
  together: { apiFormat: "openai", baseUrl: "https://api.together.xyz/v1", model: "meta-llama/Llama-3-8b-chat-hf" },
  xai: { apiFormat: "openai", baseUrl: "https://api.x.ai/v1", model: "grok-2-latest" },
  openrouter: { apiFormat: "openai", baseUrl: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3-8b-instruct" },
  siliconflow: { apiFormat: "openai", baseUrl: "https://api.siliconflow.cn/v1", model: "Qwen/Qwen2.5-7B-Instruct" },
  fireworks: { apiFormat: "openai", baseUrl: "https://api.fireworks.ai/inference/v1", model: "accounts/fireworks/models/llama-v3p1-8b-instruct" },
  cohere: { apiFormat: "openai", baseUrl: "https://api.cohere.com/v1", model: "command-r" },
  deepinfra: { apiFormat: "openai", baseUrl: "https://api.deepinfra.com/v1/openai", model: "meta-llama/Meta-Llama-3-8B-Instruct" },
  perplexity: { apiFormat: "openai", baseUrl: "https://api.perplexity.ai", model: "llama-3.1-sonar-small-128k-online" },
};

const CLASSIFICATION_PROMPT = `You are a bookmark classifier. Given a list of tweets/posts, classify each one into a category and subcategory, assign relevant tags, and write a brief summary.

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

Categories should be broad topics like: Tech, AI/ML, Design, Business, Life, Science, Programming, Crypto, etc.
Keep categories concise and reusable. Aim for 5-15 total categories.
Respond with summaries in Chinese.

Tweets to classify:
`;

async function classifyBookmarks(
  bookmarks: Bookmark[],
  config: SyncConfig,
): Promise<{ items: ClassifiedBookmark[]; categories: string[] }> {
  const defaults = PROVIDER_DEFAULTS[config.provider] ?? {
    apiFormat: "openai",
    baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
    model: config.model ?? "gpt-4o-mini",
  };

  const apiFormat = defaults.apiFormat;
  const baseUrl = config.baseUrl ?? defaults.baseUrl;
  const model = config.model ?? defaults.model;
  const batchSize = 20;

  const allItems: ClassifiedBookmark[] = [];
  const allCategories = new Set<string>();

  for (let i = 0; i < bookmarks.length; i += batchSize) {
    const batch = bookmarks.slice(i, i + batchSize);
    const tweetsText = batch
      .map((b) => `[ID: ${b.id}] @${b.authorHandle}: ${b.text.slice(0, 500)}`)
      .join("\n\n");

    const prompt = CLASSIFICATION_PROMPT + tweetsText;

    const response = await sendDirectChat({
      apiFormat: apiFormat as "openai" | "anthropic" | "gemini" | "cohere",
      baseUrl,
      apiKey: config.apiKey,
      model,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI 返回的结果无法解析为 JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const bookmarkMap = new Map(batch.map((b) => [b.id, b]));

    for (const item of parsed.items ?? []) {
      const bookmark = bookmarkMap.get(item.id);
      if (!bookmark) continue;
      allItems.push({
        bookmark,
        category: item.category,
        subcategory: item.subcategory,
        tags: item.tags ?? [],
        summary: item.summary ?? "",
      });
      allCategories.add(item.category);
    }

    for (const cat of parsed.categories ?? []) {
      allCategories.add(cat);
    }
  }

  return { items: allItems, categories: [...allCategories] };
}

// ─── Obsidian Vault Generation ───────────────────────────────────

function sanitizePath(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

function makeFilename(item: ClassifiedBookmark): string {
  const handle = item.bookmark.authorHandle || "unknown";
  return `${handle}-${item.bookmark.id}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

function renderBookmarkMarkdown(item: ClassifiedBookmark): string {
  const { bookmark, category, subcategory, tags, summary } = item;
  const lines: string[] = [];

  lines.push("---");
  lines.push(`title: "Tweet by @${bookmark.authorHandle}"`);
  lines.push(`author: "@${bookmark.authorHandle}"`);
  lines.push(`author_name: "${bookmark.authorName}"`);
  if (bookmark.createdAt) lines.push(`date: ${formatDate(bookmark.createdAt)}`);
  lines.push(`url: ${bookmark.url}`);
  lines.push(`category: "${category}"`);
  if (subcategory) lines.push(`subcategory: "${subcategory}"`);
  lines.push(`tags: [${tags.map((t) => `"${t}"`).join(", ")}]`);
  lines.push("---");
  lines.push("");
  lines.push(`> ${summary}`);
  lines.push("");
  lines.push(bookmark.text);
  lines.push("");

  if (bookmark.media.length > 0) {
    lines.push("## Media");
    for (const m of bookmark.media) {
      if (m.type === "photo") {
        lines.push(`![${m.altText ?? "image"}](${m.url})`);
      } else {
        lines.push(`- [${m.type}](${m.url})`);
      }
    }
    lines.push("");
  }

  if (bookmark.metrics) {
    const { likes, retweets, replies } = bookmark.metrics;
    lines.push(`---\n*${likes} likes · ${retweets} retweets · ${replies} replies*`);
    lines.push("");
  }

  lines.push(`[View on X](${bookmark.url})`);
  return lines.join("\n");
}

function renderCategoryIndex(category: string, items: ClassifiedBookmark[]): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`title: "${category}"`);
  lines.push(`type: category-index`);
  lines.push(`count: ${items.length}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${category}`);
  lines.push("");
  lines.push(`${items.length} bookmarks in this category.`);
  lines.push("");

  for (const item of items) {
    const filename = makeFilename(item);
    lines.push(`- [[${filename}|@${item.bookmark.authorHandle}]]: ${item.summary}`);
  }

  return lines.join("\n");
}

async function generateVault(
  items: ClassifiedBookmark[],
  outputDir: string,
): Promise<{ filesCreated: number }> {
  await mkdir(outputDir, { recursive: true });

  const byCategory = new Map<string, ClassifiedBookmark[]>();
  for (const item of items) {
    if (!byCategory.has(item.category)) byCategory.set(item.category, []);
    byCategory.get(item.category)!.push(item);
  }

  let filesCreated = 0;

  for (const [category, categoryItems] of byCategory) {
    const catDir = await join(outputDir, sanitizePath(category));
    await mkdir(catDir, { recursive: true });

    for (const item of categoryItems) {
      const filename = `${makeFilename(item)}.md`;
      const content = renderBookmarkMarkdown(item);
      await writeTextFile(await join(catDir, filename), content);
      filesCreated++;
    }

    const indexContent = renderCategoryIndex(category, categoryItems);
    await writeTextFile(await join(catDir, "_index.md"), indexContent);
    filesCreated++;
  }

  // Root index
  const rootLines: string[] = [];
  rootLines.push("---");
  rootLines.push(`title: "TweetVault"`);
  rootLines.push(`type: vault-index`);
  rootLines.push("---");
  rootLines.push("");
  rootLines.push("# TweetVault");
  rootLines.push("");
  const total = items.length;
  rootLines.push(`${total} bookmarks across ${byCategory.size} categories.`);
  rootLines.push("");
  for (const [category, catItems] of byCategory) {
    rootLines.push(`- **[[${sanitizePath(category)}/_index|${category}]]** (${catItems.length})`);
  }
  await writeTextFile(await join(outputDir, "_index.md"), rootLines.join("\n"));
  filesCreated++;

  return { filesCreated };
}
