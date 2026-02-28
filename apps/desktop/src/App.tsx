import { createSignal, Show, For, createMemo } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

type Step = "home" | "config" | "running" | "done";
type Tab = "source" | "ai" | "output";

interface SyncResult {
  files_created: number;
  categories: string[];
  output_dir: string;
}

const PROVIDERS = [
  { id: "claude", name: "Claude", icon: "🟣", placeholder: "sk-ant-..." },
  { id: "openai", name: "OpenAI", icon: "🟢", placeholder: "sk-..." },
  { id: "deepseek", name: "DeepSeek", icon: "🔵", placeholder: "sk-..." },
  { id: "gemini", name: "Gemini", icon: "🔴", placeholder: "AIza..." },
  { id: "ollama", name: "Ollama", icon: "🏠", placeholder: "不需要" },
  { id: "openrouter", name: "OpenRouter", icon: "🌐", placeholder: "sk-or-..." },
];

export default function App() {
  const [step, setStep] = createSignal<Step>("home");
  const [tab, setTab] = createSignal<Tab>("source");
  const [provider, setProvider] = createSignal("claude");
  const [apiKey, setApiKey] = createSignal("");
  const [baseUrl, setBaseUrl] = createSignal("");
  const [model, setModel] = createSignal("");
  const [inputPath, setInputPath] = createSignal("");
  const [cookie, setCookie] = createSignal("");
  const [outputDir, setOutputDir] = createSignal("./tweetvault-output");
  const [vaultName, setVaultName] = createSignal("TweetVault");
  const [error, setError] = createSignal("");
  const [result, setResult] = createSignal<SyncResult | null>(null);
  const [progressText, setProgressText] = createSignal("");
  const [progressStep, setProgressStep] = createSignal(0);

  const currentProvider = createMemo(() =>
    PROVIDERS.find((p) => p.id === provider()) ?? PROVIDERS[0]
  );

  const canStart = () => {
    if (!inputPath() && !cookie()) return false;
    if (provider() !== "ollama" && !apiKey()) return false;
    return true;
  };

  const handleSync = async () => {
    setError("");
    setStep("running");
    setProgressStep(1);
    setProgressText("正在获取书签...");

    try {
      setProgressStep(2);
      setProgressText("AI 正在分类...");

      const res = await invoke<SyncResult>("sync_bookmarks", {
        config: {
          provider: provider(),
          api_key: apiKey(),
          base_url: baseUrl() || null,
          model: model() || null,
          input_path: inputPath() || null,
          cookie: cookie() || null,
          output_dir: outputDir(),
        },
      });

      setProgressStep(3);
      setProgressText("生成知识库...");

      setResult(res);
      setStep("done");
    } catch (err) {
      setError(String(err));
      setStep("config");
      setTab("source");
    }
  };

  return (
    <div class="min-h-screen select-none" style={{ background: "var(--bg)" }}>
      {/* Drag region */}
      <div
        class="h-12 flex items-center justify-center"
        data-tauri-drag-region
        style={{ background: "var(--bg-secondary)" }}
      >
        <span class="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>
          TweetVault
        </span>
      </div>

      {/* Home */}
      <Show when={step() === "home"}>
        <div class="flex flex-col items-center justify-center px-8 pt-16 pb-8">
          <div class="text-6xl mb-4">🗃️</div>
          <h1 class="text-2xl font-bold mb-2">TweetVault</h1>
          <p class="text-center text-sm mb-8 max-w-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            将你的 X 书签导出，用 AI 自动分类，<br/>
            生成结构化的 Obsidian 知识库
          </p>

          <div class="w-full max-w-xs space-y-3 mb-8">
            <FeatureItem icon="📥" text="Cookie 抓取或 JSON 导入" />
            <FeatureItem icon="🤖" text="20+ AI 模型智能分类" />
            <FeatureItem icon="📝" text="自动生成 Obsidian 知识库" />
            <FeatureItem icon="🏷️" text="标签、摘要、双向链接" />
          </div>

          <button
            class="w-full max-w-xs py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{ background: "var(--accent)", color: "#fff" }}
            onClick={() => setStep("config")}
          >
            开始使用 →
          </button>
        </div>
      </Show>

      {/* Config */}
      <Show when={step() === "config"}>
        <div class="px-6 py-4">
          {/* Tab bar */}
          <div class="flex gap-1 p-1 rounded-xl mb-5" style={{ background: "var(--bg-secondary)" }}>
            <For each={[
              { id: "source" as Tab, label: "📥 数据源" },
              { id: "ai" as Tab, label: "🤖 AI 模型" },
              { id: "output" as Tab, label: "📁 输出" },
            ]}>
              {(t) => (
                <button
                  class="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: tab() === t.id ? "var(--card)" : "transparent",
                    color: tab() === t.id ? "var(--text)" : "var(--text-secondary)",
                    "box-shadow": tab() === t.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              )}
            </For>
          </div>

          {/* Source tab */}
          <Show when={tab() === "source"}>
            <div class="space-y-4">
              <div>
                <SectionTitle>方式一：导入 JSON 文件</SectionTitle>
                <p class="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                  支持 X 原始导出格式或自定义 JSON
                </p>
                <Input
                  value={inputPath()}
                  onInput={setInputPath}
                  placeholder="/path/to/bookmarks.json"
                />
              </div>

              <div class="flex items-center gap-3">
                <div class="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span class="text-xs" style={{ color: "var(--text-secondary)" }}>或</span>
                <div class="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>

              <div>
                <SectionTitle>方式二：Cookie 直接抓取</SectionTitle>
                <p class="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                  从浏览器复制 X 的 Cookie（F12 → Network → 复制 Cookie 头）
                </p>
                <textarea
                  value={cookie()}
                  onInput={(e) => setCookie(e.currentTarget.value)}
                  placeholder="ct0=xxx; auth_token=xxx; ..."
                  class="w-full px-3 py-2.5 rounded-xl text-sm outline-none border transition-all resize-none h-20"
                  style={{
                    background: "var(--bg-secondary)",
                    color: "var(--text)",
                    "border-color": "var(--border)",
                  }}
                />
              </div>
            </div>
          </Show>

          {/* AI tab */}
          <Show when={tab() === "ai"}>
            <div class="space-y-4">
              <div>
                <SectionTitle>选择 AI 提供商</SectionTitle>
                <div class="grid grid-cols-3 gap-2">
                  <For each={PROVIDERS}>
                    {(p) => (
                      <button
                        class="py-3 px-2 rounded-xl text-xs font-medium transition-all border flex flex-col items-center gap-1 active:scale-[0.97]"
                        style={{
                          background: provider() === p.id ? "var(--accent)" : "var(--bg-secondary)",
                          color: provider() === p.id ? "#fff" : "var(--text)",
                          "border-color": provider() === p.id ? "var(--accent)" : "var(--border)",
                        }}
                        onClick={() => setProvider(p.id)}
                      >
                        <span class="text-lg">{p.icon}</span>
                        {p.name}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              <Show when={provider() !== "ollama"}>
                <div>
                  <SectionTitle>API Key</SectionTitle>
                  <Input
                    value={apiKey()}
                    onInput={setApiKey}
                    placeholder={currentProvider().placeholder}
                    type="password"
                  />
                </div>
              </Show>

              <div>
                <SectionTitle>
                  自定义模型
                  <span class="font-normal" style={{ color: "var(--text-secondary)" }}> (可选)</span>
                </SectionTitle>
                <Input
                  value={model()}
                  onInput={setModel}
                  placeholder="留空使用默认模型"
                />
              </div>

              <div>
                <SectionTitle>
                  自定义 API 地址
                  <span class="font-normal" style={{ color: "var(--text-secondary)" }}> (可选)</span>
                </SectionTitle>
                <Input
                  value={baseUrl()}
                  onInput={setBaseUrl}
                  placeholder="留空使用默认地址"
                />
                <p class="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  支持中转 API、自建服务等 OpenAI 兼容接口
                </p>
              </div>
            </div>
          </Show>

          {/* Output tab */}
          <Show when={tab() === "output"}>
            <div class="space-y-4">
              <div>
                <SectionTitle>知识库名称</SectionTitle>
                <Input
                  value={vaultName()}
                  onInput={setVaultName}
                  placeholder="TweetVault"
                />
              </div>
              <div>
                <SectionTitle>输出目录</SectionTitle>
                <Input
                  value={outputDir()}
                  onInput={setOutputDir}
                  placeholder="./tweetvault-output"
                />
              </div>
              <div
                class="p-3 rounded-xl text-xs leading-relaxed"
                style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
              >
                <p class="font-medium mb-1" style={{ color: "var(--text)" }}>📂 输出说明</p>
                <p>AI 会自动创建主题文件夹（如 Tech/、AI/、Design/）</p>
                <p>每条书签生成一个 .md 文件，包含 frontmatter、标签和摘要</p>
                <p>用 Obsidian 打开输出目录即可作为知识库使用</p>
              </div>
            </div>
          </Show>

          {/* Error */}
          <Show when={error()}>
            <div
              class="mt-4 p-3 rounded-xl text-xs"
              style={{ background: "rgba(255,59,48,0.1)", color: "#ff3b30" }}
            >
              ❌ {error()}
            </div>
          </Show>

          {/* Actions */}
          <div class="flex gap-3 mt-6">
            <button
              class="flex-1 py-3 rounded-2xl text-sm font-medium transition-all active:scale-[0.98]"
              style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
              onClick={() => setStep("home")}
            >
              ← 返回
            </button>
            <button
              class="flex-[2] py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                background: canStart() ? "var(--accent)" : "var(--border)",
                color: canStart() ? "#fff" : "var(--text-secondary)",
                cursor: canStart() ? "pointer" : "not-allowed",
              }}
              disabled={!canStart()}
              onClick={handleSync}
            >
              🚀 开始同步
            </button>
          </div>
        </div>
      </Show>

      {/* Running */}
      <Show when={step() === "running"}>
        <div class="flex flex-col items-center justify-center px-8 pt-20 pb-8">
          <div class="w-10 h-10 mb-6 border-[3px] border-t-transparent rounded-full animate-spin"
            style={{ "border-color": "var(--accent)", "border-top-color": "transparent" }}
          />

          <div class="w-full max-w-xs space-y-3 mb-8">
            <ProgressItem step={1} current={progressStep()} label="获取书签" />
            <ProgressItem step={2} current={progressStep()} label="AI 分类中" />
            <ProgressItem step={3} current={progressStep()} label="生成知识库" />
          </div>

          <p class="text-xs" style={{ color: "var(--text-secondary)" }}>
            {progressText()}
          </p>
        </div>
      </Show>

      {/* Done */}
      <Show when={step() === "done" && result()}>
        <div class="flex flex-col items-center px-8 pt-12 pb-8">
          <div class="text-5xl mb-4">🎉</div>
          <h2 class="text-xl font-bold mb-2">同步完成！</h2>
          <p class="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            知识库已生成，用 Obsidian 打开即可使用
          </p>

          <div
            class="w-full max-w-xs p-4 rounded-2xl space-y-3 mb-6"
            style={{ background: "var(--bg-secondary)" }}
          >
            <StatRow label="📄 生成文件" value={`${result()!.files_created} 个`} />
            <StatRow label="📁 分类目录" value={`${result()!.categories.length} 个`} />
            <StatRow label="📂 输出路径" value={result()!.output_dir} />
            <div>
              <p class="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>🏷️ 分类</p>
              <div class="flex flex-wrap gap-1">
                <For each={result()!.categories}>
                  {(cat) => (
                    <span
                      class="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "var(--accent)", color: "#fff", opacity: 0.85 }}
                    >
                      {cat}
                    </span>
                  )}
                </For>
              </div>
            </div>
          </div>

          <div class="w-full max-w-xs space-y-2">
            <button
              class="w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: "var(--accent)", color: "#fff" }}
              onClick={() => { setStep("config"); setResult(null); setError(""); }}
            >
              🔄 再次同步
            </button>
            <button
              class="w-full py-3 rounded-2xl text-sm font-medium transition-all active:scale-[0.98]"
              style={{ background: "var(--bg-secondary)", color: "var(--text)" }}
              onClick={() => { setStep("home"); setResult(null); setError(""); }}
            >
              🏠 返回首页
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}

// --- Components ---

function FeatureItem(props: { icon: string; text: string }) {
  return (
    <div class="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
      <span class="text-lg">{props.icon}</span>
      <span class="text-sm" style={{ color: "var(--text)" }}>{props.text}</span>
    </div>
  );
}

function SectionTitle(props: { children: any }) {
  return (
    <h3 class="text-xs font-semibold mb-2" style={{ color: "var(--text)" }}>
      {props.children}
    </h3>
  );
}

function Input(props: {
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
      class="w-full px-3 py-2.5 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:ring-offset-1"
      style={{
        background: "var(--bg-secondary)",
        color: "var(--text)",
        "border-color": "var(--border)",
        "--tw-ring-color": "var(--accent)",
      }}
    />
  );
}

function ProgressItem(props: { step: number; current: number; label: string }) {
  const isDone = () => props.current > props.step;
  const isActive = () => props.current === props.step;

  return (
    <div class="flex items-center gap-3">
      <div
        class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
        style={{
          background: isDone() ? "var(--success)" : isActive() ? "var(--accent)" : "var(--bg-secondary)",
          color: isDone() || isActive() ? "#fff" : "var(--text-secondary)",
        }}
      >
        {isDone() ? "✓" : props.step}
      </div>
      <span
        class="text-sm transition-all"
        style={{ color: isActive() ? "var(--text)" : "var(--text-secondary)" }}
      >
        {props.label}
      </span>
    </div>
  );
}

function StatRow(props: { label: string; value: string }) {
  return (
    <div class="flex justify-between items-center">
      <span class="text-xs" style={{ color: "var(--text-secondary)" }}>{props.label}</span>
      <span class="text-xs font-medium" style={{ color: "var(--text)" }}>{props.value}</span>
    </div>
  );
}
