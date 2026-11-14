@echo off
:: ============================================================================
::  fix-rdpwrap.bat  -  Repara RDP Wrapper cuando Windows Update cambia termsrv.dll
::
::  Uso:   fix-rdpwrap.bat            (interactivo)
::         fix-rdpwrap.bat /silent    (sin pausas, para tarea programada)
::         fix-rdpwrap.bat /force     (regenera offsets aunque ya exista la seccion)
::         fix-rdpwrap.bat /tarea     (ademas registra una tarea al inicio de Windows)
::         fix-rdpwrap.bat /finder    (avanzado: si no hay INI publico, genera offsets con
::                                     RDPWrapOffsetFinder; Defender puede bloquearlo)
::
::  Que hace:
::   1. Detecta la version REAL de termsrv.dll (no la cadena FileVersion, que miente).
::   2. Si rdpwrap.ini ya tiene esa version -> solo reinicia el servicio y verifica.
::   3. Si no, busca un rdpwrap.ini actualizado en las fuentes publicas.
::   4. Si ninguna la tiene: sale con codigo 7 (la tarea reintenta en cada arranque).
::      Con /finder genera los offsets con RDPWrapOffsetFinder (llccd) usando los
::      simbolos publicos de Microsoft y los agrega al ini (con backup).
::   5. Asegura RDP habilitado y UNA sesion por usuario (varias personas distintas a
::      la vez, pero cada cuenta solo una vez), reinicia TermService y verifica.
::  Log: C:\Program Files\RDP Wrapper\fix-rdpwrap.log
::  NOTA: reiniciar TermService desconecta las sesiones RDP abiertas (se reconectan).
:: ============================================================================
setlocal
title Reparar RDP Wrapper
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
set "RDPFIX_ARGS=%*"
set "RDPFIX_SELF=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=[IO.File]::ReadAllText($env:RDPFIX_SELF); $i=$c.LastIndexOf('#'+'##PS###'); iex $c.Substring($i)"
set "RC=%ERRORLEVEL%"
echo %RDPFIX_ARGS% | find /i "/silent" >nul || pause
exit /b %RC%

###PS###
$ErrorActionPreference = 'Stop'
$opt    = "$env:RDPFIX_ARGS"
$Silent = $opt -match '/silent'
$Force  = $opt -match '/force'
$Tarea  = $opt -match '/tarea'
$Finder = $opt -match '/finder'

$Dir     = Join-Path $env:ProgramFiles 'RDP Wrapper'
$Ini     = Join-Path $Dir 'rdpwrap.ini'
$Log     = Join-Path $Dir 'fix-rdpwrap.log'
$Tools   = Join-Path $Dir 'OffsetFinder'
$Termsrv = Join-Path $env:SystemRoot 'System32\termsrv.dll'
$FinderUrl = 'https://github.com/llccd/RDPWrapOffsetFinder/releases/download/v1.0/RDPWrapOffsetFinder-1.0.zip'
$IniSources = @(
    'https://raw.githubusercontent.com/sebaxakerhtc/rdpwrap.ini/master/rdpwrap.ini',
    'https://raw.githubusercontent.com/affinityv/INI-RDPWRAP/master/rdpwrap.ini',
    'https://raw.githubusercontent.com/asmtron/rdpwrap/master/res/rdpwrap.ini'
)
$Utf8 = New-Object System.Text.UTF8Encoding $false
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Log([string]$m, [string]$c = 'Gray') {
    $l = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + "  $m"
    Write-Host $l -ForegroundColor $c
    try { Add-Content -Path $Log -Value $l -Encoding UTF8 } catch {}
}
function Has-Section([string]$text, [string]$v) { $text -match ('(?m)^\[' + [regex]::Escape($v) + '\]') }
function Section-Names([string]$text) {
    [regex]::Matches($text, '(?m)^\[([^\]\r\n]+)\]') | ForEach-Object { $_.Groups[1].Value }
}
function Section-Block([string]$text, [string]$name) {
    [regex]::Match($text, '(?ms)^\[' + [regex]::Escape($name) + '\][^\r\n]*\r?\n.*?(?=^\[|\z)').Value
}
# Usa el INI publico como base y le agrega las secciones de version que solo
# existen en el INI local (p. ej. generadas con /finder), para no perderlas.
function Merge-Ini([string]$public, [string]$local) {
    $pub = @(Section-Names $public)
    $extra = Section-Names $local | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+(-SLInit)?$' -and $pub -notcontains $_ }
    if (-not $extra) { return @{ Text = $public; Kept = @() } }
    $add = ($extra | ForEach-Object { (Section-Block $local $_).TrimEnd() }) -join "`r`n`r`n"
    $text = $public.TrimEnd() + "`r`n`r`n; --- Secciones locales conservadas por fix-rdpwrap.bat ---`r`n" + $add + "`r`n"
    return @{ Text = $text; Kept = @($extra) }
}
function Backup-Ini {
    $b = "$Ini.bak-" + (Get-Date).ToString('yyyyMMdd-HHmmss')
    Copy-Item $Ini $b -Force
    Log "Backup del ini: $b"
}

