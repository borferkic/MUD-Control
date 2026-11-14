@echo off
:: ============================================================================
::  bloquear-actualizaciones.bat
::  Pausa Windows Update hasta una fecha y fija la version actual de Windows
::  (impide que se instale la siguiente version anual, p. ej. 25H2 -> 26H2).
::
::  Uso:  bloquear-actualizaciones.bat                       -> 35 dias, version actual
::        bloquear-actualizaciones.bat /hasta:2026-12-30     -> pausa hasta esa fecha
::        bloquear-actualizaciones.bat /version:25H2         -> fija otra version
::        bloquear-actualizaciones.bat /desbloquear          -> volver a la normalidad
::        /silent  -> sin pausa al final (para la app o tareas)
::
::  Que hace al bloquear:
::   1. Pausa actualizaciones de calidad y de version hasta la fecha indicada.
::   2. Directiva TargetReleaseVersion = version fijada (la siguiente no se ofrece
::      aunque expire la pausa).
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
        powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList '%*' -Verb RunAs"
    )
    exit /b
)

set "UX=HKLM\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings"
set "POL=HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate"
set "AU=%POL%\AU"
set "DESBLOQ=" & set "SILENT=" & set "FECHA=" & set "VERSION="
for %%a in (%*) do (
    if /i "%%~a"=="/desbloquear" set "DESBLOQ=1"
    if /i "%%~a"=="/silent" set "SILENT=1"
)
for %%a in (%*) do call :arg "%%~a"
for /f %%t in ('powershell -NoProfile -Command "(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')"') do set "AHORA=%%t"
if defined DESBLOQ goto :desbloquear

:: Fecha: por defecto hoy + 35 dias. Se valida el formato AAAA-MM-DD y que sea futura.
for /f %%t in ('powershell -NoProfile -Command "$d='%FECHA%'; try { if ($d) { $f=[datetime]::ParseExact($d,'yyyy-MM-dd',$null) } else { $f=(Get-Date).AddDays(35) }; if ($f -le (Get-Date)) { 'ERR' } else { $f.ToString('yyyy-MM-dd') } } catch { 'ERR' }"') do set "DIA=%%t"
if "%DIA%"=="ERR" (
    echo Fecha no valida: "%FECHA%". Use /hasta:AAAA-MM-DD con una fecha futura.
    if not defined SILENT pause
    exit /b 1
)
set "HASTA=%DIA%T23:59:59Z"
:: Version: por defecto la que tiene instalada este equipo (DisplayVersion).
if not defined VERSION for /f "tokens=3" %%v in ('reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion" /v DisplayVersion 2^>nul ^| find "DisplayVersion"') do set "VERSION=%%v"
if not defined VERSION (
    echo No se pudo leer la version de Windows. Use /version:25H2
    if not defined SILENT pause
    exit /b 1
)

echo [1/3] Pausando actualizaciones hasta %HASTA% ...
reg add "%UX%" /v PauseUpdatesStartTime          /t REG_SZ /d "%AHORA%" /f >nul
reg add "%UX%" /v PauseUpdatesExpiryTime         /t REG_SZ /d "%HASTA%" /f >nul
reg add "%UX%" /v PauseQualityUpdatesStartTime   /t REG_SZ /d "%AHORA%" /f >nul
reg add "%UX%" /v PauseQualityUpdatesEndTime     /t REG_SZ /d "%HASTA%" /f >nul
reg add "%UX%" /v PauseFeatureUpdatesStartTime   /t REG_SZ /d "%AHORA%" /f >nul
reg add "%UX%" /v PauseFeatureUpdatesEndTime     /t REG_SZ /d "%HASTA%" /f >nul

echo [2/3] Fijando version en Windows 11 %VERSION% ...
reg add "%POL%" /v ProductVersion            /t REG_SZ    /d "Windows 11" /f >nul
reg add "%POL%" /v TargetReleaseVersion      /t REG_DWORD /d 1 /f >nul
reg add "%POL%" /v TargetReleaseVersionInfo  /t REG_SZ    /d "%VERSION%" /f >nul

echo [3/3] Solo notificar, sin reinicios automaticos ...
reg add "%AU%" /v NoAutoUpdate                   /t REG_DWORD /d 0 /f >nul
reg add "%AU%" /v AUOptions                      /t REG_DWORD /d 2 /f >nul
reg add "%AU%" /v NoAutoRebootWithLoggedOnUsers  /t REG_DWORD /d 1 /f >nul

net stop wuauserv /y >nul 2>&1
net start wuauserv >nul 2>&1
echo.
echo LISTO: Windows Update pausado hasta el %DIA% y version fija en %VERSION%.
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
if not defined SILENT pause
exit /b 0

:arg
set "A=%~1"
if /i "%A:~0,7%"=="/hasta:" set "FECHA=%A:~7%"
if /i "%A:~0,9%"=="/version:" set "VERSION=%A:~9%"
exit /b 0
