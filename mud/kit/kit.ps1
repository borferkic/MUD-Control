# =============================================================================
#  Kit RDP Wrapper - instalacion / reparacion / verificacion
#  Lo invoca instalar.bat (ya elevado). No ejecutar suelto.
# =============================================================================
param([string]$Accion = '', [switch]$Auto, [string]$Perfil = '')

$ErrorActionPreference = 'Stop'
$Kit  = Split-Path -Parent $MyInvocation.MyCommand.Path
$Dir  = Join-Path $env:ProgramFiles 'RDP Wrapper'
$Log  = Join-Path $env:SystemRoot 'Logs\kit-rdpwrapper.log'

# ----------------------- CONFIGURACION POR DEFECTO ---------------------------
# Lo propio de cada cliente va en un perfil JSON (ver perfiles\ejemplo.json):
#   kit.ps1 -Perfil ruta\perfil.json   o un archivo perfil.json junto a kit.ps1.
# Solo se sobrescriben las claves presentes en el perfil.
$Cfg = @{
    Nombre              = 'Predeterminado'
    Puerto              = 3389
    MaxSesiones         = 20       # directiva MaxInstanceCount
    NLA                 = 1        # 1 = recomendado. 0 solo si hay clientes RDP antiguos
    Shadow              = 1        # 1 = control total con permiso del usuario
    UsuariosRDP         = @()      # se agregan a "Usuarios de escritorio remoto" si existen
    TareaAutoFix        = $true    # tarea al inicio que repara tras Windows Update
    PerfilesFirewall    = @('Domain', 'Private')   # 'Public' solo si es imprescindible
}
if (-not $Perfil) { $Perfil = Join-Path $Kit 'perfil.json' }
if (Test-Path $Perfil) {
    try {
        $p = Get-Content $Perfil -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($k in @($Cfg.Keys)) {
            if ($p.PSObject.Properties.Name -contains $k) { $Cfg[$k] = $p.$k }
        }
        $PerfilCargado = $Perfil
    } catch { Write-Host "Perfil no valido ($Perfil): $($_.Exception.Message). Se usan valores por defecto." -ForegroundColor Yellow }
}
$Cfg.UsuariosRDP      = @($Cfg.UsuariosRDP | Where-Object { $_ })
$Cfg.PerfilesFirewall = @($Cfg.PerfilesFirewall | Where-Object { $_ -in 'Domain','Private','Public' })
if (-not $Cfg.PerfilesFirewall) { $Cfg.PerfilesFirewall = @('Domain', 'Private') }
# -----------------------------------------------------------------------------

