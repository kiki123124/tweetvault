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
- 🍎 **macOS 原生** — 轻量 Tauri 打包（~10MB），非 Electron（200MB+）
- 🔌 **零依赖运行** — 桌面端内置完整 pipeline，不需要 Node.js，打开就用
- 🔄 **queryId 自动适配** — X 定期轮换 API 接口 ID，TweetVault 每次启动自动从 X 官网提取最新的，不怕失效

## 📦 桌面端安装

从 [Releases](https://github.com/kiki123124/tweetvault/releases) 下载 DMG，拖到 Applications 即可。

或者自己编译：
```bash
git clone https://github.com/kiki123124/tweetvault.git
cd tweetvault && pnpm install
cd apps/desktop && pnpm tauri build
# 产物在 src-tauri/target/release/bundle/dmg/
```

## ⚡ 快速开始（CLI）

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

## 🖥️ 桌面端架构

桌面端是**完全独立**的原生应用，不依赖 Node.js：

- **前端**（Solid.js + Tailwind）— 全部业务逻辑在浏览器里跑
- **Tauri 插件**：
  - `plugin-http` — 绕过 CORS 直接调 X API 和 AI API
  - `plugin-fs` — 创建文件夹、写 Markdown 文件到本地磁盘
  - `plugin-dialog` — 原生文件/文件夹选择器
- **queryId 自动检测** — 启动时从 X 的 main.js 提取最新 Bookmarks queryId，X 轮换也不怕
- **全局 fetch 劫持** — 用 Tauri 的 CORS-free fetch 替换 `window.fetch`，ai-selector-core 和 CookieFetcher 零修改直接工作

```
apps/desktop/
├── src/
│   ├── App.tsx              # UI（首页/指南/配置/进度/完成）
│   ├── index.tsx            # 全局 fetch 替换（CORS bypass）
│   └── lib/
│       ├── sync.ts          # 完整 pipeline：获取→分类→生成
│       └── query-id-resolver.ts  # X queryId 自动检测
├── src-tauri/
│   ├── src/lib.rs           # Rust：纯插件注册
│   └── capabilities/        # 权限配置
```

## 🏗️ 项目结构

```
tweetvault/
├── packages/core    # 核心库（CLI 用）
├── packages/cli     # 命令行工具
├── apps/desktop     # Tauri macOS 桌面端（独立运行）
└── examples/        # 示例数据
```

## 💡 为什么用 TweetVault？

你的 X 书签可能有几百上千条，全堆在一个列表里根本找不到。TweetVault 做的事很简单：

1. **AI 理解每条推文** — 不是简单的关键词匹配，而是让 AI 读懂内容，给出分类、标签和一句话摘要
2. **自动建文件夹结构** — AI/ML、Tech、Design、Productivity... 每个分类一个文件夹，带索引页
3. **Obsidian 原生格式** — frontmatter 元数据 + `[[双向链接]]` + 标签系统，直接拖进 Obsidian 就能用
4. **你的模型你做主** — 20+ AI 模型随便选，用 Ollama 本地跑完全免费，数据不出你电脑

### 🧠 知识库用法

生成的 vault 拖进 Obsidian 后你可以：

- **Graph View** 看知识图谱 — 哪些推文互相关联一目了然
- **标签聚合** — 点 `#ai` 看所有 AI 相关的收藏，跨分类
- **全文搜索** — Obsidian 的搜索比 X 原生强 100 倍
- **二次加工** — 在推文旁边写笔记、链接到你自己的文档
- **定期同步** — 每周跑一次 `tweetvault sync`，知识库持续增长

### ✨ 创新点

- **ai-selector 统一接口** — 一套代码接 20+ AI，用户换模型只需改一个参数
- **Cookie 直抓** — 像 yt-dlp 一样用浏览器 Cookie 直接调 X 内部 GraphQL API，不需要开发者账号
- **queryId 自动检测** — X 每隔几周轮换 API 的 queryId，TweetVault 每次启动自动从 X 官网提取，不会突然失效
- **批量智能分类** — 一次发多条推文给 AI，上下文更丰富分类更准，还省 token
- **Tauri 原生桌面** — 不到 10MB 的安装包（Electron 动辄 200MB+），跟随系统明暗模式
- **零依赖运行** — 桌面端通过全局 fetch 劫持 + Tauri 插件，把完整 pipeline 跑在浏览器里，不需要 Node.js

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
- 🍎 **macOS native** — Lightweight Tauri (~10MB), not Electron (200MB+)
- 🔌 **Zero dependencies** — Desktop app runs the full pipeline in-browser, no Node.js needed
- 🔄 **Auto queryId detection** — X rotates API IDs regularly, TweetVault auto-extracts the latest one on startup

### Quick Start (CLI)

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

### 💡 Why TweetVault?

Your X bookmarks are a graveyard — hundreds of saved tweets you'll never find again. TweetVault fixes this:

- **AI reads your tweets** — not keyword matching, real understanding → categories, tags, summaries
- **Auto folder structure** — AI/ML, Tech, Design… each category gets its own folder with index
- **Obsidian native** — frontmatter + `[[backlinks]]` + tags, drag into Obsidian and go
- **Your model, your choice** — 20+ providers, run Ollama locally for free, data stays on your machine
- **Batch classification** — sends multiple tweets per AI call for better context and fewer tokens
- **Auto queryId** — X rotates GraphQL IDs every few weeks; TweetVault auto-detects the latest one
- **Zero-dep desktop** — full pipeline runs in-browser via global fetch hijack + Tauri plugins, no Node.js

### Roadmap

- [x] CLI with fetch/classify/generate/sync
- [x] 20+ AI providers via ai-selector
- [x] Cookie-based bookmark fetching + JSON import
- [x] Tauri macOS desktop app
- [ ] Incremental sync
- [ ] Browser extension
- [ ] Thread unrolling
- [ ] Custom classification prompts
