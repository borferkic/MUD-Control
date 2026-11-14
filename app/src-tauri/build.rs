fn main() {
    // La app cambia el registro, el firewall y los servicios: siempre se abre como administrador.
    let windows = tauri_build::WindowsAttributes::new().app_manifest(include_str!("app.manifest"));
    tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
        .expect("error al preparar la compilacion de Tauri");
}
