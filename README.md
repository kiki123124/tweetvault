# TweetVault

Export your X (Twitter) bookmarks, auto-classify them with AI, and generate a structured [Obsidian](https://obsidian.md) knowledge base.

> Turn your bookmark graveyard into a searchable, organized knowledge vault.

## Features

- **Bookmark fetching** — Cookie-based auth (like yt-dlp) or JSON file import
- **AI classification** — Auto-categorize into topic folders with tags and summaries
- **Multi-provider** — Claude, OpenAI, or local models via Ollama
- **Obsidian vault** — Markdown files with frontmatter, backlinks, and category indexes
- **CLI first** — Scriptable, pipe-friendly commands
- **macOS desktop app** — Tauri-based GUI (coming soon)

## Quick Start

```bash
# Clone and install
git clone https://github.com/kiki123124/tweetvault.git
cd tweetvault
pnpm install && pnpm build

# One-command pipeline: import JSON → AI classify → generate vault
node packages/cli/dist/index.js sync \
  --input bookmarks.json \
  --provider claude --api-key sk-ant-xxx \
  --output ./my-vault
```

## Usage

### Full pipeline (recommended)

```bash
tweetvault sync --input bookmarks.json --provider openai --api-key sk-xxx --output ./vault
```

### Step by step

```bash
# 1. Fetch bookmarks (from JSON file)
tweetvault fetch --input bookmarks.json --output bookmarks.json

# 1. Or fetch directly from X (requires browser cookie)
tweetvault fetch --cookie "ct0=xxx; auth_token=xxx" --limit 200

# 2. Classify with AI
tweetvault classify --provider claude --api-key sk-ant-xxx

# 3. Generate Obsidian vault
tweetvault generate --output ./my-vault --name "My TweetVault"
```

### AI Providers

| Provider | Flag | Model (default) |
|----------|------|-----------------|
| Claude | `--provider claude` | claude-sonnet-4-5 |
| OpenAI | `--provider openai` | gpt-4o-mini |
| Ollama | `--provider ollama` | llama3.2 |

For OpenAI-compatible APIs, use `--base-url`:
```bash
tweetvault classify --provider openai --base-url https://your-api.com/v1 --api-key xxx
```

## Output Structure

```
my-vault/
├── _index.md                  # Vault overview
├── Tech/
│   ├── _index.md              # Category index with links
│   ├── sarahchen_dev-123.md   # Individual bookmark
│   └── alexrust_dev-456.md
├── AI_ML/
│   ├── _index.md
│   └── liuwei_ml-789.md
├── Productivity/
│   └── jamespark-101.md
└── Design/
    └── designdaily-102.md
```

Each bookmark file includes:
```markdown
---
title: "Tweet by @username"
author: "@username"
date: 2024-12-15
url: https://x.com/username/status/123
category: "Tech"
tags: ["ai", "open-source", "framework"]
---

> AI-generated summary of the tweet.

Original tweet content...

[View on X](https://x.com/username/status/123)
```

## Getting Your X Cookie

1. Open [x.com](https://x.com) in your browser and log in
2. Open DevTools (F12) → Network tab
3. Refresh the page, click any request to x.com
4. Copy the `Cookie` header value
5. Use it with `--cookie "ct0=xxx; auth_token=xxx; ..."`

## Configuration

Save defaults to `~/.tweetvault/config.json`:

```json
{
  "ai": {
    "provider": "claude",
    "apiKey": "sk-ant-xxx",
    "model": "claude-sonnet-4-5-20250514"
  },
  "output": {
    "dir": "./my-vault",
    "includeMedia": true,
    "createIndex": true,
    "language": "en"
  }
}
```

## Project Structure

```
tweetvault/
├── packages/core    # Fetching, AI classification, Obsidian generation
├── packages/cli     # Command-line interface
├── apps/desktop     # Tauri desktop app (WIP)
└── examples/        # Sample data
```

## Roadmap

- [x] CLI with fetch/classify/generate/sync commands
- [x] Claude, OpenAI, Ollama support
- [x] Cookie-based X bookmark fetching
- [x] JSON file import
- [ ] Tauri macOS desktop app
- [ ] Incremental sync (only process new bookmarks)
- [ ] Browser extension for one-click export
- [ ] Thread unrolling
- [ ] Custom classification prompts

## License

MIT
