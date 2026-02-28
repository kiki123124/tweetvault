import { createSignal, Show, For } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

type Step = "config" | "fetching" | "classifying" | "generating" | "done";

interface SyncResult {
  files_created: number;
  categories: string[];
  output_dir: string;
}

export default function App() {
  const [step, setStep] = createSignal<Step>("config");
  const [provider, setProvider] = createSignal("claude");
  const [apiKey, setApiKey] = createSignal("");
  const [inputPath, setInputPath] = createSignal("");
  const [cookie, setCookie] = createSignal("");
  const [outputDir, setOutputDir] = createSignal("./tweetvault-output");
  const [baseUrl, setBaseUrl] = createSignal("");
  const [model, setModel] = createSignal("");
  const [error, setError] = createSignal("");
  const [result, setResult] = createSignal<SyncResult | null>(null);
  const [progress, setProgress] = createSignal("");

  const canStart = () => {
    if (!inputPath() && !cookie()) return false;
    if (provider() !== "ollama" && !apiKey()) return false;
    return true;
  };

  const handleSync = async () => {
    setError("");
    setStep("fetching");
    setProgress("Fetching bookmarks...");

    try {
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

      setResult(res);
      setStep("done");
    } catch (err) {
      setError(String(err));
      setStep("config");
    }
  };

  return (
    <div class="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Title bar drag region */}
      <div
        class="h-8 flex items-center justify-center select-none"
        data-tauri-drag-region
        style={{ background: "var(--bg-secondary)" }}
      >
        <span class="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          TweetVault
        </span>
      </div>

      <div class="max-w-lg mx-auto px-6 py-8">
        <h1 class="text-2xl font-bold mb-1">TweetVault</h1>
        <p class="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          X Bookmarks → AI Classify → Obsidian Vault
        </p>

        <Show when={step() === "config"}>
          <div class="space-y-5">
            {/* Source */}
            <Section title="Source">
              <Input
                label="JSON File Path"
                value={inputPath()}
                onInput={setInputPath}
                placeholder="/path/to/bookmarks.json"
              />
              <div class="text-xs text-center my-2" style={{ color: "var(--text-secondary)" }}>
                — or —
              </div>
              <Input
                label="X Cookie"
                value={cookie()}
                onInput={setCookie}
                placeholder="ct0=xxx; auth_token=xxx"
                type="password"
              />
            </Section>

            {/* AI Provider */}
            <Section title="AI Provider">
              <div class="grid grid-cols-3 gap-2 mb-3">
                <For each={["claude", "openai", "deepseek", "gemini", "ollama", "openrouter"]}>
                  {(p) => (
                    <button
                      class="py-2 px-3 rounded-lg text-sm font-medium transition-all border"
                      style={{
                        background: provider() === p ? "var(--accent)" : "var(--bg-secondary)",
                        color: provider() === p ? "#fff" : "var(--text)",
                        "border-color": provider() === p ? "var(--accent)" : "var(--border)",
                      }}
                      onClick={() => setProvider(p)}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  )}
                </For>
              </div>
              <Show when={provider() !== "ollama"}>
                <Input
                  label="API Key"
                  value={apiKey()}
                  onInput={setApiKey}
                  placeholder={
                    provider() === "claude" ? "sk-ant-..." :
                    provider() === "deepseek" ? "sk-..." :
                    provider() === "gemini" ? "AIza..." :
                    "sk-..."
                  }
                  type="password"
                />
              </Show>
              <Input
                label="Custom Base URL (optional)"
                value={baseUrl()}
                onInput={setBaseUrl}
                placeholder="Leave empty for default"
              />
              <Input
                label="Model (optional)"
                value={model()}
                onInput={setModel}
                placeholder="Leave empty for default"
              />
            </Section>

            {/* Output */}
            <Section title="Output">
              <Input
                label="Vault Directory"
                value={outputDir()}
                onInput={setOutputDir}
                placeholder="./tweetvault-output"
              />
            </Section>

            {/* Error */}
            <Show when={error()}>
              <div
                class="p-3 rounded-lg text-sm"
                style={{ background: "#ff3b3020", color: "#ff3b30" }}
              >
                {error()}
              </div>
            </Show>

            {/* Start */}
            <button
              class="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: canStart() ? "var(--accent)" : "var(--border)",
                color: canStart() ? "#fff" : "var(--text-secondary)",
                cursor: canStart() ? "pointer" : "not-allowed",
              }}
              disabled={!canStart()}
              onClick={handleSync}
            >
              Start Sync
            </button>
          </div>
        </Show>

        {/* Progress */}
        <Show when={step() !== "config" && step() !== "done"}>
          <div class="flex flex-col items-center py-16 space-y-4">
            <div class="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ "border-color": "var(--accent)", "border-top-color": "transparent" }} />
            <p class="text-sm" style={{ color: "var(--text-secondary)" }}>
              {progress()}
            </p>
          </div>
        </Show>

        {/* Done */}
        <Show when={step() === "done" && result()}>
          <div class="py-8 space-y-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">✓</span>
              <h2 class="text-xl font-semibold">Done!</h2>
            </div>
            <div
              class="p-4 rounded-xl space-y-2"
              style={{ background: "var(--bg-secondary)" }}
            >
              <p class="text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Files created: </span>
                {result()!.files_created}
              </p>
              <p class="text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Output: </span>
                {result()!.output_dir}
              </p>
              <p class="text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Categories: </span>
                {result()!.categories.join(", ")}
              </p>
            </div>
            <button
              class="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "var(--accent)", color: "#fff" }}
              onClick={() => { setStep("config"); setResult(null); }}
            >
              Sync Again
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
}

function Section(props: { title: string; children: any }) {
  return (
    <div>
      <h3 class="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>
        {props.title}
      </h3>
      {props.children}
    </div>
  );
}

function Input(props: {
  label: string;
  value: string;
  onInput: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div class="mb-2">
      <label class="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
        {props.label}
      </label>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        placeholder={props.placeholder}
        class="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-all"
        style={{
          background: "var(--bg-secondary)",
          color: "var(--text)",
          "border-color": "var(--border)",
        }}
      />
    </div>
  );
}
