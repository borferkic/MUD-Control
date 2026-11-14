//! MUD Control: puente entre la interfaz y `resources/backend.ps1`.
//!
//! Toda la logica vive en PowerShell (se puede probar sin compilar). Rust solo:
//!  - ejecuta el script con la accion pedida, sin ventana de consola,
//!  - reenvia las lineas `STEP:<paso>` como evento `fix-step`,
//!  - devuelve el JSON de la ultima linea (`{"ok":true,"data":...}`).

use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};

use serde_json::Value;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WindowEvent};

#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

fn script_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    // resource_dir() devuelve rutas "\\?\D:\..." que powershell -File no acepta.
    let dir = match dir.to_str().and_then(|s| s.strip_prefix(r"\\?\")) {
        Some(s) => PathBuf::from(s),
        None => dir,
    };
    let p = dir.join("resources").join("backend.ps1");
    if p.exists() {
        Ok(p)
    } else {
        Err(format!("No se encontro {}", p.display()))
    }
}

fn run_backend(app: &AppHandle, action: &str, args: &Value) -> Result<Value, String> {
    let script = script_path(app)?;
    app_log(&format!("[{action}] {}", script.display()));
    let mut cmd = Command::new("powershell.exe");
    cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File"])
        .arg(&script)
        .args(["-Action", action])
        .env("MUD_ARGS", args.to_string())
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let mut child = cmd.spawn().map_err(|e| format!("No se pudo ejecutar PowerShell: {e}"))?;
    let stdout = child.stdout.take().ok_or("Sin salida de PowerShell")?;

    let mut last_json: Option<String> = None;
    for line in BufReader::new(stdout).split(b'\n') {
        let line = line.map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&line);
        let text = text.trim_start_matches('\u{feff}').trim();
        if let Some(step) = text.strip_prefix("STEP:") {
            let _ = app.emit("fix-step", step.to_string());
        } else if text.starts_with('{') {
            last_json = Some(text.to_string());
        }
    }
    let mut err = String::new();
    if let Some(mut e) = child.stderr.take() {
        use std::io::Read;
        let _ = e.read_to_string(&mut err);
    }
    let _ = child.wait();

    let raw = last_json.ok_or_else(|| format!("La accion {action} no devolvio respuesta. {}", err.trim()))?;
    let v: Value = serde_json::from_str(&raw).map_err(|e| format!("Respuesta no valida: {e}"))?;
    if v.get("ok").and_then(Value::as_bool) == Some(true) {
        Ok(v.get("data").cloned().unwrap_or(Value::Null))
    } else {
        Err(v
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("Error desconocido")
            .to_string())
    }
}

/// Registro tecnico de la app en %ProgramData%\MUD Control\app.log.
fn app_log(msg: &str) {
    use std::io::Write;
    let dir = PathBuf::from(std::env::var("ProgramData").unwrap_or_else(|_| "C:\\ProgramData".into())).join("MUD Control");
    let _ = std::fs::create_dir_all(&dir);
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(dir.join("app.log")) {
        let secs = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let _ = writeln!(f, "{secs} {msg}");
    }
}

/// Unico comando expuesto a la interfaz: `invoke('backend', { action, args })`.
#[tauri::command]
async fn backend(app: AppHandle, action: String, args: Value) -> Result<Value, String> {
    let name = action.clone();
    let r = tauri::async_runtime::spawn_blocking(move || run_backend(&app, &action, &args))
        .await
        .map_err(|e| e.to_string())?;
    if let Err(e) = &r {
        app_log(&format!("[{name}] ERROR {e}"));
    }
    r
}

// ------------------------------------------------------------------ bandeja
struct TrayItems {
    open: MenuItem<tauri::Wry>,
    fix: MenuItem<tauri::Wry>,
    quit: MenuItem<tauri::Wry>,
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// La interfaz traduce el menu de la bandeja cuando cambia el idioma.
#[tauri::command]
fn tray_labels(items: tauri::State<'_, TrayItems>, tooltip: String, open: String, fix: String, quit: String, app: AppHandle) {
    let _ = items.open.set_text(open);
    let _ = items.fix.set_text(fix);
    let _ = items.quit.set_text(quit);
    if let Some(t) = app.tray_by_id("main") {
        let _ = t.set_tooltip(Some(tooltip));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    app_log("inicio de MUD Control");
    // --tray: arranque con Windows, sin mostrar la ventana.
    let hidden = std::env::args().any(|a| a == "--tray");
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![backend, tray_labels])
        .setup(move |app| {
            let open = MenuItem::with_id(app, "open", "Abrir MUD Control", true, None::<&str>)?;
            let fix = MenuItem::with_id(app, "fix", "Arreglar ahora", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&open, &fix, &sep, &quit])?;
            let mut tray = TrayIconBuilder::with_id("main")
                .tooltip("MUD Control")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, e| match e.id.as_ref() {
                    "open" => show_main(app),
                    "fix" => {
                        show_main(app);
                        let _ = app.emit("tray-fix", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, e| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                        show_main(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            app.manage(TrayItems { open, fix, quit });
            if !hidden {
                show_main(app.handle());
            }
            Ok(())
        })
        // Cerrar (X) esconde la ventana en la bandeja; para salir se usa "Salir".
        .on_window_event(|w, e| {
            if let WindowEvent::CloseRequested { api, .. } = e {
                let _ = w.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar MUD Control");
}
