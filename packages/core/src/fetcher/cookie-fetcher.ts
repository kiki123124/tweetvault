import type {
  Bookmark,
  BookmarkFetcher,
  FetchOptions,
  FetchResult,
} from "./types.js";

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

/**
 * Fetch bookmarks from X using cookie-based authentication.
 * Uses X's internal GraphQL API (same as the web app).
 */
export class CookieFetcher implements BookmarkFetcher {
  private cookie: string;
  private csrfToken: string;
  private bearerToken =
    "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

  constructor(cookie: string) {
    this.cookie = cookie;
    // Extract csrf token from cookie
    const match = cookie.match(/ct0=([^;]+)/);
    if (!match) {
      throw new Error(
        "Invalid cookie: missing ct0 (CSRF token). Make sure to include the full cookie string from your browser.",
      );
    }
    this.csrfToken = match[1];
  }

  async fetch(options?: FetchOptions): Promise<FetchResult> {
    const count = options?.limit ?? 20;
    const queryId = "-LGfdImKeQz0xS_jjUwzlA";
    const variables: Record<string, unknown> = {
      count,
      includePromotedContent: false,
    };
    if (options?.cursor) {
      variables.cursor = options.cursor;
    }

    const params = new URLSearchParams({
      variables: JSON.stringify(variables),
      features: JSON.stringify(FEATURES),
    });

    const url = `https://x.com/i/api/graphql/${queryId}/Bookmarks?${params}`;

    const res = await fetch(url, {
      headers: {
        authorization: `Bearer ${this.bearerToken}`,
        cookie: this.cookie,
        "x-csrf-token": this.csrfToken,
        "x-twitter-active-user": "yes",
        "x-twitter-auth-type": "OAuth2Session",
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `X API error ${res.status}: ${text.slice(0, 200)}`,
      );
    }

    const json = (await res.json()) as Record<string, unknown>;
    return this.parseResponse(json);
  }

  private parseResponse(json: Record<string, unknown>): FetchResult {
    // BookmarkSearchTimeline response path
    const timeline = (getNestedValue(json, [
      "data",
      "search_by_raw_query",
      "bookmarks_search_timeline",
      "timeline",
      "instructions",
    ]) ?? getNestedValue(json, [
      "data",
      "bookmark_timeline_v2",
      "timeline",
      "instructions",
    ])) as Array<Record<string, unknown>> | undefined;

    if (!timeline) {
      return { bookmarks: [], hasMore: false };
    }

    const entries =
      (
        timeline.find((i) => i.type === "TimelineAddEntries") as
          | Record<string, unknown>
          | undefined
      )?.entries ?? [];

    const bookmarks: Bookmark[] = [];
    let cursor: string | undefined;

    for (const entry of entries as Array<Record<string, unknown>>) {
      const entryId = String(entry.entryId ?? "");

      if (entryId.startsWith("tweet-")) {
        const result = getNestedValue(entry, [
          "content",
          "itemContent",
          "tweet_results",
          "result",
        ]) as Record<string, unknown> | undefined;
        if (result) {
          const bm = this.parseTweetResult(result);
          if (bm) bookmarks.push(bm);
        }
      } else if (entryId.startsWith("cursor-bottom-")) {
        cursor = String(
          getNestedValue(entry, ["content", "value"]) ?? "",
        );
      }
    }

    return {
      bookmarks,
      cursor,
      hasMore: !!cursor,
    };
  }

  private parseTweetResult(
    result: Record<string, unknown>,
  ): Bookmark | null {
    // Handle TweetWithVisibilityResults wrapper
    const tweet = (result.__typename === "TweetWithVisibilityResults"
      ? (result.tweet as Record<string, unknown>)
      : result) as Record<string, unknown>;

    const legacy = tweet.legacy as Record<string, unknown> | undefined;
    const core = tweet.core as Record<string, unknown> | undefined;

    if (!legacy) return null;

    // X API moved name/screen_name from legacy to core in 2025
    const userCore = getNestedValue(core, [
      "user_results",
      "result",
      "core",
    ]) as Record<string, unknown> | undefined;
    const userLegacy = getNestedValue(core, [
      "user_results",
      "result",
      "legacy",
    ]) as Record<string, unknown> | undefined;

    const restId = String(tweet.rest_id ?? "");
    const screenName = String(userCore?.screen_name ?? userLegacy?.screen_name ?? "");
    const name = String(userCore?.name ?? userLegacy?.name ?? "");

    return {
      id: restId,
      text: String(legacy.full_text ?? ""),
      authorName: name,
      authorHandle: screenName,
      createdAt: String(legacy.created_at ?? ""),
      url: screenName
        ? `https://x.com/${screenName}/status/${restId}`
        : `https://x.com/i/status/${restId}`,
      media: this.parseMedia(legacy),
      metrics: {
        likes: Number(legacy.favorite_count ?? 0),
        retweets: Number(legacy.retweet_count ?? 0),
        replies: Number(legacy.reply_count ?? 0),
      },
    };
  }

  private parseMedia(
    legacy: Record<string, unknown>,
  ): Bookmark["media"] {
    const entities = legacy.extended_entities as
      | Record<string, unknown>
      | undefined;
    if (!entities?.media || !Array.isArray(entities.media)) return [];

    return (entities.media as Array<Record<string, unknown>>).map(
      (m) => ({
        type: (m.type === "video"
          ? "video"
          : m.type === "animated_gif"
            ? "gif"
            : "photo") as "photo" | "video" | "gif",
        url: String(m.media_url_https ?? ""),
        altText: m.ext_alt_text ? String(m.ext_alt_text) : undefined,
      }),
    );
  }
}

function getNestedValue(
  obj: unknown,
  path: string[],
): unknown {
  let current = obj;
  for (const key of path) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
