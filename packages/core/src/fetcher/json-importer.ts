import { readFileSync } from "node:fs";
import type {
  Bookmark,
  BookmarkFetcher,
  FetchOptions,
  FetchResult,
} from "./types.js";

/**
 * Import bookmarks from a JSON file.
 * Supports raw X export format and simplified format.
 */
export class JsonImporter implements BookmarkFetcher {
  private bookmarks: Bookmark[] = [];

  constructor(private filePath: string) {}

  async fetch(options?: FetchOptions): Promise<FetchResult> {
    if (this.bookmarks.length === 0) {
      const raw = readFileSync(this.filePath, "utf-8");
      const data = JSON.parse(raw);
      this.bookmarks = Array.isArray(data)
        ? data.map(normalizeBookmark)
        : data.bookmarks?.map(normalizeBookmark) ?? [];
    }

    const limit = options?.limit ?? this.bookmarks.length;
    const offset = options?.cursor ? parseInt(options.cursor, 10) : 0;
    const slice = this.bookmarks.slice(offset, offset + limit);

    return {
      bookmarks: slice,
      cursor:
        offset + limit < this.bookmarks.length
          ? String(offset + limit)
          : undefined,
      hasMore: offset + limit < this.bookmarks.length,
    };
  }
}

function normalizeBookmark(raw: Record<string, unknown>): Bookmark {
  // Handle X's native export format (nested under tweet.*)
  const tweet = (raw.tweet ?? raw) as Record<string, unknown>;

  return {
    id: String(tweet.id ?? tweet.id_str ?? tweet.rest_id ?? ""),
    text: String(tweet.full_text ?? tweet.text ?? ""),
    authorName: String(
      (tweet.user as Record<string, unknown>)?.name ??
        tweet.author_name ??
        tweet.authorName ??
        "",
    ),
    authorHandle: String(
      (tweet.user as Record<string, unknown>)?.screen_name ??
        tweet.author_handle ??
        tweet.authorHandle ??
        "",
    ),
    createdAt: String(tweet.created_at ?? tweet.createdAt ?? ""),
    url:
      String(
        tweet.url ??
          (tweet.id_str
            ? `https://x.com/i/status/${tweet.id_str}`
            : tweet.rest_id
              ? `https://x.com/i/status/${tweet.rest_id}`
              : ""),
      ),
    media: parseMedia(tweet),
    metrics: parseMetrics(tweet),
  };
}

function parseMedia(tweet: Record<string, unknown>): Bookmark["media"] {
  const entities = tweet.extended_entities ?? tweet.entities;
  if (!entities || typeof entities !== "object") return [];
  const media = (entities as Record<string, unknown>).media;
  if (!Array.isArray(media)) return [];

  return media.map((m: Record<string, unknown>) => ({
    type: (m.type === "video"
      ? "video"
      : m.type === "animated_gif"
        ? "gif"
        : "photo") as "photo" | "video" | "gif",
    url: String(m.media_url_https ?? m.url ?? ""),
    altText: m.ext_alt_text ? String(m.ext_alt_text) : undefined,
  }));
}

function parseMetrics(
  tweet: Record<string, unknown>,
): Bookmark["metrics"] | undefined {
  if (tweet.favorite_count != null) {
    return {
      likes: Number(tweet.favorite_count ?? 0),
      retweets: Number(tweet.retweet_count ?? 0),
      replies: Number(tweet.reply_count ?? 0),
      views: tweet.views
        ? Number(
            (tweet.views as Record<string, unknown>).count ??
              tweet.views,
          )
        : undefined,
    };
  }
  return undefined;
}
