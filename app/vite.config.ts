import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tauri espera un puerto fijo y no limpiar la consola.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: { target: 'chrome120', outDir: 'dist' },
})
