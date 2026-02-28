import { Command } from "commander";
import ora from "ora";
import { readFileSync } from "node:fs";
import { ObsidianGenerator, loadConfig } from "@tweetvault/core";
import type { ClassificationResult } from "@tweetvault/core";

export const generateCommand = new Command("generate")
  .description("Generate Obsidian vault from classified bookmarks")
  .option("-i, --input <path>", "Classified JSON file", "classified.json")
  .option("-o, --output <path>", "Output directory for the vault")
  .option("-n, --name <name>", "Vault name", "TweetVault")
  .option("--no-index", "Skip creating index files")
  .option("--no-media", "Skip including media links")
  .action(async (opts) => {
    const spinner = ora("Generating Obsidian vault...").start();

    try {
      const config = loadConfig();
      const outputDir = opts.output ?? config.output.dir;

      const raw = readFileSync(opts.input, "utf-8");
      const data: ClassificationResult = JSON.parse(raw);

      const generator = new ObsidianGenerator();
      const result = await generator.generate(data.items, {
        outputDir,
        vaultName: opts.name,
        createIndex: opts.index !== false,
        includeMedia: opts.media !== false,
      });

      spinner.succeed(
        `Generated ${result.filesCreated} files in ${result.categoriesCreated.length} categories`,
      );
      console.log(`Vault created at: ${result.outputDir}`);
      console.log(
        `Categories: ${result.categoriesCreated.join(", ")}`,
      );
    } catch (err) {
      spinner.fail(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
