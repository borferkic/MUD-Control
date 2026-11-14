# Cómo funciona MUD Control

Esta guía explica qué hace cada parte de la app, qué cambia en Windows y cómo trabaja por dentro.

## El problema que resuelve

Windows 11 Pro solo permite **una** sesión de Escritorio remoto. RDP Wrapper modifica en memoria
el servicio `TermService` para permitir varias. Para hacerlo necesita saber **dónde parchear**
la `termsrv.dll` exacta del equipo, y esos datos están en `rdpwrap.ini`, una sección por versión.

Cada actualización acumulativa de Windows puede traer una `termsrv.dll` nueva. Si `rdpwrap.ini` no
tiene su sección, RDP Wrapper carga pero no parchea nada y el equipo vuelve a admitir una sola
persona. Es lo que pasó el 11/11/2026 con la versión `10.0.26100.9818`.

MUD Control detecta esa situación, la explica en lenguaje sencillo y la arregla.

## Pantallas

### Inicio

Muestra una sola frase con el estado:

- **Todo funciona bien**: cuántas personas están conectadas y cuántas pueden entrar a la vez.
- **Ahora solo puede entrar una persona**: Windows cambió `termsrv.dll`. Aparece **Arreglar ahora**.
- **MUD Control aún no está instalado**: falta instalar RDP Wrapper (lo hace un especialista).

Debajo, seis accesos rápidos: Conectados, Accesos, Avisar a todos, Copias de seguridad,
Actualizaciones de Windows y Pedir ayuda.

#### Arreglar ahora

Los pasos que se ven en pantalla son los reales:

1. **Revisando el equipo**: comprueba que RDP Wrapper esté instalado y lee la versión real de
   `termsrv.dll` (no la cadena *FileVersion*, que no se actualiza).
2. **Buscando la solución**: mira si los datos que trae la app sirven para esa versión.
3. **Guardando una copia de seguridad** de la configuración actual.
4. **Aplicando la solución**: copia los datos de la app si hacen falta y ejecuta
   `fix-rdpwrap.bat`, que busca en Internet solo si la versión es más nueva, fija una sesión por
   usuario y reinicia el servicio.
5. **Comprobando que funciona**: servicio en marcha, puerto escuchando y sección presente en el INI.

Si todavía nadie publicó datos para una versión nueva de Windows, la app lo dice y la tarea
`RDPWrap-AutoFix` vuelve a intentarlo al iniciar Windows y cada día a las 7:00.

### Conectados

Lista las sesiones abiertas (API de Windows `WTSEnumerateSessions`), con el equipo desde el que
se conectan y desde cuándo. Permite enviar un mensaje a una persona o a todas (`msg.exe`),
desconectar a alguien o cerrar una sesión que quedó abierta (`logoff`). Desconectar siempre
pide confirmación.

### Accesos

Muestra las cuentas del grupo **Usuarios de escritorio remoto** (SID `S-1-5-32-555`, igual en
cualquier idioma de Windows). **Dar acceso** añade una cuenta local existente al grupo;
**Quitar acceso** la saca, sin borrar la cuenta ni sus archivos.

### Ajustes

- **Arreglar solo cuando Windows se actualice**: activa o desactiva la tarea `RDPWrap-AutoFix`.
- **Avisarme si algo deja de funcionar**.
- **Pausar actualizaciones de Windows hasta** una fecha: usa `bloquear-actualizaciones.bat`, que
  pausa Windows Update, fija la versión instalada (para que no salte a la siguiente versión anual)
  y evita reinicios con personas conectadas. Dejar la fecha vacía reanuda las actualizaciones.
- **Actualizar MUD Control automáticamente**.
- **Pedir ayuda**: crea en el escritorio un `.zip` con el estado, los registros y el INI, para
  enviarlo a soporte.

#### Copias de seguridad

Antes de **cada** cambio la app guarda una copia en `C:\ProgramData\MUD Control\backups`:

- `rdpwrap.ini`
- el registro de Escritorio remoto (`Terminal Server`) y sus directivas
- el perfil completo: puerto, sesiones, NLA, firewall, cuentas con acceso

Se conservan las últimas 20. **Volver a esta** restaura una copia (antes guarda otra del estado
actual, por si quieres deshacerlo). **Guardar en USB** copia la última a la carpeta que elijas.

