export interface Bookmark {
  id: string;
  text: string;
  authorName: string;
  authorHandle: string;
  createdAt: string;
  url: string;
  media: MediaItem[];
  quotedTweet?: Bookmark;
  metrics?: TweetMetrics;
}

export interface MediaItem {
  type: "photo" | "video" | "gif";
  url: string;
  altText?: string;
}

export interface TweetMetrics {
  likes: number;
  retweets: number;
  replies: number;
  views?: number;
}

export interface FetchOptions {
  limit?: number;
  cursor?: string;
}

export interface FetchResult {
  bookmarks: Bookmark[];
  cursor?: string;
  hasMore: boolean;
}

export interface BookmarkFetcher {
  fetch(options?: FetchOptions): Promise<FetchResult>;
}
