use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Deserialize)]
struct SyncConfig {
    provider: String,
    api_key: String,
    input_path: Option<String>,
    cookie: Option<String>,
    output_dir: String,
}

#[derive(Debug, Serialize)]
struct SyncResult {
    files_created: u32,
    categories: Vec<String>,
    output_dir: String,
}

#[tauri::command]
async fn sync_bookmarks(config: SyncConfig) -> Result<SyncResult, String> {
    // Build CLI args for the @tweetvault/cli sync command
    let mut args = vec!["sync".to_string()];

    if let Some(ref path) = config.input_path {
        args.push("--input".to_string());
        args.push(path.clone());
    } else if let Some(ref cookie) = config.cookie {
        args.push("--cookie".to_string());
        args.push(cookie.clone());
    } else {
        return Err("No input source provided".to_string());
    }

    args.push("--provider".to_string());
    args.push(config.provider);

    if !config.api_key.is_empty() {
        args.push("--api-key".to_string());
        args.push(config.api_key);
    }

    args.push("--output".to_string());
    args.push(config.output_dir.clone());

    // Run the CLI as a subprocess
    let output = Command::new("node")
        .arg("../../packages/cli/dist/index.js")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run CLI: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("CLI error: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse output to extract results
    let files_created = stdout
        .lines()
        .find(|l| l.contains("Generated"))
        .and_then(|l| l.split_whitespace().nth(2))
        .and_then(|n| n.parse().ok())
        .unwrap_or(0);

    let categories: Vec<String> = stdout
        .lines()
        .find(|l| l.contains("Categories:"))
        .map(|l| {
            l.split("Categories:")
                .nth(1)
                .unwrap_or("")
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        })
        .unwrap_or_default();

    Ok(SyncResult {
        files_created,
        categories,
        output_dir: config.output_dir,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![sync_bookmarks])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
