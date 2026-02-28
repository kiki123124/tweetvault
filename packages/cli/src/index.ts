import { Command } from "commander";
import { fetchCommand } from "./commands/fetch.js";
import { classifyCommand } from "./commands/classify.js";
import { generateCommand } from "./commands/generate.js";
import { syncCommand } from "./commands/sync.js";

const program = new Command();

program
  .name("tweetvault")
  .description(
    "Export X bookmarks, AI-classify them, and build an Obsidian knowledge base",
  )
  .version("0.1.0");

program.addCommand(fetchCommand);
program.addCommand(classifyCommand);
program.addCommand(generateCommand);
program.addCommand(syncCommand);

program.parse();
