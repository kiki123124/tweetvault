import type { ClassifiedBookmark } from "../classifier/types.js";

export interface VaultOptions {
  outputDir: string;
  vaultName?: string;
  /** Create index files for each category */
  createIndex?: boolean;
  /** Include media links in markdown */
  includeMedia?: boolean;
}

export interface GenerateResult {
  filesCreated: number;
  categoriesCreated: string[];
  outputDir: string;
}

export interface VaultGenerator {
  generate(
    items: ClassifiedBookmark[],
    options: VaultOptions,
  ): Promise<GenerateResult>;
}
