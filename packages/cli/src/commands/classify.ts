import { Command } from "commander";
import ora from "ora";
import { readFileSync, writeFileSync } from "node:fs";
import { createClassifier, loadConfig } from "@tweetvault/core";
import type { Bookmark } from "@tweetvault/core";

export const classifyCommand = new Command("classify")
  .description("Classify bookmarks using AI")
  .option("-i, --input <path>", "Bookmarks JSON file", "bookmarks.json")
  .option("-o, --output <path>", "Output file path", "classified.json")
  .option(
    "-p, --provider <provider>",
    "AI provider (claude, openai, ollama)",
  )
  .option("-k, --api-key <key>", "API key for the AI provider")
  .option("-m, --model <model>", "Model name")
  .option("--base-url <url>", "Custom API base URL")
  .option(
    "--categories <cats>",
    "Comma-separated list of categories to use",
  )
  .option("--language <lang>", "Language for summaries")
  .action(async (opts) => {
    const spinner = ora("Classifying bookmarks...").start();

    try {
      const config = loadConfig();
      const provider = opts.provider ?? config.ai.provider;
      const apiKey = opts.apiKey ?? config.ai.apiKey;
      const model = opts.model ?? config.ai.model;
      const baseUrl = opts.baseUrl ?? config.ai.baseUrl;

      if (provider !== "ollama" && !apiKey) {
        spinner.fail(
          `API key required for ${provider}. Use --api-key or set in config.`,
        );
        process.exit(1);
      }

      const raw = readFileSync(opts.input, "utf-8");
      const bookmarks: Bookmark[] = JSON.parse(raw);
      spinner.text = `Classifying ${bookmarks.length} bookmarks with ${provider}...`;

      const classifier = createClassifier({
        provider,
        apiKey,
        model,
        baseUrl,
      });

      const categories = opts.categories?.split(",").map((s: string) => s.trim());
      const result = await classifier.classify(bookmarks, {
        categories,
        language: opts.language ?? config.output.language,
      });

      writeFileSync(opts.output, JSON.stringify(result, null, 2));
      spinner.succeed(
        `Classified ${result.items.length} bookmarks into ${result.categories.length} categories`,
      );
      console.log(`Categories: ${result.categories.join(", ")}`);
      console.log(`Saved to ${opts.output}`);
    } catch (err) {
      spinner.fail(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
