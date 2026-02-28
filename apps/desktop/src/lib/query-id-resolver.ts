/**
 * Auto-detect the Bookmarks GraphQL queryId from X's main.js bundle.
 * X rotates queryIds periodically, so we extract it dynamically.
 */

const FALLBACK_QUERY_ID = "-LGfdImKeQz0xS_jjUwzlA";
let cachedQueryId: string | null = null;

export async function resolveBookmarkQueryId(): Promise<string> {
  if (cachedQueryId) return cachedQueryId;

  try {
    // Step 1: Fetch x.com homepage to find main.js URL
    const html = await fetch("https://x.com", {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    }).then((r) => r.text());

    const jsMatch = html.match(
      /https:\/\/abs\.twimg\.com\/responsive-web\/client-web\/main\.[a-z0-9]+\.js/i,
    );
    if (!jsMatch) return FALLBACK_QUERY_ID;

    // Step 2: Fetch main.js and search for Bookmarks queryId
    const js = await fetch(jsMatch[0]).then((r) => r.text());

    const qidMatch = js.match(
      /queryId:"([^"]+)",operationName:"Bookmarks"/,
    );
    if (!qidMatch) {
      // Try alternative pattern: some builds use different structure
      const altMatch = js.match(
        /\{queryId:"([^"]+)"[^}]*operationName:"Bookmarks"/,
      );
      if (altMatch) {
        cachedQueryId = altMatch[1];
        return cachedQueryId;
      }
      return FALLBACK_QUERY_ID;
    }

    cachedQueryId = qidMatch[1];
    return cachedQueryId;
  } catch {
    return FALLBACK_QUERY_ID;
  }
}
