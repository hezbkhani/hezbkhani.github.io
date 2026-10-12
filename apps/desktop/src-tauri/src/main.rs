// نسخه ویندوز و مک: یک پنجره که خود سایت را باز می‌کند، پس همیشه با سایت یکی است.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running the app");
}