function Log([string]$m, [string]$c = 'Gray') {
    $l = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + "  $m"
    Write-Host $l -ForegroundColor $c
    try { Add-Content -Path $Log -Value $l -Encoding UTF8 } catch {}
}
function Pregunta([string]$texto) {
    if ($Auto) { return $true }
    do { $r = Read-Host "$texto (S/N)" } while ($r -notmatch '^[sSnN]$')
    return ($r -match '^[sS]$')
}
function Set-Reg($path, $name, $value) {
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -Path $path -Name $name -Value $value -Type DWord
}
function TermsrvVer {
    $vi = (Get-Item "$env:SystemRoot\System32\termsrv.dll").VersionInfo
    '{0}.{1}.{2}.{3}' -f $vi.FileMajorPart, $vi.FileMinorPart, $vi.FileBuildPart, $vi.FilePrivatePart
}
function Run-Fix {
    $fix = Join-Path $Dir 'fix-rdpwrap.bat'
    if (-not (Test-Path $fix)) { $fix = Join-Path $Kit 'fix-rdpwrap.bat' }
    Log "Ejecutando $fix /silent ..."
    $p = Start-Process -FilePath 'cmd.exe' -ArgumentList "/c `"$fix`" /silent" -Wait -PassThru -NoNewWindow
    if ($p.ExitCode -eq 0) { Log 'fix-rdpwrap: OK' 'Green' }
    elseif ($p.ExitCode -eq 7) { Log 'Aun no hay datos publicos para esta version de Windows: RDP queda en 1 sesion. La tarea RDPWrap-AutoFix reintentara en cada arranque (ver LEEME).' 'Yellow' }
    else { Log "fix-rdpwrap termino con codigo $($p.ExitCode). Ver $Dir\fix-rdpwrap.log" 'Red' }
    return $p.ExitCode
}

# =============================================================================
function Instalar {
    Log '=== INSTALACION COMPLETA ===' 'Cyan'
    $zip = Join-Path $Kit 'payload.zip'
    if (-not (Test-Path $zip)) {
        Log "Falta $zip (binarios de RDP Wrapper). Genere el kit con el script de build o copie payload.zip junto a kit.ps1." 'Red'
        return
    }
    if ($PerfilCargado) { Log "Perfil: $($Cfg.Nombre) ($PerfilCargado)" } else { Log 'Perfil: valores por defecto' }
    if (-not $Cfg.NLA) { Log 'AVISO: NLA desactivada en el perfil. Cualquiera que llegue al puerto ve la pantalla de inicio de sesion.' 'Yellow' }

    # 1. Antivirus: rdpwrap.dll suele detectarse como "HackTool"
    if (Pregunta "Agregar exclusion de Microsoft Defender para '$Dir' (necesario: Defender borra rdpwrap.dll)") {
        try { Add-MpPreference -ExclusionPath $Dir; Log 'Exclusion de Defender agregada.' 'Green' }
        catch { Log "No se pudo agregar la exclusion: $($_.Exception.Message)" 'Yellow' }
    }

    # 2. Copiar archivos
    New-Item -ItemType Directory -Path $Dir -Force | Out-Null
    $tmp = Join-Path $env:TEMP ('rdpkit-' + [guid]::NewGuid().ToString('N'))
    Expand-Archive -Path $zip -DestinationPath $tmp -Force
    $svcDll = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\TermService\Parameters').ServiceDll
    $yaInstalado = $svcDll -match 'rdpwrap\.dll'
    if ($yaInstalado) {
        # El servicio tiene rdpwrap.dll bloqueada: no sobrescribirla
        Log 'RDP Wrapper ya instalado: se actualizan archivos (sin tocar rdpwrap.dll).'
        Get-ChildItem $tmp -Recurse -File | Where-Object { $_.Name -ne 'rdpwrap.dll' } | ForEach-Object {
            $dst = Join-Path $Dir $_.FullName.Substring($tmp.Length + 1)
            New-Item -ItemType Directory -Path (Split-Path $dst) -Force | Out-Null
            Copy-Item $_.FullName $dst -Force
        }
    } else {
        Copy-Item (Join-Path $tmp '*') $Dir -Recurse -Force
        Log 'Instalando servicio RDP Wrapper (RDPWInst -i)...'
        Push-Location $Dir
        try { & (Join-Path $Dir 'RDPWInst.exe') -i | Out-Host } finally { Pop-Location }
        # RDPWInst puede dejar su ini interno: restaurar el del kit
        Copy-Item (Join-Path $tmp 'rdpwrap.ini') (Join-Path $Dir 'rdpwrap.ini') -Force
    }
    foreach ($f in 'fix-rdpwrap.bat', 'reparar-windowsupdate.bat', 'LEEME.txt') {
        if (Test-Path (Join-Path $Kit $f)) { Copy-Item (Join-Path $Kit $f) (Join-Path $Dir $f) -Force }
    }
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    Log "Archivos copiados en $Dir" 'Green'

    # 3. Configuracion de Escritorio remoto
    $ts  = 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server'
    $tcp = "$ts\WinStations\RDP-Tcp"
    $pol = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services'
    Set-Reg $ts  fDenyTSConnections    0
    Set-Reg $ts  fSingleSessionPerUser 1   # siempre una sesion por usuario (no configurable)
    Set-Reg $tcp PortNumber            $Cfg.Puerto
    Set-Reg $tcp UserAuthentication    $Cfg.NLA
    Set-Reg $tcp SecurityLayer         ($(if ($Cfg.NLA) { 2 } else { 0 }))
    Set-Reg $pol fDenyTSConnections    0
    Set-Reg $pol fSingleSessionPerUser 1
    Set-Reg $pol MaxInstanceCount      $Cfg.MaxSesiones
    Set-Reg $pol fDisableAutoReconnect 0
    Set-Reg $pol Shadow                $Cfg.Shadow
    Log "Registro/directivas: RDP habilitado, una sesion por usuario, max $($Cfg.MaxSesiones) sesiones, NLA=$($Cfg.NLA), puerto $($Cfg.Puerto)." 'Green'

    # 4. Firewall: reglas propias, solo en los perfiles de red elegidos. Se recrean
    #    siempre para reflejar cambios de puerto o perfil.
    $fwProf = $Cfg.PerfilesFirewall -join ','
    Get-NetFirewallRule -DisplayName 'RDP Wrapper TCP', 'RDP Wrapper UDP' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule -DisplayName 'RDP Wrapper TCP' -Direction Inbound -Protocol TCP -LocalPort $Cfg.Puerto -Action Allow -Profile $fwProf | Out-Null
    New-NetFirewallRule -DisplayName 'RDP Wrapper UDP' -Direction Inbound -Protocol UDP -LocalPort $Cfg.Puerto -Action Allow -Profile $fwProf | Out-Null
    Log "Firewall: puerto $($Cfg.Puerto) TCP/UDP abierto en perfiles $fwProf." 'Green'

    # 5. Usuarios de escritorio remoto (SID S-1-5-32-555)
    foreach ($u in $Cfg.UsuariosRDP) {
        if (Get-LocalUser -Name $u -ErrorAction SilentlyContinue) {
            try { Add-LocalGroupMember -SID 'S-1-5-32-555' -Member $u -ErrorAction Stop; Log "Usuario $u agregado a Escritorio remoto." 'Green' }
            catch { if ($_.Exception.Message -match 'already|ya es') { Log "Usuario $u ya estaba en Escritorio remoto." } else { Log "Usuario ${u}: $($_.Exception.Message)" 'Yellow' } }
        } else { Log "Usuario $u no existe en este equipo (omitido)." 'DarkYellow' }
    }

    # 6. Servicios
    Set-Service TermService -StartupType Automatic
    Set-Service SessionEnv  -StartupType Manual -ErrorAction SilentlyContinue

    # 7. Tarea de auto-reparacion tras Windows Update
    if ($Cfg.TareaAutoFix) {
        $act = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$Dir\fix-rdpwrap.bat`" /silent"
        $trg = New-ScheduledTaskTrigger -AtStartup; $trg.Delay = 'PT2M'
        $trg2 = New-ScheduledTaskTrigger -Daily -At '07:00'
        Register-ScheduledTask -TaskName 'RDPWrap-AutoFix' -Action $act -Trigger @($trg, $trg2) -User 'SYSTEM' -RunLevel Highest -Force | Out-Null
        Log "Tarea 'RDPWrap-AutoFix' registrada (al iniciar Windows y diaria 07:00)." 'Green'
    }

    # 8. Offsets para la termsrv.dll actual + reinicio de servicio
    Run-Fix | Out-Null
    Verificar
}

