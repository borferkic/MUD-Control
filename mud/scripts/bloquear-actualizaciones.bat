@echo off
:: ============================================================================
::  bloquear-actualizaciones.bat
::  Detiene Windows Update en este equipo hasta el 30/12/2026 y fija la version
::  en Windows 11 25H2 (impide que intente otra vez instalar 26H2).
::
::  Uso:  bloquear-actualizaciones.bat               -> bloquear
::        bloquear-actualizaciones.bat /desbloquear  -> volver a la normalidad
::
::  Que hace al bloquear:
::   1. Pausa actualizaciones de calidad y de version hasta 2026-12-30.
::   2. Directiva TargetReleaseVersion = 25H2 (26H2 no se ofrece aunque expire la pausa).
::   3. Windows Update solo NOTIFICA (no descarga ni instala solo) y nunca
::      reinicia con usuarios conectados.
::  Las firmas de Microsoft Defender siguen actualizandose (canal aparte).
:: ============================================================================
setlocal
title Bloquear Windows Update
net session >nul 2>&1
if errorlevel 1 (
    echo Solicitando permisos de administrador...
    if "%~1"=="" (
        powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    ) else (
        powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList '%~1' -Verb RunAs"
    )
    exit /b
)

set "UX=HKLM\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings"
set "POL=HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate"
set "AU=%POL%\AU"
set "HASTA=2026-12-30T23:59:59Z"
for /f %%t in ('powershell -NoProfile -Command "(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')"') do set "AHORA=%%t"

if /i "%~1"=="/desbloquear" goto :desbloquear

echo [1/3] Pausando actualizaciones hasta %HASTA% ...
reg add "%UX%" /v PauseUpdatesStartTime          /t REG_SZ /d "%AHORA%" /f >nul
reg add "%UX%" /v PauseUpdatesExpiryTime         /t REG_SZ /d "%HASTA%" /f >nul
reg add "%UX%" /v PauseQualityUpdatesStartTime   /t REG_SZ /d "%AHORA%" /f >nul
reg add "%UX%" /v PauseQualityUpdatesEndTime     /t REG_SZ /d "%HASTA%" /f >nul
reg add "%UX%" /v PauseFeatureUpdatesStartTime   /t REG_SZ /d "%AHORA%" /f >nul
reg add "%UX%" /v PauseFeatureUpdatesEndTime     /t REG_SZ /d "%HASTA%" /f >nul

echo [2/3] Fijando version en Windows 11 25H2 ...
reg add "%POL%" /v ProductVersion            /t REG_SZ    /d "Windows 11" /f >nul
reg add "%POL%" /v TargetReleaseVersion      /t REG_DWORD /d 1 /f >nul
reg add "%POL%" /v TargetReleaseVersionInfo  /t REG_SZ    /d "25H2" /f >nul

echo [3/3] Solo notificar, sin reinicios automaticos ...
reg add "%AU%" /v NoAutoUpdate                   /t REG_DWORD /d 0 /f >nul
reg add "%AU%" /v AUOptions                      /t REG_DWORD /d 2 /f >nul
reg add "%AU%" /v NoAutoRebootWithLoggedOnUsers  /t REG_DWORD /d 1 /f >nul

net stop wuauserv /y >nul 2>&1
net start wuauserv >nul 2>&1
echo.
echo LISTO: Windows Update pausado hasta el 30/12/2026 y version fija en 25H2.
echo Verifique en Configuracion ^> Windows Update: debe decir "Actualizaciones en pausa".
echo Para revertir:  bloquear-actualizaciones.bat /desbloquear
goto :fin

:desbloquear
echo Quitando pausa y directivas ...
for %%v in (PauseUpdatesStartTime PauseUpdatesExpiryTime PauseQualityUpdatesStartTime PauseQualityUpdatesEndTime PauseFeatureUpdatesStartTime PauseFeatureUpdatesEndTime) do reg delete "%UX%" /v %%v /f >nul 2>&1
for %%v in (ProductVersion TargetReleaseVersion TargetReleaseVersionInfo) do reg delete "%POL%" /v %%v /f >nul 2>&1
for %%v in (NoAutoUpdate AUOptions NoAutoRebootWithLoggedOnUsers) do reg delete "%AU%" /v %%v /f >nul 2>&1
net stop wuauserv /y >nul 2>&1
net start wuauserv >nul 2>&1
echo LISTO: Windows Update vuelve a su comportamiento normal.

:fin
echo.
pause
