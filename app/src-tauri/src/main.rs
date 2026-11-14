// Sin ventana de consola en release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    mud_control_lib::run()
}
