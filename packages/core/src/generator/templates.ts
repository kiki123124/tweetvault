import type { ClassifiedBookmark } from "../classifier/types.js";

export function renderBookmarkMarkdown(item: ClassifiedBookmark): string {
  const { bookmark, category, subcategory, tags, summary } = item;
  const lines: string[] = [];

  // Frontmatter
  lines.push("---");
  lines.push(`title: "Tweet by @${bookmark.authorHandle}"`);
  lines.push(`author: "@${bookmark.authorHandle}"`);
  lines.push(`author_name: "${bookmark.authorName}"`);
  if (bookmark.createdAt) {
    lines.push(`date: ${formatDate(bookmark.createdAt)}`);
  }
  lines.push(`url: ${bookmark.url}`);
  lines.push(`category: "${category}"`);
  if (subcategory) {
    lines.push(`subcategory: "${subcategory}"`);
  }
  lines.push(`tags: [${tags.map((t) => `"${t}"`).join(", ")}]`);
  lines.push("---");
  lines.push("");

  // Summary
  lines.push(`> ${summary}`);
  lines.push("");

  // Content
  lines.push(bookmark.text);
  lines.push("");

  // Media
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

  // Metrics
  if (bookmark.metrics) {
    const { likes, retweets, replies } = bookmark.metrics;
    lines.push(
      `---\n*${likes} likes · ${retweets} retweets · ${replies} replies*`,
    );
    lines.push("");
  }

  // Source link
  lines.push(`[View on X](${bookmark.url})`);

  return lines.join("\n");
}

export function renderCategoryIndex(
  category: string,
  items: ClassifiedBookmark[],
): string {
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
    lines.push(
      `- [[${filename}|@${item.bookmark.authorHandle}]]: ${item.summary}`,
    );
  }

  return lines.join("\n");
}

export function makeFilename(item: ClassifiedBookmark): string {
  const handle = item.bookmark.authorHandle || "unknown";
  const id = item.bookmark.id;
  return `${handle}-${id}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}
