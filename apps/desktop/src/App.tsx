import { createSignal, Show, For, createMemo } from "solid-js";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { homeDir, join } from "@tauri-apps/api/path";
import { syncBookmarks, type SyncResult } from "./lib/sync";

type Step = "home" | "guide" | "config" | "running" | "done";

const ALL_PROVIDERS = [
  { id: "claude", name: "Claude", org: "Anthropic", placeholder: "sk-ant-..." },
  { id: "openai", name: "OpenAI", org: "OpenAI", placeholder: "sk-..." },
  { id: "deepseek", name: "DeepSeek", org: "DeepSeek", placeholder: "sk-..." },
  { id: "gemini", name: "Gemini", org: "Google", placeholder: "AIza..." },
  { id: "ollama", name: "Ollama", org: "Local", placeholder: "" },
  { id: "openrouter", name: "OpenRouter", org: "OpenRouter", placeholder: "sk-or-..." },
  { id: "moonshot", name: "Moonshot", org: "Kimi", placeholder: "sk-..." },
  { id: "qwen", name: "Qwen", org: "Alibaba", placeholder: "sk-..." },
  { id: "zhipu", name: "Zhipu GLM", org: "Zhipu AI", placeholder: "" },
  { id: "siliconflow", name: "SiliconFlow", org: "SiliconFlow", placeholder: "sk-..." },
  { id: "groq", name: "Groq", org: "Groq", placeholder: "gsk_..." },
  { id: "mistral", name: "Mistral", org: "Mistral AI", placeholder: "" },
  { id: "together", name: "Together AI", org: "Together", placeholder: "" },
  { id: "fireworks", name: "Fireworks", org: "Fireworks AI", placeholder: "" },
  { id: "xai", name: "Grok", org: "xAI", placeholder: "xai-..." },
  { id: "cohere", name: "Cohere", org: "Cohere", placeholder: "" },
  { id: "deepinfra", name: "DeepInfra", org: "DeepInfra", placeholder: "" },
  { id: "perplexity", name: "Perplexity", org: "Perplexity", placeholder: "pplx-..." },
];

