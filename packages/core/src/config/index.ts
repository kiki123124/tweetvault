import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { AIProvider } from "../classifier/types.js";

export interface TweetVaultConfig {
  ai: {
    provider: AIProvider;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
  };
  output: {
    dir: string;
    includeMedia: boolean;
    createIndex: boolean;
    language: string;
  };
  fetch: {
    cookie?: string;
    /** Path to JSON file for import */
    jsonPath?: string;
  };
}

const DEFAULT_CONFIG: TweetVaultConfig = {
  ai: {
    provider: "claude",
  },
  output: {
    dir: "./tweetvault-output",
    includeMedia: true,
    createIndex: true,
    language: "en",
  },
  fetch: {},
};

function getConfigDir(): string {
  return join(homedir(), ".tweetvault");
}

function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

export function loadConfig(): TweetVaultConfig {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  const raw = readFileSync(configPath, "utf-8");
  return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
}

export function saveConfig(config: TweetVaultConfig): void {
  const configDir = getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}
