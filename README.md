# TweetVault

Export your X (Twitter) bookmarks, auto-classify them with AI, and generate a structured [Obsidian](https://obsidian.md) knowledge base.

> Turn your bookmark graveyard into a searchable, organized knowledge vault.

[English](#features) | [中文](#功能特性)

---

## Features

- **Bookmark fetching** — Cookie-based auth (like yt-dlp) or JSON file import
- **AI classification** — Auto-categorize into topic folders with tags and summaries
- **20+ AI providers** — Claude, OpenAI, DeepSeek, Gemini, Ollama, OpenRouter, and more via [ai-selector](https://github.com/tombcato/ai-selector)
- **Obsidian vault** — Markdown files with frontmatter, backlinks, and category indexes
- **CLI first** — Scriptable, pipe-friendly commands
- **macOS desktop app** — Native Tauri GUI with system dark/light mode

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

Powered by [ai-selector](https://github.com/tombcato/ai-selector), supporting 20+ AI providers out of the box:

| Provider | Flag | Model (default) |
|----------|------|-----------------|
| Claude | `--provider claude` | claude-sonnet-4-5 |
| OpenAI | `--provider openai` | gpt-4o-mini |
| DeepSeek | `--provider deepseek` | deepseek-chat |
| Gemini | `--provider gemini` | gemini-2.0-flash |
| Ollama | `--provider ollama` | llama3.2 |
| OpenRouter | `--provider openrouter` | — |

Also supports: Moonshot (Kimi), Qwen, Zhipu (GLM), SiliconFlow, Groq, Mistral, Together AI, Fireworks, xAI (Grok), Cohere, and more.

For any OpenAI-compatible API, use `--base-url`:
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
- [x] 20+ AI providers via [ai-selector](https://github.com/tombcato/ai-selector) (Claude, OpenAI, DeepSeek, Gemini, Ollama, etc.)
- [x] Cookie-based X bookmark fetching
- [x] JSON file import
- [x] Tauri macOS desktop app
- [ ] Incremental sync (only process new bookmarks)
- [ ] Browser extension for one-click export
- [ ] Thread unrolling
- [ ] Custom classification prompts

## License

MIT

---

## 功能特性

- **书签获取** — 通过 Cookie 认证（类似 yt-dlp）或导入 JSON 文件
- **AI 智能分类** — 自动按主题归类到文件夹，生成标签和摘要
- **20+ AI 模型** — 通过 [ai-selector](https://github.com/tombcato/ai-selector) 支持 Claude、OpenAI、DeepSeek、Gemini、Ollama、OpenRouter 等 20+ 提供商
- **Obsidian 知识库** — 生成带 frontmatter、双向链接和分类索引的 Markdown 文件
- **CLI 优先** — 可脚本化、支持管道的命令行工具
- **macOS 桌面端** — 基于 Tauri 的原生 GUI，支持系统明暗模式

## 快速开始

```bash
# 克隆并安装
git clone https://github.com/kiki123124/tweetvault.git
cd tweetvault
pnpm install && pnpm build

# 一键流水线：导入 JSON → AI 分类 → 生成 Obsidian 知识库
node packages/cli/dist/index.js sync \
  --input bookmarks.json \
  --provider claude --api-key sk-ant-xxx \
  --output ./my-vault
```

## 使用方式

### 完整流水线（推荐）

```bash
tweetvault sync --input bookmarks.json --provider openai --api-key sk-xxx --output ./vault
```

### 分步执行

```bash
# 1. 获取书签（从 JSON 文件导入）
tweetvault fetch --input bookmarks.json --output bookmarks.json

# 1. 或直接从 X 抓取（需要浏览器 Cookie）
tweetvault fetch --cookie "ct0=xxx; auth_token=xxx" --limit 200

# 2. AI 分类
tweetvault classify --provider claude --api-key sk-ant-xxx

# 3. 生成 Obsidian 知识库
tweetvault generate --output ./my-vault --name "My TweetVault"
```

### AI 模型支持

通过 [ai-selector](https://github.com/tombcato/ai-selector) 开箱支持 20+ AI 提供商：

| 模型 | 参数 | 默认模型 |
|------|------|----------|
| Claude | `--provider claude` | claude-sonnet-4-5 |
| OpenAI | `--provider openai` | gpt-4o-mini |
| DeepSeek | `--provider deepseek` | deepseek-chat |
| Gemini | `--provider gemini` | gemini-2.0-flash |
| Ollama | `--provider ollama` | llama3.2 |
| OpenRouter | `--provider openrouter` | — |

还支持：Moonshot (Kimi)、通义千问、智谱 (GLM)、SiliconFlow、Groq、Mistral、Together AI、xAI (Grok) 等。

支持任何 OpenAI 兼容 API，使用 `--base-url` 指定：
```bash
tweetvault classify --provider openai --base-url https://your-api.com/v1 --api-key xxx
```

## 获取 X Cookie

1. 在浏览器中打开 [x.com](https://x.com) 并登录
2. 打开开发者工具（F12）→ 网络（Network）标签
3. 刷新页面，点击任意 x.com 的请求
4. 复制 `Cookie` 请求头的值
5. 使用 `--cookie "ct0=xxx; auth_token=xxx; ..."` 传入

## 配置文件

默认配置保存在 `~/.tweetvault/config.json`：

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
    "language": "zh"
  }
}
```

## 开发路线

- [x] CLI 命令：fetch / classify / generate / sync
- [x] 通过 ai-selector 支持 20+ AI 提供商
- [x] Cookie 方式抓取 X 书签
- [x] JSON 文件导入
- [x] Tauri macOS 桌面端
- [ ] 增量同步（只处理新书签）
- [ ] 浏览器插件一键导出
- [ ] 推文线程展开
- [ ] 自定义分类 prompt