try {
    Log '=== Inicio fix-rdpwrap ===' 'Cyan'

    # --- 0. Pre-requisitos -----------------------------------------------------
    if (-not (Test-Path $Ini)) { Log "No existe $Ini. RDP Wrapper no esta instalado." 'Red'; exit 2 }
    $svcDll = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\TermService\Parameters').ServiceDll
    if ($svcDll -notmatch 'rdpwrap\.dll') {
        Log "TermService no carga rdpwrap.dll (ServiceDll=$svcDll). Reinstale con: RDPWInst.exe -i -o" 'Red'; exit 3
    }
    # Guardar una copia de este script junto a RDP Wrapper
    $selfDst = Join-Path $Dir 'fix-rdpwrap.bat'
    if ($env:RDPFIX_SELF -and ($env:RDPFIX_SELF -ne $selfDst)) { Copy-Item $env:RDPFIX_SELF $selfDst -Force; Log "Script copiado a $selfDst" }

    # Tarea programada (se registra aunque hoy no haya datos para esta version)
    if ($Tarea) {
        $act = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$selfDst`" /silent"
        $trg = New-ScheduledTaskTrigger -AtStartup; $trg.Delay = 'PT2M'
        $trg2 = New-ScheduledTaskTrigger -Daily -At '07:00'
        Register-ScheduledTask -TaskName 'RDPWrap-AutoFix' -Action $act -Trigger @($trg, $trg2) -User 'SYSTEM' -RunLevel Highest -Force | Out-Null
        Log "Tarea programada 'RDPWrap-AutoFix' registrada (al iniciar Windows +2 min y diaria 07:00)." 'Green'
    }

    # --- 1. Version real de termsrv.dll ---------------------------------------
    $vi  = (Get-Item $Termsrv).VersionInfo
    $ver = '{0}.{1}.{2}.{3}' -f $vi.FileMajorPart, $vi.FileMinorPart, $vi.FileBuildPart, $vi.FilePrivatePart
    Log "termsrv.dll version real: $ver"

    $iniText = [IO.File]::ReadAllText($Ini)
    $changed = $false

    if ((Has-Section $iniText $ver) -and -not $Force) {
        Log "rdpwrap.ini ya soporta $ver." 'Green'
    } else {
        # --- 2. Fuentes publicas ------------------------------------------------
        if (-not $Force) {
            foreach ($u in $IniSources) {
                try {
                    $t = (Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 60).Content
                    if ((Has-Section $t $ver) -and ($t -match '(?m)^\[PatchCodes\]')) {
                        Backup-Ini
                        $m = Merge-Ini $t $iniText
                        [IO.File]::WriteAllText($Ini, $m.Text, $Utf8)
                        Log "INI actualizado desde $u" 'Green'
                        if ($m.Kept.Count) { Log ("Secciones locales conservadas: " + ($m.Kept -join ', ')) }
                        $changed = $true; break
                    } else { Log "Sin soporte para $ver en $u" 'DarkYellow' }
                } catch { Log "No se pudo leer $u : $($_.Exception.Message)" 'DarkYellow' }
            }
        }

        # --- 3. Generar offsets con RDPWrapOffsetFinder ------------------------
        if (-not $changed -and -not $Finder) {
            Log "Ninguna fuente publica soporta $ver todavia. RDP queda en 1 sesion hasta que se publique." 'Yellow'
            Log 'La tarea RDPWrap-AutoFix reintentara en cada arranque. Opcion avanzada: fix-rdpwrap.bat /finder (ver LEEME).' 'Yellow'
            exit 7
        }
        if (-not $changed) {
            $exe = Get-ChildItem $Tools -Recurse -Filter 'RDPWrapOffsetFinder.exe' -ErrorAction SilentlyContinue |
                   Sort-Object { if ($_.FullName -match 'x64') { 0 } else { 1 } } | Select-Object -First 1
            if (-not $exe) {
                Log "Descargando RDPWrapOffsetFinder desde $FinderUrl"
                # Se descarga dentro de la carpeta de RDP Wrapper (una sola exclusion de antivirus la cubre)
                New-Item -ItemType Directory -Path $Tools -Force | Out-Null
                $zip = Join-Path $Tools 'RDPWrapOffsetFinder.zip'
                try {
                    Invoke-WebRequest $FinderUrl -OutFile $zip -UseBasicParsing -TimeoutSec 120
                    Expand-Archive -Path $zip -DestinationPath $Tools -Force
                } catch {
                    if ($_.Exception.Message -match '(?i)virus|no deseado|unwanted') {
                        Log 'Microsoft Defender bloqueo RDPWrapOffsetFinder (lo marca como amenaza).' 'Red'
                        Log 'No se aplico ningun cambio. Ver LEEME.txt, seccion "Defender bloquea el generador".' 'Red'
                        exit 8
                    }
                    throw
                }
                Remove-Item $zip -Force -ErrorAction SilentlyContinue
                $exe = Get-ChildItem $Tools -Recurse -Filter 'RDPWrapOffsetFinder.exe' |
                       Sort-Object { if ($_.FullName -match 'x64') { 0 } else { 1 } } | Select-Object -First 1
            }
            if (-not $exe) { Log 'No se encontro RDPWrapOffsetFinder.exe tras extraer el zip.' 'Red'; exit 4 }

            $candidates = @($exe.FullName)
            $nosym = Get-ChildItem $exe.DirectoryName -Filter 'RDPWrapOffsetFinder_nosymbol*.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($nosym) { $candidates += $nosym.FullName }

            $gen = $null
            foreach ($c in $candidates) {
                Log "Ejecutando $(Split-Path $c -Leaf) ..."
                Push-Location (Split-Path $c)
                try { $out = (& $c $Termsrv 2>&1 | Out-String) } finally { Pop-Location }
                # Validar por contenido, no por palabras sueltas: debe traer la seccion
                # de la version con al menos un parche x64. Se descarta el texto previo.
                $start = [regex]::Match($out, '(?m)^\[' + [regex]::Escape($ver) + '\]')
                if ($start.Success) {
                    $cand = $out.Substring($start.Index).Trim()
                    $main = Section-Block $cand $ver
                    if ($main -match '(?m)^(SingleUserPatch|DefPolicyPatch|LocalOnlyPatch)\.x64=1') { $gen = $cand; break }
                }
                Log "Salida no valida de $(Split-Path $c -Leaf):`n$out" 'DarkYellow'
            }
            if (-not $gen) { Log "No se pudieron generar offsets para $ver." 'Red'; exit 5 }

            # Validar que los PatchCodes usados existen en el ini
            $codes = [regex]::Matches($gen, '(?m)^\w+Code=(\w+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
            $pcBlock = [regex]::Match($iniText, '(?ms)^\[PatchCodes\](.*?)(^\[|\z)').Groups[1].Value
            $missing = $codes | Where-Object { $pcBlock -notmatch ('(?m)^' + [regex]::Escape($_) + '=') }
            if ($missing) { Log ("PatchCodes inexistentes en el ini: " + ($missing -join ', ')) 'Red'; exit 6 }

            Backup-Ini
            if (Has-Section $iniText $ver) {
                # /force: quitar secciones anteriores de esta version antes de agregar
                $iniText = [regex]::Replace($iniText, '(?ms)^\[' + [regex]::Escape($ver) + '(-SLInit)?\].*?(?=^\[|\z)', '')
            }
            $iniText = $iniText.TrimEnd() + "`r`n`r`n; --- Generado por fix-rdpwrap.bat " + (Get-Date).ToString('yyyy-MM-dd') + " ---`r`n" + ($gen -replace "`r?`n", "`r`n") + "`r`n"
            [IO.File]::WriteAllText($Ini, $iniText, $Utf8)
            Log "Offsets para $ver agregados a rdpwrap.ini" 'Green'
            $changed = $true
        }
    }

    # --- 4. Registro: RDP habilitado, una sesion por usuario ----------------------
    # Siempre fSingleSessionPerUser=1 (no configurable). Se escribe tambien la
    # directiva porque tiene prioridad sobre el registro (versiones antiguas del kit
    # la dejaban en 0).
    $ts  = 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server'
    $pol = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services'
    if (-not (Test-Path $pol)) { New-Item -Path $pol -Force | Out-Null }
    Set-ItemProperty $ts  -Name fDenyTSConnections    -Value 0 -Type DWord
    Set-ItemProperty $ts  -Name fSingleSessionPerUser -Value 1 -Type DWord
    Set-ItemProperty $pol -Name fSingleSessionPerUser -Value 1 -Type DWord
    Log 'Registro: fDenyTSConnections=0, fSingleSessionPerUser=1 (registro y directiva)'

    # --- 5. Reiniciar TermService (solo si cambio el ini o es ejecucion manual) ----
    if ($changed -or -not $Silent) {
        Log 'Reiniciando TermService (las sesiones RDP se desconectaran unos segundos)...' 'Yellow'
        cmd /c 'net stop UmRdpService /y >nul 2>&1'
        cmd /c 'net stop TermService /y >nul 2>&1'
        Start-Sleep -Seconds 3
        cmd /c 'net start TermService >nul 2>&1'
        cmd /c 'net start UmRdpService >nul 2>&1'
        Start-Sleep -Seconds 3
    } else { Log 'Sin cambios en el ini: no se reinicia TermService.' }

    # --- 6. Verificacion -----------------------------------------------------------
    $ok = $true
    $svc = Get-Service TermService
    if ($svc.Status -ne 'Running') { Log "TermService NO esta corriendo ($($svc.Status))" 'Red'; $ok = $false } else { Log 'TermService: Running' 'Green' }
    $port = (Get-ItemProperty "$ts\WinStations\RDP-Tcp" -ErrorAction SilentlyContinue).PortNumber
    if (-not $port) { $port = 3389 }
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { Log "Puerto ${port}: escuchando" 'Green' } else { Log "Puerto ${port}: NO escucha" 'Red'; $ok = $false }
    if (Has-Section ([IO.File]::ReadAllText($Ini)) $ver) { Log "rdpwrap.ini: seccion [$ver] presente" 'Green' } else { Log "rdpwrap.ini: falta [$ver]" 'Red'; $ok = $false }

    if ($ok) { Log '=== RDP Wrapper OK: multisesion habilitada ===' 'Green'; exit 0 }
    else     { Log '=== Terminado con problemas, revise el log ===' 'Red'; exit 1 }
} catch {
    Log "ERROR: $($_.Exception.Message)" 'Red'; exit 9
}