export default function App() {
  const [step, setStep] = createSignal<Step>("home");
  const [provider, setProvider] = createSignal("claude");
  const [apiKey, setApiKey] = createSignal("");
  const [baseUrl, setBaseUrl] = createSignal("");
  const [model, setModel] = createSignal("");
  const [inputPath, setInputPath] = createSignal("");
  const [cookie, setCookie] = createSignal("");
  const [outputDir, setOutputDir] = createSignal("");
  const [error, setError] = createSignal("");
  const [result, setResult] = createSignal<SyncResult | null>(null);
  const [progressStep, setProgressStep] = createSignal(0);
  const [progressDetail, setProgressDetail] = createSignal("");

  // Set default output directory
  homeDir().then((home) => join(home, "tweetvault-output")).then(setOutputDir).catch(() => {});
  const [drawerOpen, setDrawerOpen] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [showAdvanced, setShowAdvanced] = createSignal(false);

  const currentProvider = createMemo(() =>
    ALL_PROVIDERS.find((p) => p.id === provider()) ?? ALL_PROVIDERS[0]
  );

  const filteredProviders = createMemo(() => {
    const q = searchQuery().toLowerCase();
    if (!q) return ALL_PROVIDERS;
    return ALL_PROVIDERS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.org.toLowerCase().includes(q)
    );
  });

  const canStart = () => {
    if (!inputPath() && !cookie()) return false;
    if (provider() !== "ollama" && !apiKey()) return false;
    return true;
  };

  const pickJsonFile = async () => {
    const selected = await openDialog({
      filters: [{ name: "JSON", extensions: ["json"] }],
      title: "选择书签 JSON 文件",
    });
    if (selected) setInputPath(selected as string);
  };

  const pickOutputDir = async () => {
    const selected = await openDialog({
      directory: true,
      title: "选择输出目录",
    });
    if (selected) setOutputDir(selected as string);
  };

  const handleSync = async () => {
    setError("");
    setStep("running");
    setProgressStep(1);
    setProgressDetail("准备中...");

    try {
      const res = await syncBookmarks(
        {
          provider: provider(),
          apiKey: apiKey(),
          baseUrl: baseUrl() || undefined,
          model: model() || undefined,
          inputPath: inputPath() || undefined,
          cookie: cookie() || undefined,
          outputDir: outputDir(),
        },
        (p) => {
          setProgressStep(p.step);
          setProgressDetail(p.detail);
        },
      );
      setResult(res);
      setStep("done");
    } catch (err) {
      setError(String(err));
      setStep("config");
    }
  };

  return (
    <div class="min-h-screen select-none" style={{ background: "var(--bg)" }}>
      {/* Title bar */}
      <div class="h-12 flex items-center justify-center" data-tauri-drag-region
        style={{ background: "var(--bg)" }}>
        <span class="text-[10px] font-medium tracking-[0.2em] uppercase"
          style={{ color: "var(--text-tertiary)" }}>
          TweetVault
        </span>
      </div>

      {/* === HOME === */}
      <Show when={step() === "home"}>
        <div class="animate-fade-in flex flex-col items-center px-10 pt-12 pb-8">
          <p class="text-[13px] tracking-wide uppercase mb-3"
            style={{ color: "var(--text-tertiary)" }}>
            bookmark organizer
          </p>
          <h1 class="text-[28px] font-semibold mb-3 tracking-tight">TweetVault</h1>
          <p class="text-[14px] text-center mb-10 max-w-[280px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}>
            X 书签导出，AI 智能分类，
            生成 Obsidian 知识库
          </p>

          <div class="w-full max-w-xs space-y-2.5 mb-10">
            <For each={[
              ["导入书签", "Cookie 抓取或 JSON 文件导入"],
              ["AI 分类", "20+ 模型自动按主题归类和打标签"],
              ["知识库生成", "Obsidian Markdown，带索引和双向链接"],
            ]}>
              {([title, desc]) => (
                <div class="flex items-start gap-3.5 px-4 py-3 rounded-2xl"
                  style={{ background: "var(--bg-secondary)" }}>
                  <div class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: "var(--accent)" }} />
                  <div>
                    <p class="text-[13px] font-medium">{title}</p>
                    <p class="text-[12px]" style={{ color: "var(--text-secondary)" }}>{desc}</p>
                  </div>
                </div>
              )}
            </For>
          </div>

          <div class="w-full max-w-xs space-y-2.5">
            <button
              class="w-full py-3.5 rounded-2xl text-[14px] font-medium transition-all active:scale-[0.98]"
              style={{ background: "var(--accent)", color: "#fff" }}
              onClick={() => setStep("config")}
            >
              开始配置
            </button>
            <button
              class="w-full py-3 rounded-2xl text-[13px] transition-all active:scale-[0.98]"
              style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
              onClick={() => setStep("guide")}
            >
              使用指南
            </button>
          </div>
        </div>
      </Show>

      {/* === GUIDE === */}
      <Show when={step() === "guide"}>
        <div class="animate-fade-in px-7 py-3 pb-6 overflow-y-auto" style={{ "max-height": "calc(100vh - 48px)" }}>
          <SectionLabel>工作流程</SectionLabel>
          <Card>
            <div class="space-y-4">
              <For each={[
                { num: "1", title: "准备书签数据", desc: "两种方式任选其一：" , details: [
                  "方式 A：从浏览器复制 X 的 Cookie（F12 → Network → 复制 Cookie 请求头）",
                  "方式 B：用其他工具导出书签为 JSON 文件，然后导入",
                ]},
                { num: "2", title: "选择 AI 模型", desc: "配置用于分类的 AI 提供商：", details: [
                  "支持 Claude、OpenAI、DeepSeek、Gemini 等 20+ 提供商",
                  "也支持 Ollama 本地模型，完全离线运行",
                  "兼容任何 OpenAI 格式的 API（中转站、自建服务等）",
                ]},
                { num: "3", title: "一键同步", desc: "点击同步后自动完成：", details: [
                  "获取并解析你的书签数据",
                  "AI 分析每条书签的内容，自动归类并打标签",
                  "按分类创建文件夹，每条书签生成一个 .md 文件",
                ]},
                { num: "4", title: "打开知识库", desc: "用 Obsidian 打开输出目录：", details: [
                  "每个分类是一个文件夹（如 Tech/、AI/、Design/）",
                  "文件包含原文、AI 摘要、标签和元数据",
                  "支持 Obsidian 的双向链接、图谱视图和全文搜索",
                ]},
              ]}>
                {(item) => (
                  <div class="flex gap-3.5">
                    <div class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                      {item.num}
                    </div>
                    <div class="flex-1">
                      <p class="text-[13px] font-medium mb-0.5">{item.title}</p>
                      <p class="text-[11px] mb-1.5" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                      <For each={item.details}>
                        {(d) => (
                          <p class="text-[11px] leading-relaxed pl-2 border-l-2 mb-1"
                            style={{ color: "var(--text-secondary)", "border-color": "var(--border)" }}>
                            {d}
                          </p>
                        )}
                      </For>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Card>

          <SectionLabel>生成的文件格式</SectionLabel>
          <Card>
            <pre class="text-[11px] leading-relaxed overflow-x-auto" style={{ color: "var(--text-secondary)" }}>
{`---
title: "Tweet by @username"
author: "@username"
date: 2024-12-15
url: https://x.com/...
category: "Tech"
tags: ["ai", "llm"]
---

> AI 生成的一句话摘要

原始推文内容...

[View on X](https://x.com/...)`}
            </pre>
          </Card>

          <SectionLabel>知识库结构</SectionLabel>
          <Card>
            <pre class="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
{`my-vault/
├── _index.md       ← 总览
├── Tech/
│   ├── _index.md   ← 分类索引
│   └── user-123.md
├── AI_ML/
│   └── user-456.md
└── Design/
    └── user-789.md`}
            </pre>
          </Card>

          <SectionLabel>小贴士</SectionLabel>
          <Card>
            <div class="space-y-2.5 text-[12px]" style={{ color: "var(--text-secondary)" }}>
              <p>• Cookie 有效期有限，过期后需要重新获取</p>
              <p>• 书签较多时建议使用 DeepSeek 或 GPT-4o-mini，性价比高</p>
              <p>• Ollama 完全免费离线运行，但分类质量依赖本地模型能力</p>
              <p>• 自定义 API 地址可接入中转站，解决网络问题</p>
              <p>• 多次同步同一目录不会覆盖，会追加新文件</p>
            </div>
          </Card>

          <button
            class="w-full mt-5 py-3.5 rounded-2xl text-[14px] font-medium transition-all active:scale-[0.98]"
            style={{ background: "var(--accent)", color: "#fff" }}
            onClick={() => setStep("config")}
          >
            开始配置
          </button>
          <button
            class="w-full mt-2 py-3 rounded-2xl text-[13px] transition-all active:scale-[0.98]"
            style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
            onClick={() => setStep("home")}
          >
            返回
          </button>
        </div>
      </Show>

      {/* === CONFIG === */}
      <Show when={step() === "config"}>
        <div class="animate-fade-in px-7 py-3 pb-6 overflow-y-auto" style={{ "max-height": "calc(100vh - 48px)" }}>

          {/* Source section */}
          <SectionLabel>数据源</SectionLabel>
          <Card>
            <FieldLabel>JSON 文件路径</FieldLabel>
            <div class="flex gap-2">
              <div class="flex-1">
                <Field
                  value={inputPath()} onInput={setInputPath}
                  placeholder="选择文件或输入路径"
                />
              </div>
              <button
                class="px-3 rounded-xl text-[12px] border transition-all active:scale-[0.98]"
                style={{ background: "var(--bg)", color: "var(--text-secondary)", "border-color": "var(--border)" }}
                onClick={pickJsonFile}
              >
                选择
              </button>
            </div>
            <div class="flex items-center gap-3 my-3">
              <div class="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span class="text-[11px]" style={{ color: "var(--text-tertiary)" }}>或</span>
              <div class="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>
            <FieldLabel>X Cookie</FieldLabel>
            <textarea
              value={cookie()}
              onInput={(e) => setCookie(e.currentTarget.value)}
              placeholder="从浏览器 DevTools 复制 Cookie"
              class="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none border transition-all resize-none h-16"
              style={{
                background: "var(--bg)",
                color: "var(--text)",
                "border-color": "var(--border)",
              }}
            />
            <p class="text-[11px] mt-1.5" style={{ color: "var(--text-tertiary)" }}>
              F12 → Network → 点击请求 → 复制 Cookie 头
            </p>
          </Card>

          {/* AI Provider section */}
          <SectionLabel>AI 模型</SectionLabel>
          <Card>
            <FieldLabel>提供商</FieldLabel>
            <button
              class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] border transition-all"
              style={{
                background: "var(--bg)",
                color: "var(--text)",
                "border-color": "var(--border)",
              }}
              onClick={() => setDrawerOpen(true)}
            >
              <span class="flex items-center gap-2">
                <span class="font-medium">{currentProvider().name}</span>
                <span class="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {currentProvider().org}
                </span>
              </span>
              <span style={{ color: "var(--text-tertiary)" }}>▾</span>
            </button>

            <Show when={provider() !== "ollama"}>
              <FieldLabel class="mt-3">API Key</FieldLabel>
              <Field
                value={apiKey()} onInput={setApiKey}
                placeholder={currentProvider().placeholder}
                type="password"
              />
            </Show>

            <button
              class="flex items-center gap-1.5 mt-3 text-[12px] transition-all"
              style={{ color: "var(--text-tertiary)" }}
              onClick={() => setShowAdvanced(!showAdvanced())}
            >
              <span style={{ transform: showAdvanced() ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>▸</span>
              高级选项
            </button>

            <Show when={showAdvanced()}>
              <div class="mt-2 space-y-2 animate-fade-in">
                <FieldLabel>自定义模型</FieldLabel>
                <Field
                  value={model()} onInput={setModel}
                  placeholder="留空使用默认"
                />
                <FieldLabel>自定义 API 地址</FieldLabel>
                <Field
                  value={baseUrl()} onInput={setBaseUrl}
                  placeholder="留空使用默认"
                />
              </div>
            </Show>
          </Card>

          {/* Output section */}
          <SectionLabel>输出</SectionLabel>
          <Card>
            <FieldLabel>输出目录</FieldLabel>
            <div class="flex gap-2">
              <div class="flex-1">
                <Field
                  value={outputDir()} onInput={setOutputDir}
                  placeholder="~/tweetvault-output"
                />
              </div>
              <button
                class="px-3 rounded-xl text-[12px] border transition-all active:scale-[0.98]"
                style={{ background: "var(--bg)", color: "var(--text-secondary)", "border-color": "var(--border)" }}
                onClick={pickOutputDir}
              >
                选择
              </button>
            </div>
            <p class="text-[11px] mt-2 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              AI 会自动创建分类文件夹，每条书签生成一个 .md 文件。
              完成后用 Obsidian 打开此目录即可。
            </p>
          </Card>

          {/* Error */}
          <Show when={error()}>
            <div class="mt-3 px-4 py-3 rounded-2xl text-[12px] animate-fade-in"
              style={{ background: "var(--error-soft)", color: "var(--error)" }}>
              {error()}
            </div>
          </Show>

          {/* Actions */}
          <div class="flex gap-2.5 mt-5">
            <button
              class="py-3 px-5 rounded-2xl text-[13px] transition-all active:scale-[0.98]"
              style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
              onClick={() => setStep("home")}
            >
              返回
            </button>
            <button
              class="flex-1 py-3 rounded-2xl text-[13px] font-medium transition-all active:scale-[0.98]"
              style={{
                background: canStart() ? "var(--accent)" : "var(--bg-tertiary)",
                color: canStart() ? "#fff" : "var(--text-tertiary)",
                cursor: canStart() ? "pointer" : "not-allowed",
              }}
              disabled={!canStart()}
              onClick={handleSync}
            >
              开始同步
            </button>
          </div>
        </div>
      </Show>

      {/* === RUNNING === */}
      <Show when={step() === "running"}>
        <div class="animate-fade-in flex flex-col items-center justify-center px-10 pt-24 pb-8">
          <div class="w-8 h-8 mb-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ "border-color": "var(--accent)", "border-top-color": "transparent" }} />

          <div class="w-full max-w-xs space-y-4">
            <For each={[
              { s: 1, label: "获取书签", sub: "读取数据源" },
              { s: 2, label: "AI 分类", sub: "分析内容并归类" },
              { s: 3, label: "生成知识库", sub: "创建 Markdown 文件" },
            ]}>
              {(item) => {
                const done = () => progressStep() > item.s;
                const active = () => progressStep() === item.s;
                return (
                  <div class="flex items-center gap-4">
                    <div
                      class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 transition-all"
                      style={{
                        background: done() ? "var(--success)" : active() ? "var(--accent)" : "var(--bg-secondary)",
                        color: done() || active() ? "#fff" : "var(--text-tertiary)",
                      }}
                    >
                      {done() ? "✓" : item.s}
                    </div>
                    <div>
                      <p class="text-[13px] font-medium" style={{ color: active() ? "var(--text)" : "var(--text-secondary)" }}>
                        {item.label}
                      </p>
                      <Show when={active()}>
                        <p class="text-[11px] animate-pulse" style={{ color: "var(--text-tertiary)" }}>
                          {progressDetail() || item.sub}
                        </p>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      {/* === DONE === */}
      <Show when={step() === "done" && result()}>
        <div class="animate-fade-in flex flex-col items-center px-10 pt-14 pb-8">
          <div class="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ background: "var(--success-soft)" }}>
            <span class="text-xl" style={{ color: "var(--success)" }}>✓</span>
          </div>
          <h2 class="text-[20px] font-semibold mb-1">同步完成</h2>
          <p class="text-[13px] mb-6" style={{ color: "var(--text-secondary)" }}>
            用 Obsidian 打开输出目录即可使用
          </p>

          <Card class="w-full max-w-xs">
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-[12px]" style={{ color: "var(--text-secondary)" }}>书签数</span>
                <span class="text-[12px] font-medium">{result()!.bookmarkCount}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[12px]" style={{ color: "var(--text-secondary)" }}>文件数</span>
                <span class="text-[12px] font-medium">{result()!.filesCreated}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[12px]" style={{ color: "var(--text-secondary)" }}>分类数</span>
                <span class="text-[12px] font-medium">{result()!.categories.length}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[12px]" style={{ color: "var(--text-secondary)" }}>路径</span>
                <span class="text-[12px] font-medium truncate max-w-[180px]">{result()!.outputDir}</span>
              </div>
              <div class="pt-2 border-t" style={{ "border-color": "var(--border)" }}>
                <p class="text-[11px] mb-1.5" style={{ color: "var(--text-tertiary)" }}>分类</p>
                <div class="flex flex-wrap gap-1.5">
                  <For each={result()!.categories}>
                    {(cat) => (
                      <span class="text-[11px] px-2.5 py-0.5 rounded-full"
                        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                        {cat}
                      </span>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </Card>

          <div class="w-full max-w-xs mt-5 space-y-2">
            <button
              class="w-full py-3 rounded-2xl text-[13px] font-medium transition-all active:scale-[0.98]"
              style={{ background: "var(--accent)", color: "#fff" }}
              onClick={() => { setStep("config"); setResult(null); setError(""); }}
            >
              再次同步
            </button>
            <button
              class="w-full py-3 rounded-2xl text-[13px] transition-all active:scale-[0.98]"
              style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
              onClick={() => { setStep("home"); setResult(null); setError(""); }}
            >
              返回首页
            </button>
          </div>
        </div>
      </Show>

      {/* === PROVIDER DRAWER === */}
      <Show when={drawerOpen()}>
        <div class="fixed inset-0 z-50" style={{ background: "var(--overlay)" }}
          onClick={() => setDrawerOpen(false)}>
          <div
            class="absolute bottom-0 left-0 right-0 rounded-t-3xl animate-slide-up"
            style={{ background: "var(--bg)", "max-height": "70vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer handle */}
            <div class="flex justify-center pt-3 pb-2">
              <div class="w-8 h-1 rounded-full" style={{ background: "var(--border)" }} />
            </div>

            <div class="px-6 pb-2">
              <h3 class="text-[15px] font-semibold mb-3">选择 AI 提供商</h3>
              <input
                type="text"
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
                placeholder="搜索..."
                class="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none border mb-2"
                style={{
                  background: "var(--bg-secondary)",
                  color: "var(--text)",
                  "border-color": "var(--border)",
                }}
              />
            </div>

            <div class="overflow-y-auto px-6 pb-6" style={{ "max-height": "calc(70vh - 110px)" }}>
              <div class="space-y-1">
                <For each={filteredProviders()}>
                  {(p) => (
                    <button
                      class="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all active:scale-[0.98]"
                      style={{
                        background: provider() === p.id ? "var(--accent-soft)" : "transparent",
                      }}
                      onClick={() => { setProvider(p.id); setDrawerOpen(false); setSearchQuery(""); }}
                    >
                      <div>
                        <p class="text-[13px] font-medium" style={{
                          color: provider() === p.id ? "var(--accent)" : "var(--text)"
                        }}>
                          {p.name}
                        </p>
                        <p class="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                          {p.org}
                        </p>
                      </div>
                      <Show when={provider() === p.id}>
                        <span class="text-[13px]" style={{ color: "var(--accent)" }}>✓</span>
                      </Show>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}

// --- Components ---

function SectionLabel(props: { children: any }) {
  return (
    <p class="text-[11px] font-medium tracking-wide uppercase mt-5 mb-2 px-1"
      style={{ color: "var(--text-tertiary)" }}>
      {props.children}
    </p>
  );
}

function Card(props: { children: any; class?: string }) {
  return (
    <div class={`p-4 rounded-2xl ${props.class ?? ""}`}
      style={{ background: "var(--card)", "box-shadow": "var(--card-shadow)" }}>
      {props.children}
    </div>
  );
}

function FieldLabel(props: { children: any; class?: string }) {
  return (
    <label class={`block text-[12px] font-medium mb-1.5 ${props.class ?? ""}`}
      style={{ color: "var(--text-secondary)" }}>
      {props.children}
    </label>
  );
}

function Field(props: {
  value: string;
  onInput: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={props.type ?? "text"}
      value={props.value}
      onInput={(e) => props.onInput(e.currentTarget.value)}
      placeholder={props.placeholder}
      class="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none border transition-all"
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        "border-color": "var(--border)",
      }}
    />
  );
}
