import { Command } from "commander";
import ora from "ora";
import { writeFileSync } from "node:fs";
import { JsonImporter, CookieFetcher, loadConfig } from "@tweetvault/core";
import type { Bookmark } from "@tweetvault/core";

export const fetchCommand = new Command("fetch")
  .description("Fetch bookmarks from X (via cookie or JSON import)")
  .option("-c, --cookie <cookie>", "X cookie string for authentication")
  .option("-i, --input <path>", "Import from JSON file instead")
  .option("-o, --output <path>", "Output file path", "bookmarks.json")
  .option("-l, --limit <number>", "Max bookmarks to fetch", "100")
  .action(async (opts) => {
    const spinner = ora("Fetching bookmarks...").start();

    try {
      const config = loadConfig();
      const cookie = opts.cookie ?? config.fetch.cookie;
      const inputPath = opts.input ?? config.fetch.jsonPath;

      let allBookmarks: Bookmark[] = [];

      if (inputPath) {
        const importer = new JsonImporter(inputPath);
        const result = await importer.fetch();
        allBookmarks = result.bookmarks;
        spinner.succeed(
          `Imported ${allBookmarks.length} bookmarks from ${inputPath}`,
        );
      } else if (cookie) {
        const fetcher = new CookieFetcher(cookie);
        const limit = parseInt(opts.limit, 10);
        let cursor: string | undefined;

        while (allBookmarks.length < limit) {
          const result = await fetcher.fetch({
            limit: Math.min(20, limit - allBookmarks.length),
            cursor,
          });
          allBookmarks.push(...result.bookmarks);
          cursor = result.cursor;
          spinner.text = `Fetched ${allBookmarks.length} bookmarks...`;
          if (!result.hasMore) break;
        }

        spinner.succeed(`Fetched ${allBookmarks.length} bookmarks from X`);
      } else {
        spinner.fail(
          "No cookie or input file provided. Use --cookie or --input.",
        );
        process.exit(1);
      }

      writeFileSync(opts.output, JSON.stringify(allBookmarks, null, 2));
      console.log(`Saved to ${opts.output}`);
    } catch (err) {
      spinner.fail(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
