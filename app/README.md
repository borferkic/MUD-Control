# MUD Control: app de escritorio

Tauri 2 + React 19 + Radix Primitives + Tailwind 4. La lógica está en
[`src-tauri/resources/backend.ps1`](src-tauri/resources/backend.ps1); Rust solo hace de puente.
Cómo funciona por dentro: [../docs/como-funciona.md](../docs/como-funciona.md).

## Requisitos para compilar

- Node.js 22 o superior
- Rust estable (`winget install Rustlang.Rustup`)
- Herramientas de C++ de Visual Studio 2022:

  ```bash
  winget install Microsoft.VisualStudio.2022.BuildTools --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
  ```

## Comandos

```bash
npm install
```

```bash
npm run dev
```

Abre la interfaz en el navegador (`http://localhost:1420`) con datos de ejemplo, sin tocar Windows.
Para ver vistas concretas: `?problema`, `?actividad`, `?tab=conectados`, `?tab=ajustes&especialistas`.

```bash
npm run tauri build
```

Genera `src-tauri/target/release/bundle/nsis/MUD Control_<versión>_x64-setup.exe`. Antes ejecuta
`scripts/prepare-resources.mjs`, que copia en `src-tauri/resources` los scripts de `mud/`, el kit
con `payload.zip` y `res/rdpwrap.ini`, para que la app funcione sin Internet.

## Estructura

| Ruta | Contenido |
|---|---|
| `src/App.tsx` | Ventana, pestañas y botón Actividad. |
| `src/screens/` | Inicio, Conectados, Accesos, Ajustes, Opciones para especialistas, Actividad. |
| `src/components/ui.tsx` | Botón, interruptor, filas y diálogos sobre Radix. |
| `src/lib/backend.ts` | Llamadas al backend y diálogos de archivo; en el navegador usa `mock.ts`. |
| `src/index.css` | Paleta Synthwave '84 (oscuro y claro) y estilos base. |
| `src-tauri/src/lib.rs` | Puente: ejecuta `backend.ps1` y reenvía el progreso. |
| `src-tauri/resources/backend.ps1` | Acciones: estado, sesiones, accesos, copias, perfiles, reparación. |
