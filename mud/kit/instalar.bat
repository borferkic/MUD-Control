@echo off
:: Kit RDP Wrapper - lanzador.  Uso: instalar.bat  [1|2|3|4|5] [/auto]
::   sin parametros = menu.   instalar.bat 1 /auto = instalacion completa sin preguntas
setlocal
title Kit RDP Wrapper
cd /d "%~dp0"
net session >nul 2>&1
if not errorlevel 1 goto :admin

:: No es admin: copiar el kit a una carpeta estable y relanzar elevado (esperando,
:: para que el autoextraible no borre los archivos mientras se usan).
set "KITDIR=%ProgramData%\RDPWrapperKit"
if /i not "%~dp0"=="%KITDIR%\" (
    if not exist "%KITDIR%" mkdir "%KITDIR%"
    xcopy /y /q "%~dp0*" "%KITDIR%\" >nul
)
echo Solicitando permisos de administrador...
if "%~1"=="" (
    powershell -NoProfile -Command "Start-Process -FilePath '%KITDIR%\instalar.bat' -Verb RunAs -Wait"
) else (
    powershell -NoProfile -Command "Start-Process -FilePath '%KITDIR%\instalar.bat' -ArgumentList '%*' -Verb RunAs -Wait"
)
exit /b

:admin
set "ACC=%~1"
set "AUTO="
echo %* | find /i "/auto" >nul && set "AUTO=-Auto"
if /i "%ACC%"=="/auto" set "ACC=1"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kit.ps1" -Accion "%ACC%" %AUTO%
echo.
if not defined AUTO pause
