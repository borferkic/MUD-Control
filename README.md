# MUD Control

Multi-User Desktop Control: un kit para habilitar y mantener varias sesiones simultáneas
de Escritorio remoto en Windows 11 Pro. Está basado en
[RDP Wrapper Library](https://github.com/stascorp/rdpwrap) de Stas'M Corp. (Apache License 2.0).

> Este repositorio es una copia del proyecto original con parches y herramientas propias.
> Se conservan el código original, su historial y su licencia (ver `LICENSE`).

## Qué agrega MUD Control

| Carpeta | Contenido |
|---|---|
| `mud/patches/` | Offsets de `termsrv.dll` que aún no publica la comunidad. Incluye `10.0.26100.9818` (Windows 11 25H2/26H2, noviembre 2026), generados con RDPWrapOffsetFinder a partir de los símbolos públicos de Microsoft. |
| `mud/scripts/fix-rdpwrap.bat` | Reparación automática tras Windows Update. Detecta la versión real de `termsrv.dll`, busca un INI actualizado en las fuentes de la comunidad, genera offsets con `/finder` si hace falta, reinicia el servicio solo cuando hubo cambios y puede registrar la tarea `RDPWrap-AutoFix` con `/tarea`. |
| `mud/scripts/reparar-windowsupdate.bat` | DISM, SFC y reinicio de la caché de Windows Update. Opciones `/auto` y `/solosfc`. |
| `mud/scripts/bloquear-actualizaciones.bat` | Pausa Windows Update hasta una fecha y fija la versión de Windows (`/desbloquear` para revertir). |
| `mud/kit/` | Instalador con menú (`instalar.bat` + `kit.ps1`): instalación completa, reparación, verificación y desinstalación. Se empaqueta como `.exe` con IExpress. |
| `Muelon/` | Respaldo del servidor de la clínica: instalador compilado, scripts, kit, `rdpwrap.ini` en uso, reporte de diagnóstico y planilla de usuarios **sin contraseñas**. |
| `res/rdpwrap.ini` | INI actualizado: datos de la comunidad + parches de MUD Control. |

## Uso rápido

```bat
:: Reparar después de una actualización de Windows (como administrador)
mud\scripts\fix-rdpwrap.bat

:: Además registrar la tarea de autorreparación (al iniciar Windows y diaria a las 07:00)
mud\scripts\fix-rdpwrap.bat /tarea

:: Si ninguna fuente pública soporta la versión: generar offsets localmente
mud\scripts\fix-rdpwrap.bat /finder
```

Códigos de salida de `fix-rdpwrap.bat`: `0` OK · `7` aún no hay INI público · `8` el antivirus bloqueó el generador · `2/3` RDP Wrapper no instalado.

## Notas

- **Antivirus:** Microsoft Defender suele marcar `rdpwrap.dll` (HackTool) y RDPWrapOffsetFinder
  (en noviembre de 2026, `Trojan:Win32/Suschil!rfn`, detección heurística). Usar exclusiones solo
  en carpetas concretas y tras evaluar el riesgo.
- **Licencias de Windows:** varias sesiones simultáneas en Windows Pro no es un escenario
  soportado por Microsoft. Lo soportado es Windows Server con licencias RDS.
- **Seguridad:** se recomienda activar NLA (`$Cfg.NLA = 1` en `mud/kit/kit.ps1`) y no dar
  permisos de administrador a los usuarios de escritorio remoto.

## Créditos

- RDP Wrapper Library: Stas'M Corp. y colaboradores (binarymaster).
- INI de la comunidad: sebaxakerhtc, affinityv, asmtron.
- RDPWrapOffsetFinder: llccd.