**Exportar configuración** guarda el perfil en un `.json` sin contraseñas, y
**Importar configuración** lo aplica en otro equipo. Si el archivo nombra cuentas que no existen
en ese equipo, la app lo avisa.

### Actividad

El botón **Actividad** se ilumina y abre el historial, en frases como *"Se dio acceso a Ana
Torres"* o *"Windows se actualizó: solo podía entrar una persona"*. Se guarda en
`C:\ProgramData\MUD Control\activity.jsonl`.

### Opciones para especialistas

Al final de Ajustes, cerradas por defecto:

| Grupo | Qué hay |
|---|---|
| 1. Estado del sistema | Versión de `termsrv.dll`, si el INI la soporta, versión de Windows, servicio, RDP Wrapper y perfil activo. |
| 2. Conexión y seguridad | Puerto, máximo de sesiones, NLA, firewall por tipo de red y ver sesiones con permiso. |
| 3. Perfiles de cliente | Aplicar un perfil o crear uno desde este equipo. |
| 4. Reparación avanzada | Actualizar los datos de Windows, generar offsets con RDPWrapOffsetFinder, reparar Windows Update. |
| 5. Diagnóstico | Abrir la carpeta de registros y exportar el informe. |
| 6. Instalación | Reinstalar o desinstalar RDP Wrapper. |

## Qué cambia en Windows

| Dónde | Valor | Por qué |
|---|---|---|
| `HKLM\...\Terminal Server` | `fDenyTSConnections = 0` | Habilita Escritorio remoto. |
| `HKLM\...\Terminal Server` y directiva | `fSingleSessionPerUser = 1` | **Siempre** una sesión por cuenta. No es configurable. |
| Directiva `Terminal Services` | `MaxInstanceCount` | Máximo de sesiones a la vez (20 por defecto). |
| `WinStations\RDP-Tcp` | `PortNumber`, `UserAuthentication`, `SecurityLayer` | Puerto y NLA. |
| Firewall | Reglas `RDP Wrapper TCP/UDP` | Solo en redes de dominio y privadas, salvo que se elija lo contrario. |
| Tareas programadas | `RDPWrap-AutoFix` | Reparación al iniciar y cada día a las 7:00. |
| `C:\Program Files\RDP Wrapper` | `rdpwrap.dll`, `rdpwrap.ini`, scripts | RDP Wrapper y sus datos. |
| `C:\ProgramData\MUD Control` | ajustes, actividad, copias, perfiles, registros | Datos de la app. |

## Por dentro

```
┌──────────────────────────┐   invoke('backend')   ┌────────────────────┐   powershell -File   ┌──────────────────────┐
│ Interfaz (React + Radix) │ ────────────────────▶ │ Puente Tauri (Rust)│ ───────────────────▶ │ backend.ps1          │
│ app/src                  │ ◀──── JSON / eventos ─ │ app/src-tauri/src  │ ◀── STEP:… y JSON ─── │ + mud/scripts/*.bat  │
└──────────────────────────┘                        └────────────────────┘                       └──────────────────────┘
```

- **Interfaz**: React con componentes de [Radix Primitives](https://www.radix-ui.com/primitives)
  (pestañas, interruptores, diálogos) y estilos de Tailwind. Sin fuentes ni recursos de Internet.
- **Puente Rust**: un único comando, `backend(action, args)`. Ejecuta PowerShell sin ventana,
  pasa los argumentos por la variable `MUD_ARGS`, reenvía las líneas `STEP:<paso>` como evento
  `fix-step` y devuelve el JSON de la última línea.
- **backend.ps1**: toda la lógica. Se puede probar sin compilar nada:

  ```powershell
  powershell -File app\src-tauri\resources\backend.ps1 -Action get_status
  ```

- La app se abre siempre **como administrador** (manifiesto `requireAdministrator`), porque toca
  el registro, el firewall y los servicios.
- Registros técnicos: `C:\ProgramData\MUD Control\backend.log` y `app.log`.

## Funciona sin Internet

El instalador incluye la interfaz, el backend, los scripts, el kit con los binarios de RDP Wrapper
y el `rdpwrap.ini` del repositorio. **Arreglar ahora** usa primero esos datos y solo busca en
Internet si la versión de Windows es más nueva que la incluida.
