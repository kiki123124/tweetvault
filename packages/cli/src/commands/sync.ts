import { Command } from "commander";
import ora from "ora";
import { writeFileSync } from "node:fs";
import {
  JsonImporter,
  CookieFetcher,
  createClassifier,
  ObsidianGenerator,
  loadConfig,
} from "@tweetvault/core";
import type { Bookmark } from "@tweetvault/core";

export const syncCommand = new Command("sync")
  .description("Full pipeline: fetch → classify → generate Obsidian vault")
  .option("-c, --cookie <cookie>", "X cookie string")
  .option("-i, --input <path>", "Import from JSON file instead")
  .option("-o, --output <path>", "Output directory for the vault")
  .option(
    "-p, --provider <provider>",
    "AI provider (claude, openai, ollama)",
  )
  .option("-k, --api-key <key>", "API key for the AI provider")
  .option("-m, --model <model>", "Model name")
  .option("--base-url <url>", "Custom API base URL")
  .option("-l, --limit <number>", "Max bookmarks to fetch", "100")
  .option("-n, --name <name>", "Vault name", "TweetVault")
  .option("--language <lang>", "Language for summaries")
  .action(async (opts) => {
    const config = loadConfig();

    // Step 1: Fetch
    const spinner = ora("Step 1/3: Fetching bookmarks...").start();

    let bookmarks: Bookmark[];

    try {
      const cookie = opts.cookie ?? config.fetch.cookie;
      const inputPath = opts.input ?? config.fetch.jsonPath;

      if (inputPath) {
        const importer = new JsonImporter(inputPath);
        const result = await importer.fetch();
        bookmarks = result.bookmarks;
        spinner.succeed(
          `Step 1/3: Imported ${bookmarks.length} bookmarks`,
        );
      } else if (cookie) {
        const fetcher = new CookieFetcher(cookie);
        const limit = parseInt(opts.limit, 10);
        bookmarks = [];
        let cursor: string | undefined;

        while (bookmarks.length < limit) {
          const result = await fetcher.fetch({
            limit: Math.min(20, limit - bookmarks.length),
            cursor,
          });
          bookmarks.push(...result.bookmarks);
          cursor = result.cursor;
          spinner.text = `Step 1/3: Fetched ${bookmarks.length} bookmarks...`;
          if (!result.hasMore) break;
        }

        spinner.succeed(
          `Step 1/3: Fetched ${bookmarks.length} bookmarks`,
        );
      } else {
        spinner.fail("No cookie or input file. Use --cookie or --input.");
        process.exit(1);
      }
    } catch (err) {
      spinner.fail(`Fetch error: ${(err as Error).message}`);
      process.exit(1);
    }

    // Step 2: Classify
    const classifySpinner = ora(
      "Step 2/3: Classifying with AI...",
    ).start();

    try {
      const provider = opts.provider ?? config.ai.provider;
      const apiKey = opts.apiKey ?? config.ai.apiKey;
      const model = opts.model ?? config.ai.model;
      const baseUrl = opts.baseUrl ?? config.ai.baseUrl;

      if (provider !== "ollama" && !apiKey) {
        classifySpinner.fail(
          `API key required for ${provider}. Use --api-key or set in config.`,
        );
        process.exit(1);
      }

      const classifier = createClassifier({
        provider,
        apiKey,
        model,
        baseUrl,
      });

      const classified = await classifier.classify(bookmarks, {
        language: opts.language ?? config.output.language,
      });

      classifySpinner.succeed(
        `Step 2/3: Classified into ${classified.categories.length} categories`,
      );

      // Step 3: Generate
      const genSpinner = ora(
        "Step 3/3: Generating Obsidian vault...",
      ).start();

      const outputDir = opts.output ?? config.output.dir;
      const generator = new ObsidianGenerator();
      const result = await generator.generate(classified.items, {
        outputDir,
        vaultName: opts.name,
        createIndex: config.output.createIndex,
        includeMedia: config.output.includeMedia,
      });

      genSpinner.succeed(
        `Step 3/3: Generated ${result.filesCreated} files`,
      );

      console.log(`\nDone! Vault created at: ${result.outputDir}`);
      console.log(
        `Categories: ${result.categoriesCreated.join(", ")}`,
      );

      // Save intermediate data for debugging
      writeFileSync(
        "tweetvault-classified.json",
        JSON.stringify(classified, null, 2),
      );
    } catch (err) {
      classifySpinner.fail(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
