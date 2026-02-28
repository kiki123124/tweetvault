import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ClassifiedBookmark } from "../classifier/types.js";
import type { VaultGenerator, VaultOptions, GenerateResult } from "./types.js";
import {
  renderBookmarkMarkdown,
  renderCategoryIndex,
  makeFilename,
} from "./templates.js";

export class ObsidianGenerator implements VaultGenerator {
  async generate(
    items: ClassifiedBookmark[],
    options: VaultOptions,
  ): Promise<GenerateResult> {
    const outputDir = options.outputDir;
    mkdirSync(outputDir, { recursive: true });

    // Group by category
    const byCategory = new Map<string, ClassifiedBookmark[]>();
    for (const item of items) {
      const cat = item.category;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(item);
    }

    let filesCreated = 0;

    // Create category folders and write bookmark files
    for (const [category, categoryItems] of byCategory) {
      const catDir = join(outputDir, sanitizePath(category));
      mkdirSync(catDir, { recursive: true });

      for (const item of categoryItems) {
        const filename = `${makeFilename(item)}.md`;
        const content = renderBookmarkMarkdown(item);
        writeFileSync(join(catDir, filename), content);
        filesCreated++;
      }

      // Create category index
      if (options.createIndex !== false) {
        const indexContent = renderCategoryIndex(category, categoryItems);
        writeFileSync(join(catDir, "_index.md"), indexContent);
        filesCreated++;
      }
    }

    // Create vault root index
    if (options.createIndex !== false) {
      const rootIndex = this.renderRootIndex(byCategory, options);
      writeFileSync(join(outputDir, "_index.md"), rootIndex);
      filesCreated++;
    }

    return {
      filesCreated,
      categoriesCreated: [...byCategory.keys()],
      outputDir,
    };
  }

  private renderRootIndex(
    byCategory: Map<string, ClassifiedBookmark[]>,
    options: VaultOptions,
  ): string {
    const lines: string[] = [];
    const name = options.vaultName ?? "TweetVault";

    lines.push("---");
    lines.push(`title: "${name}"`);
    lines.push(`type: vault-index`);
    lines.push("---");
    lines.push("");
    lines.push(`# ${name}`);
    lines.push("");

    const total = [...byCategory.values()].reduce(
      (sum, items) => sum + items.length,
      0,
    );
    lines.push(
      `${total} bookmarks across ${byCategory.size} categories.`,
    );
    lines.push("");

    for (const [category, items] of byCategory) {
      lines.push(
        `- **[[${sanitizePath(category)}/_index|${category}]]** (${items.length})`,
      );
    }

    return lines.join("\n");
  }
}

function sanitizePath(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}
