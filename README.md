# 🗃️ TweetVault

> 把你 X (Twitter) 的书签坟场，变成有条理的 Obsidian 知识库 ✨

一键导出 X 书签 → AI 智能分类 → 生成 [Obsidian](https://obsidian.md) 知识库，支持 20+ AI 模型。

[English](#-english) | [中文](#-功能)

---

## 🚀 功能

- 📥 **书签导入** — Cookie 一键抓取（类似 yt-dlp）或 JSON 文件导入
- 🤖 **AI 智能分类** — 自动按主题归类，生成标签和摘要
- 🧠 **20+ AI 模型** — Claude / OpenAI / DeepSeek / Gemini / Ollama / OpenRouter 等，由 [ai-selector](https://github.com/tombcato/ai-selector) 驱动
- 📝 **Obsidian 知识库** — Markdown + frontmatter + 双向链接 + 分类索引
- 💻 **CLI + 桌面端** — 命令行可脚本化，Tauri 原生桌面端支持系统明暗模式
- 🍎 **macOS 原生** — 轻量 Tauri 打包，非 Electron

## ⚡ 快速开始

```bash
git clone https://github.com/kiki123124/tweetvault.git
cd tweetvault
pnpm install && pnpm build

# 一键搞定：导入 → AI 分类 → 生成知识库
node packages/cli/dist/index.js sync \
  --input bookmarks.json \
  --provider claude --api-key sk-ant-xxx \
  --output ./my-vault
```

## 📖 使用方式

### 一键同步（推荐）

```bash
tweetvault sync --input bookmarks.json --provider openai --api-key sk-xxx --output ./vault
```

### 分步操作

```bash
# 1️⃣ 获取书签
tweetvault fetch --input bookmarks.json
# 或直接从 X 抓取
tweetvault fetch --cookie "ct0=xxx; auth_token=xxx" --limit 200

# 2️⃣ AI 分类
tweetvault classify --provider claude --api-key sk-ant-xxx

# 3️⃣ 生成 Obsidian 知识库
tweetvault generate --output ./my-vault --name "My TweetVault"
```

## 🤖 支持的 AI 模型

由 [ai-selector](https://github.com/tombcato/ai-selector) 提供统一接口，开箱支持：

| 提供商 | 参数 | 默认模型 |
|--------|------|----------|
| Claude | `--provider claude` | claude-sonnet-4-5 |
| OpenAI | `--provider openai` | gpt-4o-mini |
| DeepSeek 🇨🇳 | `--provider deepseek` | deepseek-chat |
| Gemini | `--provider gemini` | gemini-2.0-flash |
| Ollama 🏠 | `--provider ollama` | llama3.2 |
| OpenRouter | `--provider openrouter` | — |

> 还有 Moonshot (Kimi)、通义千问、智谱 GLM、SiliconFlow、Groq、Mistral、Together AI、xAI (Grok) 等 20+ 提供商

自定义 API 地址：
```bash
tweetvault classify --provider openai --base-url https://your-api.com/v1 --api-key xxx
```

## 📁 输出结构

```
my-vault/
├── 📋 _index.md              # 知识库总览
├── 🤖 AI_ML/
│   ├── _index.md              # 分类索引
│   └── liuwei_ml-789.md       # 单条书签
├── 💻 Tech/
│   ├── sarahchen_dev-123.md
│   └── alexrust_dev-456.md
├── 🎨 Design/
│   └── designdaily-102.md
└── 📈 Productivity/
    └── jamespark-101.md
```

每条书签长这样 👇

```markdown
---
title: "Tweet by @username"
author: "@username"
date: 2024-12-15
url: https://x.com/username/status/123
category: "Tech"
tags: ["ai", "open-source", "framework"]
---

> AI 生成的一句话摘要

原始推文内容...

[🔗 View on X](https://x.com/username/status/123)
```

## 🍪 获取 X Cookie

1. 打开 [x.com](https://x.com) 并登录
2. `F12` 打开开发者工具 → Network 标签
3. 刷新页面，点击任意请求
4. 复制 `Cookie` 请求头的值
5. 用 `--cookie "ct0=xxx; auth_token=xxx; ..."` 传入

## ⚙️ 配置文件

保存在 `~/.tweetvault/config.json`，省去每次输参数：

```json
{
  "ai": {
    "provider": "claude",
    "apiKey": "sk-ant-xxx"
  },
  "output": {
    "dir": "./my-vault",
    "includeMedia": true,
    "createIndex": true,
    "language": "zh"
  }
}
```

## 🏗️ 项目结构

```
tweetvault/
├── packages/core    # 核心：抓取、AI 分类、知识库生成
├── packages/cli     # 命令行工具
├── apps/desktop     # Tauri macOS 桌面端
└── examples/        # 示例数据
```

## 🗺️ Roadmap

- [x] ✅ CLI 四大命令：fetch / classify / generate / sync
- [x] ✅ 20+ AI 提供商（via ai-selector）
- [x] ✅ Cookie 抓取 X 书签
- [x] ✅ JSON 文件导入
- [x] ✅ Tauri macOS 桌面端
- [ ] 🔄 增量同步（只处理新书签）
- [ ] 🧩 浏览器插件一键导出
- [ ] 🧵 推文线程自动展开
- [ ] ✏️ 自定义分类 prompt
- [ ] 📊 书签统计面板

## 📄 License

MIT

---

## 🌏 English

### Features

- 📥 **Bookmark fetching** — Cookie auth (like yt-dlp) or JSON import
- 🤖 **AI classification** — Auto-categorize with tags and summaries
- 🧠 **20+ AI providers** — Claude, OpenAI, DeepSeek, Gemini, Ollama, OpenRouter, and more via [ai-selector](https://github.com/tombcato/ai-selector)
- 📝 **Obsidian vault** — Markdown + frontmatter + backlinks + category indexes
- 💻 **CLI + Desktop** — Scriptable CLI and native Tauri desktop app with system dark/light mode
- 🍎 **macOS native** — Lightweight Tauri, not Electron

### Quick Start

```bash
git clone https://github.com/kiki123124/tweetvault.git
cd tweetvault && pnpm install && pnpm build

node packages/cli/dist/index.js sync \
  --input bookmarks.json \
  --provider claude --api-key sk-ant-xxx \
  --output ./my-vault
```

### Supported AI Providers

| Provider | Flag | Default Model |
|----------|------|---------------|
| Claude | `--provider claude` | claude-sonnet-4-5 |
| OpenAI | `--provider openai` | gpt-4o-mini |
| DeepSeek | `--provider deepseek` | deepseek-chat |
| Gemini | `--provider gemini` | gemini-2.0-flash |
| Ollama 🏠 | `--provider ollama` | llama3.2 |
| OpenRouter | `--provider openrouter` | — |

> Also supports: Moonshot, Qwen, Zhipu, SiliconFlow, Groq, Mistral, Together AI, xAI, Cohere, and more.

### Getting Your X Cookie

1. Open [x.com](https://x.com) and log in
2. Open DevTools (`F12`) → Network tab
3. Click any request, copy the `Cookie` header value
4. Use `--cookie "ct0=xxx; auth_token=xxx"`

### Roadmap

- [x] CLI with fetch/classify/generate/sync
- [x] 20+ AI providers via ai-selector
- [x] Cookie-based bookmark fetching + JSON import
- [x] Tauri macOS desktop app
- [ ] Incremental sync
- [ ] Browser extension
- [ ] Thread unrolling
- [ ] Custom classification prompts
