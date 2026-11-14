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
use tauri::{AppHandle, Emitter, Manager};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    app_log("inicio de MUD Control");
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![backend])
        .run(tauri::generate_context!())
        .expect("error al iniciar MUD Control");
}
