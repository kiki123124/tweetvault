import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { render } from "solid-js/web";
import App from "./App";
import "./styles.css";

// Override global fetch with Tauri's CORS-free version for external requests.
// This makes CookieFetcher and ai-selector-core work without modifications.
const originalFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input instanceof Request
          ? input.url
          : "";
  // Keep original fetch for local dev server and relative paths
  if (url.startsWith("http://localhost") || url.startsWith("/") || url === "") {
    return originalFetch(input, init);
  }
  // Use Tauri fetch for all external requests (bypasses CORS)
  return tauriFetch(input as any, init as any);
}) as typeof window.fetch;

render(() => <App />, document.getElementById("root")!);