function Verificar {
    Log '=== VERIFICACION ===' 'Cyan'
    $ver = TermsrvVer
    $ini = Join-Path $Dir 'rdpwrap.ini'
    $iniOk = (Test-Path $ini) -and ([IO.File]::ReadAllText($ini) -match ('(?m)^\[' + [regex]::Escape($ver) + '\]'))
    $svcDll = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\TermService\Parameters').ServiceDll
    $estado = [ordered]@{
        'termsrv.dll'                = $ver
        'rdpwrap.ini soporta version'= $iniOk
        'TermService usa rdpwrap.dll'= ($svcDll -match 'rdpwrap\.dll')
        'rdpwrap.dll presente'       = (Test-Path (Join-Path $Dir 'rdpwrap.dll'))
        'TermService'                = (Get-Service TermService).Status
        'Puerto escuchando'          = [bool](Get-NetTCPConnection -LocalPort $Cfg.Puerto -State Listen -ErrorAction SilentlyContinue)
        'Tarea RDPWrap-AutoFix'      = [bool](Get-ScheduledTask -TaskName 'RDPWrap-AutoFix' -ErrorAction SilentlyContinue)
    }
    $estado.GetEnumerator() | ForEach-Object {
        $c = if ($_.Value -eq $false -or $_.Value -eq 'Stopped') { 'Red' } else { 'Green' }
        Log ('  {0,-30} {1}' -f $_.Key, $_.Value) $c
    }
    Log 'Sesiones actuales:'; qwinsta | Out-Host
}

function Desinstalar {
    if (-not (Pregunta 'Desinstalar RDP Wrapper (Windows vuelve a 1 sola sesion)')) { return }
    Unregister-ScheduledTask -TaskName 'RDPWrap-AutoFix' -Confirm:$false -ErrorAction SilentlyContinue
    Push-Location $Dir
    try { & (Join-Path $Dir 'RDPWInst.exe') -u | Out-Host } finally { Pop-Location }
    Log 'RDP Wrapper desinstalado (la carpeta queda con los logs).' 'Yellow'
}

# =============================================================================
try {
    if (-not $Accion) {
        Clear-Host
        Write-Host '=================================================' -ForegroundColor Cyan
        Write-Host '   KIT RDP WRAPPER - Multisesion de Escritorio remoto' -ForegroundColor Cyan
        Write-Host '=================================================' -ForegroundColor Cyan
        Write-Host "  termsrv.dll actual: $(TermsrvVer)"
        Write-Host ''
        Write-Host '  1) Instalacion completa (equipo nuevo o reinstalar)'
        Write-Host '  2) Reparar RDP  (usar despues de una actualizacion de Windows)'
        Write-Host '  3) Reparar Windows Update'
        Write-Host '  4) Verificar estado'
        Write-Host '  5) Desinstalar RDP Wrapper'
        Write-Host '  6) Pausar Windows Update (elige fecha, fija la version actual)'
        Write-Host '  7) Desbloquear Windows Update'
        Write-Host '  0) Salir'
        $Accion = Read-Host 'Opcion'
    }
    switch ($Accion) {
        '1' { Instalar }
        '2' { Run-Fix | Out-Null; Verificar }
        '3' { Start-Process 'cmd.exe' -ArgumentList "/c `"$Kit\reparar-windowsupdate.bat`"" -Wait }
        '4' { Verificar }
        '5' { Desinstalar }
        '6' {
            $f = if ($Auto) { '' } else { Read-Host 'Pausar hasta (AAAA-MM-DD, Enter = 35 dias)' }
            $a = if ($f) { "/hasta:$f" } else { '' }
            Start-Process 'cmd.exe' -ArgumentList "/c `"$Kit\bloquear-actualizaciones.bat`" $a" -Wait
        }
        '7' { Start-Process 'cmd.exe' -ArgumentList "/c `"$Kit\bloquear-actualizaciones.bat`" /desbloquear" -Wait }
        default { return }
    }
} catch {
    Log "ERROR: $($_.Exception.Message)" 'Red'
    exit 1
}
