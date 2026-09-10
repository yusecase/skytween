use tauri_winrt_notification::{Duration, Toast};

#[tauri::command]
fn send_windows_notification(title: String, body: String) -> Result<(), String> {
    Toast::new(Toast::POWERSHELL_APP_ID)
        .title(&title)
        .text1(&body)
        .duration(Duration::Short)
        .show()
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![send_windows_notification])
        .run(tauri::generate_context!())
        .expect("error while running BskyTween");
}
