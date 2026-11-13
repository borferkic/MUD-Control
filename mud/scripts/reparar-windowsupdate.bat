@echo off
:: ============================================================================
::  reparar-windowsupdate.bat
::  Diagnostico (13/11/2026): la actualizacion "Windows 11, version 26H2" falla con
::  0x800706BE porque TiWorker se cae al encontrar el almacen de componentes danado
::  (CBS.log: CSI 800f0983 "CorruptComponentValue"). Ademas hay un reinicio CBS pendiente.
::
::  Pasos: DISM RestoreHealth -> SFC -> reset de cache de Windows Update -> reinicio.
::  Duracion aproximada: 20-40 minutos. Requiere Internet.
:: ============================================================================
setlocal
title Reparar Windows Update
:: Uso: reparar-windowsupdate.bat [/auto]   (/auto = sin preguntas y SIN reiniciar)
set "AUTO="
set "SOLOSFC="
echo %* | find /i "/auto" >nul && set "AUTO=1"
echo %* | find /i "/solosfc" >nul && set "SOLOSFC=1"
net session >nul 2>&1
if errorlevel 1 (
    echo Solicitando permisos de administrador...
    if defined AUTO (
        powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList '/auto' -Verb RunAs"
    ) else (
        powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    )
    exit /b
)
set "LOG=%SystemRoot%\Logs\reparar-windowsupdate.log"
echo ==== %date% %time% ==== >> "%LOG%"

reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending" >nul 2>&1
if not errorlevel 1 if not defined AUTO (
    echo [!] Hay un reinicio de mantenimiento pendiente.
    echo     Lo ideal es reiniciar primero y volver a ejecutar este script.
    choice /c SN /m "Continuar de todos modos"
    if errorlevel 2 exit /b
)

if defined SOLOSFC (
    echo [1/4] DISM omitido (/solosfc^).
    echo DISM omitido >> "%LOG%"
    goto :sfc
)
echo [1/4] DISM: reparando almacen de componentes (puede tardar 15-30 min)...
DISM /Online /Cleanup-Image /RestoreHealth >> "%LOG%" 2>&1
echo       DISM codigo: %ERRORLEVEL%
echo DISM rc=%ERRORLEVEL% >> "%LOG%"
:sfc

echo [2/4] SFC: verificando archivos de sistema...
sfc /scannow >> "%LOG%" 2>&1
echo       SFC codigo: %ERRORLEVEL%
echo SFC rc=%ERRORLEVEL% >> "%LOG%"

echo [3/4] Reiniciando cache de Windows Update...
net stop wuauserv /y >nul 2>&1
net stop bits /y >nul 2>&1
net stop cryptsvc /y >nul 2>&1
net stop UsoSvc /y >nul 2>&1
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmm"') do set "TS=%%t"
if exist "%SystemRoot%\SoftwareDistribution" ren "%SystemRoot%\SoftwareDistribution" "SoftwareDistribution.old_%TS%"
if exist "%SystemRoot%\System32\catroot2" ren "%SystemRoot%\System32\catroot2" "catroot2.old_%TS%"
net start cryptsvc >nul 2>&1
net start bits >nul 2>&1
net start wuauserv >nul 2>&1
net start UsoSvc >nul 2>&1

echo [4/4] Listo. Log: %LOG%
echo.
echo IMPORTANTE: al instalar 26H2 cambiara termsrv.dll otra vez.
echo Despues de la actualizacion ejecute fix-rdpwrap.bat para restaurar la multisesion.
echo.
echo FIN %date% %time% >> "%LOG%"
if defined AUTO exit /b 0
choice /c SN /m "Reiniciar el equipo ahora (las sesiones RDP se cerraran)"
if errorlevel 2 exit /b
shutdown /r /t 30 /c "Reinicio para completar reparacion de Windows Update"
